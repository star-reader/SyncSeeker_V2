import Foundation
import WidgetKit

#if os(iOS)
import UIKit
#endif

#if os(iOS) && canImport(BackgroundTasks)
import BackgroundTasks
#endif

#if canImport(ActivityKit)
import ActivityKit
#endif

private let kSyncSeekerLiveActivityKey = "syncseeker.live_activity.payload"
private let kSyncSeekerWidgetSnapshotKey = "syncseeker.widget.snapshot.payload"
private let kSyncSeekerLiveActivityPushTokenKey = "syncseeker.live_activity.push.token"
private let kSyncSeekerWidgetAPIBaseURLKey = "syncseeker.widget.api_base_url"
private let kSyncSeekerBackgroundRefreshTaskSuffix = ".bg.refresh"
private let kSyncSeekerDefaultAPIBaseURL = "https://go.api.skylineflyleague.cn"

private func syncSeekerBaseBundleIdentifier() -> String {
  let bundleId = Bundle.main.bundleIdentifier ?? "cn.skylineflyleague.map.beta"
  let suffixes = [".SyncSeekerWidgetExtensionExtension", ".SyncSeekerWidgetExtension"]
  for suffix in suffixes where bundleId.hasSuffix(suffix) {
    return String(bundleId.dropLast(suffix.count))
  }
  return bundleId
}

private func syncSeekerWidgetAppGroup() -> String {
  "group.\(syncSeekerBaseBundleIdentifier())"
}

private func syncSeekerWidgetReloadNotification() -> String {
  "\(syncSeekerBaseBundleIdentifier()).widget.reload"
}

private func syncSeekerBackgroundRefreshTaskId() -> String {
  "\(syncSeekerBaseBundleIdentifier())\(kSyncSeekerBackgroundRefreshTaskSuffix)"
}

private func currentISO8601() -> String {
  ISO8601DateFormatter().string(from: Date())
}

private func normalizeBaseURL(_ raw: String?) -> String? {
  guard let raw else { return nil }
  let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !trimmed.isEmpty else { return nil }
  return trimmed.hasSuffix("/") ? String(trimmed.dropLast()) : trimmed
}

private struct SSFlightLivePayload: Codable {
  let callsign: String
  let departure: String
  let arrival: String
  let aircraft: String
  let altitude: Int
  let groundspeed: Int
  let heading: Int
  let progress: Int
  let status: String
  let updatedAt: String
}

private struct SSFlightStopPayload: Codable {
  let callsign: String
  let updatedAt: String?
}

private struct SSWidgetFlightItemPayload: Codable {
  let callsign: String
  let departure: String
  let arrival: String
  let aircraft: String?
  let altitude: Int
  let groundspeed: Int
  let status: String
}

private struct SSWidgetSnapshotPayload: Codable {
  let totalFlights: Int
  let trackedFlight: SSWidgetFlightItemPayload?
  let topFlights: [SSWidgetFlightItemPayload]
  let updatedAt: String
  let apiBaseUrl: String?
  let trackedCallsign: String?
}

private struct SSOnlineListResponse: Decodable {
  let flights: [SSOnlinePilot]

  enum CodingKeys: String, CodingKey {
    case flights
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    flights = try container.decodeIfPresent([SSOnlinePilot].self, forKey: .flights) ?? []
  }
}

private struct SSOnlinePilot: Decodable {
  let callsign: String
  let logonTime: String
  let altitude: Int
  let groundspeed: Int
  let heading: Int
  let flightPlan: SSOnlineFlightPlan?

  enum CodingKeys: String, CodingKey {
    case callsign
    case logonTime = "logon_time"
    case altitude
    case groundspeed
    case heading
    case flightPlan = "flight_plan"
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    callsign = try container.decodeIfPresent(String.self, forKey: .callsign) ?? ""
    logonTime = try container.decodeIfPresent(String.self, forKey: .logonTime) ?? ""
    altitude = container.decodeLossyInt(forKey: .altitude) ?? 0
    groundspeed = container.decodeLossyInt(forKey: .groundspeed) ?? 0
    heading = container.decodeLossyInt(forKey: .heading) ?? 0
    flightPlan = try container.decodeIfPresent(SSOnlineFlightPlan.self, forKey: .flightPlan)
  }
}

private struct SSOnlineFlightPlan: Decodable {
  let aircraft: String?
  let departure: String?
  let arrival: String?
}

private final class SSUncheckedSendableBox<Value>: @unchecked Sendable {
  let value: Value
  init(_ value: Value) {
    self.value = value
  }
}

