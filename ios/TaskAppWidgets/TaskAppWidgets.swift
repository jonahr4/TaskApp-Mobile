//
//  TaskAppWidgets.swift
//  TaskAppWidgets
//
//  Created by Jonah Rothman on 2/23/26.
//

import WidgetKit
import SwiftUI

// MARK: - Data Model

struct WidgetTask: Codable, Identifiable {
    let id: String
    let title: String
    let dueDate: String?
    let dueTime: String?
    let completed: Bool
    let urgent: Bool?
    let important: Bool?
    let groupColor: String?
}

// MARK: - Data Loading

func loadTasks() -> [WidgetTask] {
    guard let defaults = UserDefaults(suiteName: "group.com.jonahro.mobile"),
          let json = defaults.string(forKey: "widgetTasks"),
          let data = json.data(using: .utf8) else { return [] }
    return (try? JSONDecoder().decode([WidgetTask].self, from: data)) ?? []
}

func loadTaskCount() -> Int {
    let defaults = UserDefaults(suiteName: "group.com.jonahro.mobile")
    return defaults?.integer(forKey: "widgetTaskCount") ?? 0
}

// MARK: - Color Helpers

extension WidgetTask {
    var priorityColor: Color {
        let u = urgent ?? false
        let i = important ?? false
        if u && i { return Color(red: 0.91, green: 0.30, blue: 0.24) }  // Do First - red
        if !u && i { return Color(red: 0.20, green: 0.60, blue: 0.86) } // Schedule - blue
        if u && !i { return Color(red: 0.95, green: 0.61, blue: 0.07) } // Delegate - amber
        return Color(red: 0.40, green: 0.40, blue: 0.40)                // Eliminate - gray
    }

    var formattedDue: String? {
        guard let date = dueDate else { return nil }
        // Parse "YYYY-MM-DD" and format as "Mon DD"
        let parts = date.split(separator: "-")
        guard parts.count == 3,
              let month = Int(parts[1]),
              let day = Int(parts[2]) else { return date }
        let months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        let monthStr = month > 0 && month <= 12 ? months[month] : "?"
        if let time = dueTime {
            return "\(monthStr) \(day), \(time)"
        }
        return "\(monthStr) \(day)"
    }
}

// MARK: - Timeline Provider

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let taskCount: Int
}

