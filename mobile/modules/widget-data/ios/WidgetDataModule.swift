import ExpoModulesCore
import WidgetKit

public class WidgetDataModule: Module {
  private let suiteName = "group.com.jonahro.mobile"

  public func definition() -> ModuleDefinition {
    Name("WidgetData")

    /// Write a JSON string of tasks to the shared App Group UserDefaults.
    /// The widget extension reads this same key to display tasks.
    AsyncFunction("setTasksJSON") { (json: String) in
      guard let defaults = UserDefaults(suiteName: self.suiteName) else {
        throw NSError(domain: "WidgetData", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Failed to access App Group: \(self.suiteName)"
        ])
      }
      defaults.set(json, forKey: "widgetTasks")
      defaults.synchronize()

      // Tell iOS to refresh the widget timeline
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    /// Quick helper: store just the count of upcoming tasks
    /// (useful for badge-style small widgets)
    AsyncFunction("setTaskCount") { (count: Int) in
      guard let defaults = UserDefaults(suiteName: self.suiteName) else { return }
      defaults.set(count, forKey: "widgetTaskCount")
      defaults.synchronize()

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
