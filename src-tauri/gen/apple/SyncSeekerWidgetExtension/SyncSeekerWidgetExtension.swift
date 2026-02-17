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

  private func statusColor(_ status: String) -> Color {
    let lower = status.lowercased()
    if lower.contains("air") || lower.contains("cruise") {
      return Color(red: 0.29, green: 0.76, blue: 0.97)
    }
    if lower.contains("taxi") || lower.contains("ground") {
      return Color(red: 0.96, green: 0.71, blue: 0.28)
    }
    return Color(red: 0.55, green: 0.89, blue: 0.55)
  }

  private var displayFlights: [SSWidgetFlightItem] {
    if let tracked = entry.payload.trackedFlight {
      return [tracked] + entry.payload.topFlights.filter { $0.callsign != tracked.callsign }
    }
    return entry.payload.topFlights
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline) {
        Text("ONLINE")
          .font(.system(size: 11, weight: .semibold, design: .monospaced))
          .foregroundStyle(Color.white.opacity(0.72))
        Spacer()
        Text("\(entry.payload.totalFlights)")
          .font(.system(size: 22, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
      }

      VStack(spacing: 8) {
        ForEach(Array(displayFlights.prefix(3).enumerated()), id: \.offset) { index, flight in
          VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
              Circle()
                .fill(statusColor(flight.status))
                .frame(width: 6, height: 6)
              Text(flight.callsign)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
                .frame(width: 72, alignment: .leading)
              Text("\(flight.departure) → \(flight.arrival)")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.92))
                .lineLimit(1)
              Spacer(minLength: 0)
              Text("\(flight.groundspeed)kt")
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.7))
            }

            HStack(spacing: 8) {
              Text(flight.aircraft ?? "N/A")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(Color(red: 0.68, green: 0.79, blue: 1.0))
              Text("FL \(max(0, flight.altitude / 100))")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.62))
              Spacer(minLength: 0)
              Text(flight.status)
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .foregroundStyle(statusColor(flight.status))
                .lineLimit(1)
            }
          }

          if index < min(displayFlights.count, 3) - 1 {
            Rectangle()
              .fill(Color.white.opacity(0.12))
              .frame(height: 1)
          }
        }

        if displayFlights.isEmpty {
          Text("暂无在线航班")
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .foregroundStyle(Color.white.opacity(0.66))
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(14)
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
