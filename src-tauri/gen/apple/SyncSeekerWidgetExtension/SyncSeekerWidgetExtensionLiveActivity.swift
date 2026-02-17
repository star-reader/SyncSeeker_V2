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
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SyncSeekerFlightAttributes.self) { context in
      VStack(alignment: .leading, spacing: 8) {
        Text(context.state.callsign)
          .font(.headline)
        Text("\(context.state.departure) → \(context.state.arrival)")
          .font(.subheadline)
        HStack {
          Text("FL \(max(0, context.state.altitude / 100))")
          Spacer()
          Text("\(context.state.groundspeed) kt")
        }
        .font(.caption)
      }
      .padding()
      .activityBackgroundTint(Color.cyan.opacity(0.2))
      .activitySystemActionForegroundColor(.primary)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.state.callsign)
            .font(.caption)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("\(context.state.groundspeed)kt")
            .font(.caption)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 4) {
            Text("\(context.state.departure) → \(context.state.arrival)")
            ProgressView(value: Double(context.state.progress), total: 100)
          }
          .font(.caption2)
        }
      } compactLeading: {
        Text(context.state.callsign.prefix(3))
      } compactTrailing: {
        Text("\(context.state.groundspeed)")
      } minimal: {
        Text("✈︎")
      }
      .widgetURL(URL(string: "syncseeker://tracked-flight"))
      .keylineTint(.cyan)
    }
  }
}
#endif
