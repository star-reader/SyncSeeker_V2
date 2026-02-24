import WidgetKit
import SwiftUI

private struct SnapshotEntry: TimelineEntry {
  let date: Date
  let payload: SSWidgetSnapshotPayload
}

private struct SnapshotProvider: TimelineProvider {
  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(
      date: Date(),
      payload: SSWidgetSnapshotPayload(
        totalFlights: 0,
        trackedFlight: nil,
        topFlights: [],
        updatedAt: ISO8601DateFormatter().string(from: Date())
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    let payload = SSSharedStore.readWidgetSnapshot()
      ?? SSWidgetSnapshotPayload(totalFlights: 0, trackedFlight: nil, topFlights: [], updatedAt: ISO8601DateFormatter().string(from: Date()))
    completion(SnapshotEntry(date: Date(), payload: payload))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    let payload = SSSharedStore.readWidgetSnapshot()
      ?? SSWidgetSnapshotPayload(totalFlights: 0, trackedFlight: nil, topFlights: [], updatedAt: ISO8601DateFormatter().string(from: Date()))

    let entry = SnapshotEntry(date: Date(), payload: payload)
    let refresh = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date().addingTimeInterval(60)
    completion(Timeline(entries: [entry], policy: .after(refresh)))
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
      let maxRows = proxy.size.height >= 170 ? 5 : 4
      let flights = Array(displayFlights.prefix(maxRows))

      VStack(alignment: .leading, spacing: 6) {
        HStack(alignment: .firstTextBaseline) {
          Text("ONLINE")
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .foregroundStyle(Color.white.opacity(0.72))
          Spacer()
          Text("\(entry.payload.totalFlights)")
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
        }

        VStack(spacing: 4) {
          ForEach(Array(flights.enumerated()), id: \.offset) { index, flight in
            HStack(spacing: 6) {
              Circle()
                .fill(statusColor(flight.status))
                .frame(width: 5, height: 5)
              Text(flight.callsign)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
                .frame(width: 60, alignment: .leading)
              Text("\(airportCode(flight.departure))→\(airportCode(flight.arrival))")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.9))
                .frame(width: 84, alignment: .leading)
                .lineLimit(1)
              Text(aircraftText(flight.aircraft))
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .foregroundStyle(Color(red: 0.68, green: 0.79, blue: 1.0))
                .frame(width: 42, alignment: .leading)
                .lineLimit(1)
              Spacer(minLength: 0)
              Text(altitudeText(flight.altitude))
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.68))
                .frame(width: 52, alignment: .trailing)
              Text("\(flight.groundspeed)kt")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.68))
                .frame(width: 48, alignment: .trailing)
            }

            if index < flights.count - 1 {
              Rectangle()
                .fill(Color.white.opacity(0.12))
                .frame(height: 1)
            }
          }

          if flights.isEmpty {
            Text("暂无在线航班")
              .font(.system(size: 12, weight: .medium, design: .rounded))
              .foregroundStyle(Color.white.opacity(0.66))
              .frame(maxWidth: .infinity, alignment: .leading)
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
    .padding(.horizontal, 8)
    .padding(.vertical, 7)
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
    .supportedFamilies([.systemSmall, .systemMedium])
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