private extension KeyedDecodingContainer {
  func decodeLossyInt(forKey key: K) -> Int? {
    if let value = try? decodeIfPresent(Int.self, forKey: key) {
      return value
    }
    if let value = try? decodeIfPresent(Double.self, forKey: key) {
      return Int(value.rounded())
    }
    if let raw = try? decodeIfPresent(String.self, forKey: key) {
      let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
      if let intValue = Int(trimmed) {
        return intValue
      }
      if let doubleValue = Double(trimmed) {
        return Int(doubleValue.rounded())
      }
    }
    return nil
  }
}

private enum SSWidgetBackgroundSyncService {
  private static let syncLimit = 12

  private static func readPersistedAPIBaseURL() -> String? {
    let appGroup = syncSeekerWidgetAppGroup()
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      return nil
    }
    return normalizeBaseURL(defaults.string(forKey: kSyncSeekerWidgetAPIBaseURLKey))
  }

  private static func resolvedAPIBaseURL() -> String {
    let runtimeBase = normalizeBaseURL(readWidgetRuntimeSnapshot()?.apiBaseUrl)
    return runtimeBase ?? readPersistedAPIBaseURL() ?? kSyncSeekerDefaultAPIBaseURL
  }

  private static func statusText(for pilot: SSOnlinePilot) -> String {
    if pilot.groundspeed <= 5 && pilot.altitude <= 500 {
      return "停机位"
    }
    if pilot.groundspeed < 60 {
      return "滑行中"
    }
    if pilot.groundspeed >= 90 && pilot.altitude <= 1500 {
      return "起飞"
    }
    if pilot.altitude >= 22000 {
      return "巡航中"
    }
    if pilot.altitude >= 3000 {
      return "进行中"
    }
    return "爬升"
  }

  private static func makeWidgetFlightItem(from pilot: SSOnlinePilot) -> SSWidgetFlightItemPayload {
    SSWidgetFlightItemPayload(
      callsign: pilot.callsign,
      departure: pilot.flightPlan?.departure ?? "----",
      arrival: pilot.flightPlan?.arrival ?? "----",
      aircraft: pilot.flightPlan?.aircraft ?? "N/A",
      altitude: max(0, pilot.altitude),
      groundspeed: max(0, pilot.groundspeed),
      status: statusText(for: pilot)
    )
  }

  private static func readWidgetRuntimeSnapshot() -> SSWidgetSnapshotPayload? {
    let appGroup = syncSeekerWidgetAppGroup()
    guard let defaults = UserDefaults(suiteName: appGroup),
          let raw = defaults.string(forKey: kSyncSeekerWidgetSnapshotKey),
          let data = raw.data(using: .utf8) else {
      return nil
    }
    return try? JSONDecoder().decode(SSWidgetSnapshotPayload.self, from: data)
  }

  private static func readLivePayload() -> SSFlightLivePayload? {
    let appGroup = syncSeekerWidgetAppGroup()
    guard let defaults = UserDefaults(suiteName: appGroup),
          let raw = defaults.string(forKey: kSyncSeekerLiveActivityKey),
          let data = raw.data(using: .utf8) else {
      return nil
    }
    return try? JSONDecoder().decode(SSFlightLivePayload.self, from: data)
  }

  private static func onlineListURL() -> URL? {
    let base = resolvedAPIBaseURL()
    return URL(string: "\(base)/Map/GetOnlineList")
  }

  private static func trackedCallsign() -> String? {
    let runtime = readWidgetRuntimeSnapshot()
    let direct = runtime?.trackedCallsign?.trimmingCharacters(in: .whitespacesAndNewlines)
    if let direct, !direct.isEmpty {
      return direct
    }
    let fallback = runtime?.trackedFlight?.callsign.trimmingCharacters(in: .whitespacesAndNewlines)
    if let fallback, !fallback.isEmpty {
      return fallback
    }
    let liveCallsign = readLivePayload()?.callsign.trimmingCharacters(in: .whitespacesAndNewlines)
    if let liveCallsign, !liveCallsign.isEmpty {
      return liveCallsign
    }
    return nil
  }

  private static func updateLiveActivityIfNeeded(with flights: [SSOnlinePilot], trackedCallsign: String?) {
    guard let trackedCallsign, !trackedCallsign.isEmpty else { return }
    guard let pilot = flights.first(where: { $0.callsign.caseInsensitiveCompare(trackedCallsign) == .orderedSame }) else {
      let payload = SSFlightStopPayload(callsign: trackedCallsign, updatedAt: currentISO8601())
      _ = stopActivity(payload)
      return
    }

    let previousPayload = readLivePayload()
    let payload = SSFlightLivePayload(
      callsign: pilot.callsign,
      departure: pilot.flightPlan?.departure ?? "----",
      arrival: pilot.flightPlan?.arrival ?? "----",
      aircraft: pilot.flightPlan?.aircraft ?? "N/A",
      altitude: max(0, pilot.altitude),
      groundspeed: max(0, pilot.groundspeed),
      heading: max(0, pilot.heading),
      progress: previousPayload?.progress ?? 0,
      status: statusText(for: pilot),
      updatedAt: currentISO8601()
    )

    if let jsonData = try? JSONEncoder().encode(payload),
       let json = String(data: jsonData, encoding: .utf8) {
      _ = storeSharedPayload(json, key: kSyncSeekerLiveActivityKey, postWidgetReload: true)
    }

    _ = startOrUpdateActivity(payload)
  }

  static func performSync() async -> Bool {
    guard let url = onlineListURL() else {
      return false
    }

    var request = URLRequest(url: url)
    request.timeoutInterval = 10
    request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData

    do {
      let (data, _) = try await URLSession.shared.data(for: request)
      let response = try JSONDecoder().decode(SSOnlineListResponse.self, from: data)

      let flights = response.flights
        .filter { !$0.callsign.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        .sorted { $0.logonTime > $1.logonTime }

      let tracked = trackedCallsign()
      let trackedFlight = flights
        .first(where: {
          guard let tracked, !tracked.isEmpty else { return false }
          return $0.callsign.caseInsensitiveCompare(tracked) == .orderedSame
        })
        .map(makeWidgetFlightItem)

      let runtime = readWidgetRuntimeSnapshot()
      let payload = SSWidgetSnapshotPayload(
        totalFlights: flights.count,
        trackedFlight: trackedFlight,
        topFlights: Array(flights.prefix(syncLimit).map(makeWidgetFlightItem)),
        updatedAt: currentISO8601(),
        apiBaseUrl: normalizeBaseURL(runtime?.apiBaseUrl) ?? resolvedAPIBaseURL(),
        trackedCallsign: tracked
      )

      let payloadData = try JSONEncoder().encode(payload)
      guard let payloadJSON = String(data: payloadData, encoding: .utf8) else {
        return false
      }

      let storeCode = storeSharedPayload(payloadJSON, key: kSyncSeekerWidgetSnapshotKey, postWidgetReload: true)
      if storeCode != 0 {
        return false
      }

      #if os(iOS) && canImport(ActivityKit)
      if #available(iOS 16.1, *) {
        updateLiveActivityIfNeeded(with: flights, trackedCallsign: tracked)
      }
      #endif

      return true
    } catch {
      print("[SyncSeeker] background sync failed: \(error)")
      return false
    }
  }
}