struct TaskTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        TaskEntry(date: Date(), tasks: [
            WidgetTask(id: "1", title: "Example task", dueDate: nil, dueTime: nil,
                       completed: false, urgent: true, important: true, groupColor: nil),
            WidgetTask(id: "2", title: "Another task", dueDate: nil, dueTime: nil,
                       completed: false, urgent: false, important: true, groupColor: nil),
        ], taskCount: 5)
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> Void) {
        let tasks = loadTasks()
        completion(TaskEntry(date: Date(), tasks: tasks, taskCount: loadTaskCount()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> Void) {
        let tasks = loadTasks()
        let entry = TaskEntry(date: Date(), tasks: tasks, taskCount: loadTaskCount())
        // Refresh every 30 minutes
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Small Widget: Next Task

struct NextTaskSmallView: View {
    let entry: TaskEntry

    var body: some View {
        if let task = entry.tasks.first {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(task.priorityColor)
                        .frame(width: 4, height: 16)
                    Text("Next Task")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    Spacer()
                }

                Text(task.title)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(2)
                    .foregroundColor(.primary)

                Spacer()

                if let due = task.formattedDue {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(due)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                if entry.taskCount > 1 {
                    Text("+\(entry.taskCount - 1) more")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(2)
        } else {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle")
                    .font(.title)
                    .foregroundColor(.green)
                Text("All caught up!")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Medium Widget: Upcoming Tasks List

struct UpcomingTasksMediumView: View {
    let entry: TaskEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("TaskApp")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                Spacer()
                if entry.taskCount > 0 {
                    Text("\(entry.taskCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.22, green: 0.78, blue: 0.46))
                        .clipShape(Capsule())
                }
            }

            if entry.tasks.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 4) {
                        Image(systemName: "checkmark.circle")
                            .font(.title2)
                            .foregroundColor(.green)
                        Text("No upcoming tasks")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                ForEach(Array(entry.tasks.prefix(4))) { task in
                    TaskRowView(task: task)
                }
                Spacer(minLength: 0)
            }
        }
        .padding(2)
    }
}

struct TaskRowView: View {
    let task: WidgetTask

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(task.priorityColor)
                .frame(width: 8, height: 8)

            Text(task.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(1)
                .foregroundColor(.primary)

            Spacer()

            if let due = task.formattedDue {
                Text(due)
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray6))
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 3)
    }
}

// MARK: - Large Widget: Today Dashboard

struct TodayDashboardLargeView: View {
    let entry: TaskEntry

    var quadrantCounts: (doFirst: Int, schedule: Int, delegate: Int, eliminate: Int) {
        var df = 0, sc = 0, dl = 0, el = 0
        for t in entry.tasks {
            let u = t.urgent ?? false
            let i = t.important ?? false
            if u && i { df += 1 }
            else if !u && i { sc += 1 }
            else if u && !i { dl += 1 }
            else { el += 1 }
        }
        return (df, sc, dl, el)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Today")
                        .font(.headline)
                        .fontWeight(.bold)
                    Text(entry.date, style: .date)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text("\(entry.taskCount) tasks")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(red: 0.22, green: 0.78, blue: 0.46))
                    .clipShape(Capsule())
            }

            Divider()

            // Task list
            if entry.tasks.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "checkmark.circle")
                            .font(.title)
                            .foregroundColor(.green)
                        Text("All caught up!")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                ForEach(Array(entry.tasks.prefix(5))) { task in
                    TaskRowView(task: task)
                }
            }

            Spacer(minLength: 0)

            Divider()

            // Mini matrix summary
            let q = quadrantCounts
            HStack(spacing: 0) {
                MatrixCell(label: "Do", count: q.doFirst,
                           color: Color(red: 0.91, green: 0.30, blue: 0.24))
                MatrixCell(label: "Plan", count: q.schedule,
                           color: Color(red: 0.20, green: 0.60, blue: 0.86))
                MatrixCell(label: "Ask", count: q.delegate,
                           color: Color(red: 0.95, green: 0.61, blue: 0.07))
                MatrixCell(label: "Drop", count: q.eliminate,
                           color: Color(red: 0.40, green: 0.40, blue: 0.40))
            }
        }
        .padding(2)
    }
}

struct MatrixCell: View {
    let label: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(count)")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Widget Definitions

struct NextTaskWidget: Widget {
    let kind = "NextTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaskTimelineProvider()) { entry in
            NextTaskSmallView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Task")
        .description("Shows your most important upcoming task.")
        .supportedFamilies([.systemSmall])
    }
}

struct UpcomingTasksWidget: Widget {
    let kind = "UpcomingTasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaskTimelineProvider()) { entry in
            UpcomingTasksMediumView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Upcoming Tasks")
        .description("Shows your next few tasks at a glance.")
        .supportedFamilies([.systemMedium])
    }
}

struct TodayDashboardWidget: Widget {
    let kind = "TodayDashboardWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaskTimelineProvider()) { entry in
            TodayDashboardLargeView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Today's Dashboard")
        .description("Full view of today's tasks with matrix summary.")
        .supportedFamilies([.systemLarge])
    }
}

// MARK: - Small Widget: AI Quick Action

struct AIQuickActionView: View {
    var body: some View {
        Link(destination: URL(string: "mobile://openai")!) {
            VStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.40, green: 0.35, blue: 0.90),
                                    Color(red: 0.55, green: 0.40, blue: 0.95)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 48, height: 48)
                    Image(systemName: "sparkles")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)
                }

                Text("Ask AI")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
            }
        }
    }
}

struct AIQuickActionWidget: Widget {
    let kind = "AIQuickActionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaskTimelineProvider()) { _ in
            AIQuickActionView()
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Ask AI")
        .description("Quick access to your AI assistant.")
        .supportedFamilies([.systemSmall])
    }
}

