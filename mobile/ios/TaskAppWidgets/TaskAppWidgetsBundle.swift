//
//  TaskAppWidgetsBundle.swift
//  TaskAppWidgets
//
//  Created by Jonah Rothman on 2/23/26.
//

import WidgetKit
import SwiftUI

@main
struct TaskAppWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NextTaskWidget()
        AIQuickActionWidget()
        UpcomingTasksWidget()
        TodayDashboardWidget()
    }
}