private enum SSBackgroundRefreshCoordinator {
  static func bootstrap() {
    #if os(iOS) && canImport(BackgroundTasks)
    if #available(iOS 13.0, *) {
      registerIfNeeded()
      scheduleNextRefresh(afterMinutes: 8)
    }
    #endif
  }

  static func onForegroundPayloadSync() {
    #if os(iOS) && canImport(BackgroundTasks)
    if #available(iOS 13.0, *) {
      scheduleNextRefresh(afterMinutes: 8)
    }
    #endif
  }

  #if os(iOS) && canImport(BackgroundTasks)
  @available(iOS 13.0, *)
  nonisolated(unsafe) private static var registered = false

  @available(iOS 13.0, *)
  private static func registerIfNeeded() {
    if registered { return }
    let taskId = syncSeekerBackgroundRefreshTaskId()
    let ok = BGTaskScheduler.shared.register(forTaskWithIdentifier: taskId, using: nil) { task in
      handle(task: task)
    }
    if !ok {
      print("[SyncSeeker] BGTask register failed: \(taskId)")
      return
    }
    registered = true
  }

  @available(iOS 13.0, *)
  private static func scheduleNextRefresh(afterMinutes minutes: Int) {
    let taskId = syncSeekerBackgroundRefreshTaskId()
    let request = BGAppRefreshTaskRequest(identifier: taskId)
    request.earliestBeginDate = Date().addingTimeInterval(TimeInterval(max(5, minutes)) * 60)
    do {
      try BGTaskScheduler.shared.submit(request)
    } catch {
      print("[SyncSeeker] BGTask submit failed: \(error)")
    }
  }

  @available(iOS 13.0, *)
  private static func handle(task: BGTask) {
    scheduleNextRefresh(afterMinutes: 8)

    guard let refreshTask = task as? BGAppRefreshTask else {
      task.setTaskCompleted(success: false)
      return
    }

    let refreshTaskBox = SSUncheckedSendableBox(refreshTask)

    let worker = Task(priority: .background) {
      let success = await SSWidgetBackgroundSyncService.performSync()
      refreshTaskBox.value.setTaskCompleted(success: success)
    }

    refreshTask.expirationHandler = {
      worker.cancel()
      refreshTaskBox.value.setTaskCompleted(success: false)
    }
  }
  #endif
}

