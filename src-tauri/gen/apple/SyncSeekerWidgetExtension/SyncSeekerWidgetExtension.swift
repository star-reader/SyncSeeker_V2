import WidgetKit
import SwiftUI
import Foundation

private let kDefaultWidgetAPIBaseURL = "https://go.api.skylineflyleague.cn"
private let kWidgetTimelineRefreshInterval: TimeInterval = 5 * 60

private struct SnapshotEntry: TimelineEntry {
  let date: Date
  let payload: SSWidgetSnapshotPayload
}

private struct SnapshotProvider: TimelineProvider {
  private func emptyPayload() -> SSWidgetSnapshotPayload {
    SSWidgetSnapshotPayload(
      totalFlights: 0,
      trackedFlight: nil,
      topFlights: [],
      updatedAt: ISO8601DateFormatter().string(from: Date()),
      apiBaseUrl: kDefaultWidgetAPIBaseURL,
      trackedCallsign: nil
    )
  }

  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(
      date: Date(),
      payload: emptyPayload()
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    let payload = SSSharedStore.readWidgetSnapshot() ?? emptyPayload()
    completion(SnapshotEntry(date: Date(), payload: payload))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    let seed = SSSharedStore.readWidgetSnapshot() ?? emptyPayload()
    print("[SyncSeekerWidget] getTimeline seedUpdatedAt=\(seed.updatedAt)")
    SSWidgetRemoteSyncService.fetchLatestSnapshot(seed: seed) { refreshedPayload in
      let payload = refreshedPayload ?? seed
      let entry = SnapshotEntry(date: Date(), payload: payload)
      let refresh = Date().addingTimeInterval(kWidgetTimelineRefreshInterval)
      print("[SyncSeekerWidget] timeline prepared total=\(payload.totalFlights) nextRefresh=\(refresh)")
      completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
  }
}

private enum SSWidgetRemoteSyncService {
  private static let isoFormatter = ISO8601DateFormatter()
  private static let syncLimit = 12

