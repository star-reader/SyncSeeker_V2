import Foundation
import WidgetKit

#if canImport(ActivityKit)
import ActivityKit
#endif

private let kSyncSeekerWidgetAppGroup = "group.cn.skylineflyleague.map.beta"
private let kSyncSeekerLiveActivityKey = "syncseeker.live_activity.payload"
private let kSyncSeekerWidgetSnapshotKey = "syncseeker.widget.snapshot.payload"
private let kSyncSeekerWidgetReloadNotification = "cn.skylineflyleague.map.beta.widget.reload"

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

private func decodeJSONString(_ raw: UnsafePointer<CChar>?) -> String? {
  guard let raw else { return nil }
  return String(cString: raw)
}

private func storeSharedPayload(_ value: String, key: String, postWidgetReload: Bool) -> Int32 {
  guard let defaults = UserDefaults(suiteName: kSyncSeekerWidgetAppGroup) else {
    return -3
  }

  defaults.set(value, forKey: key)
  defaults.synchronize()

  if postWidgetReload {
    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName(kSyncSeekerWidgetReloadNotification as CFString),
      nil,
      nil,
      true
    )
    WidgetCenter.shared.reloadAllTimelines()
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
    altitude: payload.altitude,
    groundspeed: payload.groundspeed,
    heading: payload.heading,
    progress: payload.progress,
    status: payload.status,
    updatedAt: payload.updatedAt
  )

  if let activity = findActivity(callsign: payload.callsign) {
    Task {
      await activity.update(using: state)
    }
    return 0
  } else {
    do {
      _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
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

  guard let activity = findActivity(callsign: payload.callsign) else {
    return 0
  }

  Task {
    if #available(iOS 16.2, *) {
      await activity.end(nil, dismissalPolicy: .immediate)
    } else {
      await activity.end(using: activity.contentState, dismissalPolicy: .immediate)
    }
  }

  return 0
}
#endif

@_cdecl("syncseeker_ios_start_live_activity")
public func syncseeker_ios_start_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
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
  #endif

  return 0
}

@_cdecl("syncseeker_ios_update_live_activity")
public func syncseeker_ios_update_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
  syncseeker_ios_start_live_activity(payload)
}

@_cdecl("syncseeker_ios_stop_live_activity")
public func syncseeker_ios_stop_live_activity(_ payload: UnsafePointer<CChar>?) -> Int32 {
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
  #endif

  return 0
}

@_cdecl("syncseeker_ios_sync_widget_snapshot")
public func syncseeker_ios_sync_widget_snapshot(_ payload: UnsafePointer<CChar>?) -> Int32 {
  guard let json = decodeJSONString(payload) else { return -1 }
  return storeSharedPayload(json, key: kSyncSeekerWidgetSnapshotKey, postWidgetReload: true)
}