private func decodeJSONString(_ raw: UnsafePointer<CChar>?) -> String? {
  guard let raw else { return nil }
  return String(cString: raw)
}

private func storeSharedPayload(_ value: String, key: String, postWidgetReload: Bool) -> Int32 {
  let appGroup = syncSeekerWidgetAppGroup()
  guard let defaults = UserDefaults(suiteName: appGroup) else {
    print("[SyncSeeker] invalid app group: \(appGroup)")
    return -3
  }

  defaults.set(value, forKey: key)
  if key == kSyncSeekerWidgetSnapshotKey,
     let data = value.data(using: .utf8),
     let snapshot = try? JSONDecoder().decode(SSWidgetSnapshotPayload.self, from: data),
     let apiBaseURL = normalizeBaseURL(snapshot.apiBaseUrl) {
    defaults.set(apiBaseURL, forKey: kSyncSeekerWidgetAPIBaseURLKey)
  }
  defaults.synchronize()

  if postWidgetReload {
    let notificationName = syncSeekerWidgetReloadNotification()
    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName(notificationName as CFString),
      nil,
      nil,
      true
    )
    WidgetCenter.shared.reloadAllTimelines()
    SSBackgroundRefreshCoordinator.onForegroundPayloadSync()
  }

  return 0
}

#if os(iOS) && canImport(ActivityKit)
@available(iOS 16.1, *)
struct SyncSeekerFlightAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var callsign: String
    var departure: String
    var arrival: String
    var aircraft: String
    var altitude: Int
    var groundspeed: Int
    var heading: Int
    var progress: Int
    var status: String
    var updatedAt: String
  }

  var flightKey: String
}

@available(iOS 16.1, *)
private func findActivity(callsign: String) -> Activity<SyncSeekerFlightAttributes>? {
  Activity<SyncSeekerFlightAttributes>.activities.first(where: { $0.attributes.flightKey == callsign })
}

@available(iOS 16.1, *)
private func endActivity(callsign: String) {
  Task {
    guard let activity = findActivity(callsign: callsign) else { return }
    if #available(iOS 16.2, *) {
      await activity.end(nil, dismissalPolicy: .immediate)
    } else {
      await activity.end(using: activity.contentState, dismissalPolicy: .immediate)
    }
  }
}

@available(iOS 16.1, *)
private func endAllActivities(except callsign: String? = nil) {
  for activity in Activity<SyncSeekerFlightAttributes>.activities {
    if let callsign = callsign, activity.attributes.flightKey == callsign {
      continue
    }
    endActivity(callsign: activity.attributes.flightKey)
  }
}

@available(iOS 16.1, *)
private func startOrUpdateActivity(_ payload: SSFlightLivePayload) -> Int32 {
  guard ActivityAuthorizationInfo().areActivitiesEnabled else {
    print("[SyncSeeker] Live Activities disabled by system")
    return -10
  }

  let attributes = SyncSeekerFlightAttributes(flightKey: payload.callsign)
  let state = SyncSeekerFlightAttributes.ContentState(
    callsign: payload.callsign,
    departure: payload.departure,
    arrival: payload.arrival,
    aircraft: payload.aircraft,
    altitude: payload.altitude,
    groundspeed: payload.groundspeed,
    heading: payload.heading,
    progress: payload.progress,
    status: payload.status,
    updatedAt: payload.updatedAt
  )

  if let activity = findActivity(callsign: payload.callsign) {
    let callsign = activity.attributes.flightKey
    Task {
      guard let existing = findActivity(callsign: callsign) else { return }
      if #available(iOS 16.2, *) {
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(20 * 60))
        await existing.update(content)
      } else {
        await existing.update(using: state)
      }
    }
    return 0
  } else {
    endAllActivities()
    do {
      if #available(iOS 16.2, *) {
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(20 * 60))
        let activity = try Activity.request(attributes: attributes, content: content, pushType: .token)
        observePushTokenUpdates(for: activity)
      } else {
        _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
      }
      return 0
    } catch {
      print("[SyncSeeker] start activity failed: \(error)")
      return -11
    }
  }
}