  private static func onlineListURL(from apiBaseURL: String?) -> URL? {
    let base = SSSharedStore.normalizeBaseURL(apiBaseURL)
      ?? SSSharedStore.readWidgetAPIBaseURL()
      ?? kDefaultWidgetAPIBaseURL
    return URL(string: "\(base)/Map/GetOnlineList")
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

  private static func makeWidgetFlightItem(from pilot: SSOnlinePilot) -> SSWidgetFlightItem {
    SSWidgetFlightItem(
      callsign: pilot.callsign,
      departure: pilot.flightPlan?.departure ?? "----",
      arrival: pilot.flightPlan?.arrival ?? "----",
      aircraft: pilot.flightPlan?.aircraft ?? "N/A",
      altitude: max(0, pilot.altitude),
      groundspeed: max(0, pilot.groundspeed),
      status: statusText(for: pilot)
    )
  }

  static func fetchLatestSnapshot(seed: SSWidgetSnapshotPayload, completion: @escaping (SSWidgetSnapshotPayload?) -> Void) {
    guard let url = onlineListURL(from: seed.apiBaseUrl) else {
      print("[SyncSeekerWidget] fetch skipped: invalid URL")
      completion(nil)
      return
    }
    let resolvedAPIBaseURL = SSSharedStore.normalizeBaseURL(seed.apiBaseUrl)
      ?? SSSharedStore.readWidgetAPIBaseURL()
      ?? kDefaultWidgetAPIBaseURL

    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 8
    configuration.timeoutIntervalForResource = 12
    let session = URLSession(configuration: configuration)

    session.dataTask(with: url) { data, _, error in
      defer { session.finishTasksAndInvalidate() }
      guard error == nil,
            let data,
            let response = try? JSONDecoder().decode(SSOnlineListResponse.self, from: data) else {
        if let error {
          print("[SyncSeekerWidget] fetch failed error=\(error.localizedDescription)")
        } else {
          print("[SyncSeekerWidget] fetch failed: decode error")
        }
        completion(nil)
        return
      }

      let flights = response.flights
        .filter { !$0.callsign.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        .sorted { $0.logonTime > $1.logonTime }

      let trackedCallsign = (seed.trackedCallsign ?? seed.trackedFlight?.callsign)?.trimmingCharacters(in: .whitespacesAndNewlines)
      let trackedFlight = flights.first(where: {
        guard let trackedCallsign, !trackedCallsign.isEmpty else { return false }
        return $0.callsign.caseInsensitiveCompare(trackedCallsign) == .orderedSame
      }).map(makeWidgetFlightItem)

      let payload = SSWidgetSnapshotPayload(
        totalFlights: flights.count,
        trackedFlight: trackedFlight,
        topFlights: Array(flights.prefix(syncLimit).map(makeWidgetFlightItem)),
        updatedAt: isoFormatter.string(from: Date()),
        apiBaseUrl: resolvedAPIBaseURL,
        trackedCallsign: trackedCallsign
      )

      SSSharedStore.writeWidgetSnapshot(payload)
      print("[SyncSeekerWidget] fetch success total=\(payload.totalFlights)")
      completion(payload)
    }.resume()
  }
}

private struct SnapshotWidgetView: View {
  let entry: SnapshotProvider.Entry
  @Environment(\.widgetFamily) private var family

  private func statusColor(_ status: String) -> Color {
    let lower = status.lowercased()
    if lower.contains("ground") || lower.contains("taxi") || lower.contains("park") || status.contains("停机") || status.contains("滑行") || status.contains("地面") {
      return Color(red: 0.95, green: 0.33, blue: 0.33)
    }
    if lower.contains("climb") || lower.contains("desc") || status.contains("爬升") || status.contains("下降") || status.contains("起飞") {
      return Color(red: 0.35, green: 0.67, blue: 1.0)
    }
    if lower.contains("cruise") || lower.contains("air") || lower.contains("enroute") || status.contains("巡航") {
      return Color(red: 0.37, green: 0.86, blue: 0.49)
    }
    return Color.white.opacity(0.72)
  }

  private func airportCode(_ raw: String) -> String {
    let code = raw.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if code.isEmpty || code == "N/A" || code == "----" {
      return "----"
    }
    return String(code.prefix(4))
  }

  private func aircraftText(_ raw: String?) -> String {
    let value = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return value.isEmpty || value == "N/A" ? "--" : String(value.prefix(6)).uppercased()
  }

  private func altitudeText(_ altitude: Int) -> String {
    if altitude < 18000 {
      return "\(max(0, altitude))ft"
    }
    return "FL\(max(180, altitude / 100))"
  }

  private var displayFlights: [SSWidgetFlightItem] {
    if let tracked = entry.payload.trackedFlight {
      return [tracked] + entry.payload.topFlights.filter { $0.callsign != tracked.callsign }
    }
    return entry.payload.topFlights
  }

  private var primaryFlight: SSWidgetFlightItem? {
    displayFlights.first
  }

  @ViewBuilder
  private var smallBody: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .firstTextBaseline) {
        Text("ONLINE")
          .font(.system(size: 10, weight: .semibold, design: .monospaced))
          .foregroundStyle(Color.white.opacity(0.72))
        Spacer()
        Text("\(entry.payload.totalFlights)")
          .font(.system(size: 17, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
      }

      if let flight = primaryFlight {
        VStack(alignment: .leading, spacing: 6) {
          HStack(spacing: 6) {
            Circle()
              .fill(statusColor(flight.status))
              .frame(width: 6, height: 6)
            Text(flight.callsign)
              .font(.system(size: 14, weight: .bold, design: .monospaced))
              .foregroundStyle(.white)
              .lineLimit(1)
          }

          Text("\(airportCode(flight.departure))→\(airportCode(flight.arrival))")
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .foregroundStyle(Color.white.opacity(0.9))
            .lineLimit(1)

          HStack(spacing: 8) {
            Text(aircraftText(flight.aircraft))
              .foregroundStyle(Color(red: 0.68, green: 0.79, blue: 1.0))
            Text(altitudeText(flight.altitude))
              .foregroundStyle(Color.white.opacity(0.78))
            Text("\(flight.groundspeed)kt")
              .foregroundStyle(Color.white.opacity(0.78))
          }
          .font(.system(size: 10, weight: .semibold, design: .monospaced))

          VStack(spacing: 2) {
            ForEach(Array(displayFlights.dropFirst().prefix(2).enumerated()), id: \.offset) { _, item in
              HStack(spacing: 6) {
                Circle()
                  .fill(statusColor(item.status))
                  .frame(width: 4, height: 4)
                Text(item.callsign)
                  .font(.system(size: 9, weight: .bold, design: .monospaced))
                  .foregroundStyle(Color.white.opacity(0.88))
                  .lineLimit(1)
                Spacer(minLength: 0)
                Text("\(airportCode(item.departure))→\(airportCode(item.arrival))")
                  .font(.system(size: 9, weight: .medium, design: .monospaced))
                  .foregroundStyle(Color.white.opacity(0.62))
                  .lineLimit(1)
              }
            }
          }
        }
      } else {
        Spacer(minLength: 0)
        Text("暂无在线航班")
          .font(.system(size: 12, weight: .medium, design: .rounded))
          .foregroundStyle(Color.white.opacity(0.66))
        Spacer(minLength: 0)
      }
    }
  }

  @ViewBuilder
  private var mediumBody: some View {
    GeometryReader { proxy in
      let totalHeight = proxy.size.height
      let headerHeight: CGFloat = 24
      let rowHeight: CGFloat = 15
      let rowSpacing: CGFloat = 3
      let separatorHeight: CGFloat = 1
      let listTopSpacing: CGFloat = 5
      let available = max(0, totalHeight - headerHeight - listTopSpacing)
      let unit = rowHeight + rowSpacing + separatorHeight
      let computedRows = Int((available + rowSpacing) / max(1, unit))
      let maxRows = max(2, min(computedRows, 10))
      let flights = Array(displayFlights.prefix(maxRows))

      VStack(alignment: .leading, spacing: listTopSpacing) {
        HStack(alignment: .firstTextBaseline) {
          Text("ONLINE")
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .foregroundStyle(Color.white.opacity(0.72))
          Spacer(minLength: 0)
          Text("\(entry.payload.totalFlights)")
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
        }

        VStack(spacing: rowSpacing) {
          ForEach(Array(flights.enumerated()), id: \.offset) { index, flight in
            HStack(spacing: 6) {
              Circle()
                .fill(statusColor(flight.status))
                .frame(width: 5, height: 5)

              Text(flight.callsign)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .layoutPriority(2)

              Text("\(airportCode(flight.departure))→\(airportCode(flight.arrival))")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .layoutPriority(3)

              Text(aircraftText(flight.aircraft))
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .foregroundStyle(Color(red: 0.68, green: 0.79, blue: 1.0))
                .lineLimit(1)
                .minimumScaleFactor(0.78)
                .layoutPriority(1)

              Spacer(minLength: 0)

              Text(altitudeText(flight.altitude))
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.68))
                .lineLimit(1)
                .minimumScaleFactor(0.75)

              Text("\(flight.groundspeed)kt")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.68))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            }
            .frame(height: rowHeight)

            if index < flights.count - 1 {
              Rectangle()
                .fill(Color.white.opacity(0.12))
                .frame(height: separatorHeight)
            }
          }

          if flights.isEmpty {
            Text("暂无在线航班")
              .font(.system(size: 12, weight: .medium, design: .rounded))
              .foregroundStyle(Color.white.opacity(0.66))
              .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }

  var body: some View {
    Group {
      if family == .systemSmall {
        smallBody
      } else {
        mediumBody
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(.horizontal, 4)
    .padding(.vertical, 3)
    .containerBackground(for: .widget) {
      LinearGradient(
        colors: [Color(red: 0.11, green: 0.13, blue: 0.17), Color(red: 0.06, green: 0.07, blue: 0.10)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    }
  }
}

struct SyncSeekerSnapshotWidget: Widget {
  let kind: String = "SyncSeekerSnapshotWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
      SnapshotWidgetView(entry: entry)
    }
    .configurationDisplayName("SyncSeeker 航班")
    .description("显示在线航班数量与追踪航班")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

@main
struct SyncSeekerWidgetExtensionBundle: WidgetBundle {
  var body: some Widget {
    SyncSeekerSnapshotWidget()
    if #available(iOS 16.1, *) {
      SyncSeekerLiveActivityWidget()
    }
  }
}
