# TaskApp Mobile — Version Planning

## v1.0.3 — Analytics, Rate Limits & Engagement *(shipped)*

### Shipped
- [x] Task list with drag-sort + groups
- [x] Eisenhower Matrix (4-quadrant prioritization)
- [x] Calendar view with iCal feed
- [x] AI Reminder tab (GPT-4o parse)
- [x] Smart notifications + daily summaries
- [x] Stats tab (completion rate, streak, quadrant breakdown)
- [x] Home screen widgets (iOS WidgetKit)
- [x] Onboarding flow
- [x] Dark mode
- [x] Offline-first with Firestore sync
- [x] Google Sign-In + Apple Sign-In
- [x] Task search (templates tab)
- [x] Sign-out preserves local tasks
- [x] App review prompts (5th, 15th, 30th, 50th task + 1st/5th AI task)
- [x] User data collection (`userData/{uid}`)
- [x] Task `createdFrom` field tracking
- [x] AI rate limiting (25/day, configurable)
- [x] Analytics event logging (`users/{uid}/events`)
- [x] Streak tracking + milestone notifications
- [x] Admin dashboard (Vite/React, deployed on Vercel)

---

## v1.1.0 — Bug Fixes, Archive & UX Polish *(in progress)*

See `TODO_v1.1.md` for full task breakdown.

### Bug Fixes
- [ ] **Notification spam** — streak-at-risk uses DAILY repeating trigger, never cancelled on task completion; tone down streak notifications overall
- [ ] **Sign-out/sign-in task persistence** — sign-out should clear local tasks (safe in cloud); fix discard-local-tasks path not actually clearing; keep local-only (no account) tasks intact
- [ ] **Verify local tasks in matrix** — confirm matrix reads from same source when signed out

### Features
- [ ] **Default group reorder & delete** — allow reordering/deleting any group, guard against 0 groups, prompt to migrate tasks
- [ ] **Rename quadrant labels** — rename the quadrant names themselves to reference "Important" and "Urgent"
- [ ] **Archive mode** — port from web app (`TheTaskApp/src/app/archives/page.tsx`); add `archived?: boolean` to Task/TaskGroup types; archive viewer page
- [ ] **7-day adjustable filter** — date range filter on task list (Today / 7d / 30d / All), default 7d
- [ ] **Calendar group filter bug (web)** — fix web calendar showing all tasks regardless of group filter

### UX
- [ ] **Splash screen** — update to show "TaskApp" in app font and coloring
- [ ] **Scroll indicators** — subtle gradient fade at bottom of scrollable lists

---

## v1.2 — Task Power Features *(planned)*

- [ ] **Recurring tasks** — `recurrence` field on Task (frequency, interval, daysOfWeek, endDate)
  - Complete → advance dueDate in-place (no new doc)
- [ ] **Subtasks / Checklist** — `subtasks: { id, title, completed }[]` array on task doc (max 10)
  - Rendered as checklist inside TaskModal
- [ ] **Focus Mode / Pomodoro** — floating overlay modal (not a new tab)
  - 25-min countdown, pause/reset, works from any tab
  - Surfaces "DO FIRST" (urgent+important) tasks
- [ ] **Siri Shortcuts** — custom Expo module registering `INCreateTaskIntent`
  - Requires App Groups entitlement + Xcode IntentDefinition
- [ ] **Enhanced stats** — weekly/monthly trend charts, busiest day of week

---

## v1.3 — Collaboration *(planned)*

- [ ] **Task sharing / Workspaces** — new root `workspaces/{id}/tasks` collection
  - Workspace doc has `members: string[]`
  - Firestore Security Rules updated for member access
  - Affects: `firestore.ts`, `useTasks.ts`, `crud.ts`, widgets, notifications, iCal
- [ ] **Shared iCal feeds** per workspace
- [ ] **Activity feed** — who did what in a shared workspace

---

## v2.0 — TaskApp Pro (Paid Tier) *(future)*

### Pricing
- Monthly: $2.99/mo
- Annual: $19.99/yr (~$1.67/mo)
- Lifetime: $39.99 (optional)

### Implementation
- **Library:** RevenueCat (`react-native-purchases`) — handles renewals, receipts, trials
- **Gating:** `users/{uid}.isPro` synced by RevenueCat webhook
- **`useProStatus()` hook** — reads from Firestore, gates features gracefully (show upsell sheet, never silently fail)

### Feature Segmentation

| Feature | Free | Pro |
|---|---|---|
| Unlimited tasks | ✅ | ✅ |
| Groups (unlimited) | ✅ | ✅ |
| AI Parses (25/day) | ✅ | ✅ (higher limit) |
| Eisenhower Matrix | ✅ | ✅ |
| Basic stats | ✅ | ✅ |
| Recurring tasks | ❌ | ✅ |
| Subtasks/checklists | ❌ | ✅ |
| Task sharing/collaboration | ❌ | ✅ |
| Focus Mode / Pomodoro | ❌ | ✅ |
| Advanced stats (trends, charts) | Limited | Full |
| Priority support | ❌ | ✅ |

---

## Parking Lot (Ideas — No Version Assigned)

- **App Clips** — tight 15MB limit may be hard to meet with current Firebase+Expo binary
- **Android port** — currently iOS-only (WidgetKit, Apple Sign-In)
- **Web app companion** — `the-task-app.vercel.app` already exists as Next.js
- **Task templates** — the `templates.tsx` tab is currently "Search"; could become a template library
- **Natural language due dates in task modal** — mini-AI inline (e.g., type "tomorrow 3pm")