@available(iOS 16.1, *)
private func stopActivity(_ payload: SSFlightStopPayload) -> Int32 {
  guard ActivityAuthorizationInfo().areActivitiesEnabled else {
    print("[SyncSeeker] Live Activities disabled by system")
    return -10
  }

  guard findActivity(callsign: payload.callsign) != nil else {
    endAllActivities()
    return 0
  }

  endActivity(callsign: payload.callsign)

  return 0
}

@available(iOS 16.2, *)
private func observePushTokenUpdates(for activity: Activity<SyncSeekerFlightAttributes>) {
  let activityBox = SSUncheckedSendableBox(activity)
  Task(priority: .background) {
    let appGroup = syncSeekerWidgetAppGroup()
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      return
    }

    for await tokenData in activityBox.value.pushTokenUpdates {
      let token = tokenData.map { String(format: "%02x", $0) }.joined()
      defaults.set(token, forKey: kSyncSeekerLiveActivityPushTokenKey)
      defaults.synchronize()
    }
  }
}
#endif

@_cdecl("syncseeker_ios_bootstrap_background_refresh")
public func syncseeker_ios_bootstrap_background_refresh() -> Int32 {
  SSBackgroundRefreshCoordinator.bootstrap()
  return 0
}

@_cdecl("syncseeker_ios_start_live_activity")
public func syncseeker_ios_start_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  SSBackgroundRefreshCoordinator.bootstrap()
  guard let json = decodeJSONString(payload) else { return -1 }
  let storeCode = storeSharedPayload(json, key: kSyncSeekerLiveActivityKey, postWidgetReload: true)
  guard storeCode == 0 else { return storeCode }

  #if os(iOS) && canImport(ActivityKit)
  if #available(iOS 16.1, *),
     let data = json.data(using: .utf8),
     let livePayload = try? JSONDecoder().decode(SSFlightLivePayload.self, from: data) {
    return startOrUpdateActivity(livePayload)
  } else {
    print("[SyncSeeker] invalid live activity payload: \(json)")
    return -12
  }
  #else
  return 0
  #endif
}

@_cdecl("syncseeker_ios_update_live_activity")
public func syncseeker_ios_update_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  SSBackgroundRefreshCoordinator.bootstrap()
  return syncseeker_ios_start_live_activity(payload)
}

@_cdecl("syncseeker_ios_stop_live_activity")
public func syncseeker_ios_stop_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  SSBackgroundRefreshCoordinator.bootstrap()
  guard let json = decodeJSONString(payload) else { return -1 }
  let storeCode = storeSharedPayload(json, key: kSyncSeekerLiveActivityKey, postWidgetReload: true)
  guard storeCode == 0 else { return storeCode }

  #if os(iOS) && canImport(ActivityKit)
  if #available(iOS 16.1, *),
     let data = json.data(using: .utf8),
     let stopPayload = try? JSONDecoder().decode(SSFlightStopPayload.self, from: data) {
    return stopActivity(stopPayload)
  } else {
    print("[SyncSeeker] invalid stop payload: \(json)")
    return -12
  }
  #else
  return 0
  #endif
}

@_cdecl("syncseeker_ios_sync_widget_snapshot")
public func syncseeker_ios_sync_widget_snapshot(_ payload: UnsafePointer<CChar>?) -> Int32 {
  SSBackgroundRefreshCoordinator.bootstrap()
  guard let json = decodeJSONString(payload) else { return -1 }
  return storeSharedPayload(json, key: kSyncSeekerWidgetSnapshotKey, postWidgetReload: true)
}

@_cdecl("ios_start_live_activity")
public func ios_start_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  syncseeker_ios_start_live_activity(payload)
}

@_cdecl("ios_update_live_activity")
public func ios_update_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  syncseeker_ios_update_live_activity(payload)
}

@_cdecl("ios_stop_live_activity")
public func ios_stop_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  syncseeker_ios_stop_live_activity(payload)
}

@_cdecl("ios_sync_widget_snapshot")
public func ios_sync_widget_snapshot(_ payload: UnsafePointer<CChar>?) -> Int32 {
  syncseeker_ios_sync_widget_snapshot(payload)
}
