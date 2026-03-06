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
  let apiBaseUrl: String?
  let trackedCallsign: String?
}

struct SSOnlineListResponse: Decodable {
  let flights: [SSOnlinePilot]

  enum CodingKeys: String, CodingKey {
    case flights
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    flights = try container.decodeIfPresent([SSOnlinePilot].self, forKey: .flights) ?? []
  }
}

struct SSOnlinePilot: Decodable {
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

struct SSOnlineFlightPlan: Decodable {
  let aircraft: String?
  let departure: String?
  let arrival: String?
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

  static func writeWidgetSnapshot(_ payload: SSWidgetSnapshotPayload) {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let data = try? JSONEncoder().encode(payload),
          let json = String(data: data, encoding: .utf8) else {
      return
    }
    defaults.set(json, forKey: widgetSnapshotKey)
    defaults.synchronize()
  }
}
