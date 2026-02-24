import Foundation

struct SSFlightLivePayload: Codable {
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

struct SSWidgetFlightItem: Codable {
  let callsign: String
  let departure: String
  let arrival: String
  let aircraft: String?
  let altitude: Int
  let groundspeed: Int
  let status: String
}

struct SSWidgetSnapshotPayload: Codable {
  let totalFlights: Int
  let trackedFlight: SSWidgetFlightItem?
  let topFlights: [SSWidgetFlightItem]
  let updatedAt: String
}

enum SSSharedStore {
  static var appGroup: String {
    let bundleId = Bundle.main.bundleIdentifier ?? "cn.skylineflyleague.map.beta"
    let suffixes = [".SyncSeekerWidgetExtensionExtension", ".SyncSeekerWidgetExtension"]
    let baseId = suffixes.first(where: { bundleId.hasSuffix($0) })
      .map { String(bundleId.dropLast($0.count)) }
      ?? bundleId
    return "group.\(baseId)"
  }
  static let liveActivityKey = "syncseeker.live_activity.payload"
  static let widgetSnapshotKey = "syncseeker.widget.snapshot.payload"

  static func readLivePayload() -> SSFlightLivePayload? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let raw = defaults.string(forKey: liveActivityKey),
          let data = raw.data(using: .utf8) else {
      return nil
    }
    return try? JSONDecoder().decode(SSFlightLivePayload.self, from: data)
  }

  static func readWidgetSnapshot() -> SSWidgetSnapshotPayload? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let raw = defaults.string(forKey: widgetSnapshotKey),
          let data = raw.data(using: .utf8) else {
      return nil
    }
    return try? JSONDecoder().decode(SSWidgetSnapshotPayload.self, from: data)
  }
}
