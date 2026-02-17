import WidgetKit
import SwiftUI

#if os(iOS)
import ActivityKit

@available(iOS 16.1, *)
struct SyncSeekerFlightAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
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
struct SyncSeekerLiveActivityWidget: Widget {
  private func altitudeText(_ altitude: Int) -> String {
    if altitude < 18000 {
      return "\(max(0, altitude))ft"
    }
    return "FL\(max(180, altitude / 100))"
  }

  private func progressValue(_ progress: Int) -> Double {
    Double(max(0, min(100, progress))) / 100.0
  }

  private func airportCode(_ value: String) -> String {
    let text = value.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    return text.isEmpty ? "----" : String(text.prefix(4))
  }

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SyncSeekerFlightAttributes.self) { context in
      VStack(alignment: .leading, spacing: 12) {
        HStack(alignment: .firstTextBaseline) {
          Text(context.state.callsign)
            .font(.system(size: 20, weight: .bold, design: .rounded))
          Spacer()
          Text(context.state.aircraft)
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .foregroundStyle(Color.white.opacity(0.74))
        }

        HStack(alignment: .center, spacing: 10) {
          Text(airportCode(context.state.departure))
            .font(.system(size: 28, weight: .bold, design: .rounded))
            .frame(maxWidth: .infinity, alignment: .leading)
          Image(systemName: "arrow.right")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(Color(red: 0.95, green: 0.83, blue: 0.42))
          Text(airportCode(context.state.arrival))
            .font(.system(size: 28, weight: .bold, design: .rounded))
            .frame(maxWidth: .infinity, alignment: .trailing)
        }

        HStack(spacing: 10) {
          Text(altitudeText(context.state.altitude))
          Text("\(context.state.groundspeed)kt")
          Text(context.state.status)
            .lineLimit(1)
          Spacer(minLength: 0)
          Text("\(context.state.progress)%")
        }
        .font(.system(size: 12, weight: .semibold, design: .monospaced))
        .foregroundStyle(Color.white.opacity(0.85))

        ProgressView(value: progressValue(context.state.progress))
          .tint(Color(red: 0.95, green: 0.83, blue: 0.42))
      }
      .padding(.horizontal, 18)
      .padding(.vertical, 14)
      .background(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .fill(
            LinearGradient(
              colors: [Color(red: 0.11, green: 0.14, blue: 0.20), Color(red: 0.08, green: 0.10, blue: 0.15)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
      )
      .activityBackgroundTint(Color(red: 0.05, green: 0.06, blue: 0.10))
      .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 5) {
            Text(context.state.callsign)
              .font(.system(size: 13, weight: .bold, design: .rounded))
            Text(context.state.aircraft)
              .font(.system(size: 9, weight: .semibold, design: .rounded))
              .foregroundStyle(Color.white.opacity(0.72))
          }
          .padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 5) {
            Text(altitudeText(context.state.altitude))
              .font(.system(size: 11, weight: .semibold, design: .rounded))
            Text("\(context.state.groundspeed)kt")
              .font(.system(size: 11, weight: .semibold, design: .rounded))
          }
          .padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.center) {
          Text("LIVE TRACK")
            .font(.system(size: 10, weight: .semibold, design: .monospaced))
            .foregroundStyle(Color.white.opacity(0.68))
            .padding(.top, 2)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
              Text(airportCode(context.state.departure))
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .frame(maxWidth: .infinity, alignment: .leading)
              Image(systemName: "arrow.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color(red: 0.95, green: 0.83, blue: 0.42))
              Text(airportCode(context.state.arrival))
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .frame(maxWidth: .infinity, alignment: .trailing)
            }

            HStack {
              Text(context.state.status)
                .lineLimit(1)
              Spacer()
              Text("\(context.state.progress)%")
            }

            ProgressView(value: progressValue(context.state.progress))
              .tint(Color(red: 0.95, green: 0.83, blue: 0.42))
          }
          .font(.system(size: 11, weight: .semibold, design: .rounded))
          .padding(.horizontal, 10)
          .padding(.top, 4)
          .padding(.bottom, 8)
        }
      } compactLeading: {
        Text(String(context.state.callsign.prefix(6)))
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .lineLimit(1)
      } compactTrailing: {
        Text(altitudeText(context.state.altitude))
          .font(.system(size: 10, weight: .semibold, design: .monospaced))
          .lineLimit(1)
      } minimal: {
        Image(systemName: "airplane")
      }
      .widgetURL(URL(string: "syncseeker://tracked-flight"))
      .keylineTint(Color(red: 1.0, green: 0.82, blue: 0.24))
    }
  }
}
#endif
