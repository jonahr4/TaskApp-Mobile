# TaskApp Mobile — Version Planning

## v1.0.3 — Analytics, Rate Limits & Engagement *(in progress)*

### ✅ Already Shipped
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
- [x] Archives page (archived tasks/groups)
- [x] Task search (templates tab)
- [x] Sign-out preserves local tasks

### 🔧 In Progress (this version)

#### App Review Prompts
- [x] Install `expo-store-review`
- [x] Trigger at 5th, 15th, 30th, 50th task created (after March 12, 2026)
- [x] Trigger at 1st and 5th AI-created task (after March 12, 2026)
- [x] Each trigger fires only once (tracked in AsyncStorage)

#### User Data Collection (`userData/{uid}` Firestore collection)
- [x] Capture on sign-in: email, name, provider, device model, OS, app version, timezone
- [x] Counters: tasks created (manual / AI / calendar / matrix), tasks completed
- [x] AI counters: prompts sent, parse successes, parse failures
- [x] Configurable `dailyAiLimit` per user (default 25, admin-adjustable in Firebase)
- [x] Streak data: current streak, longest streak, last completed date

#### Task `createdFrom` Field
- [x] Add `createdFrom?: "tasks" | "ai" | "calendar" | "matrix"` to Task type
- [x] Track creation source at each call site + update userData counters

#### AI Rate Limiting
- [x] 25 AI parses/day per user, resets at midnight
- [x] `dailyAiLimit` configurable per-user in Firestore (admin can override per user)
- [x] Remaining count shown in AI tab UI
- [x] Friendly alert when limit reached (shows reset time)

#### Analytics
- [x] Create `lib/analytics.ts` — event logger → `users/{uid}/events`
- [x] Log task creation and completion events
- [x] Log AI parse events
- [x] Log tab view events
- [x] Update privacy policy to mention usage analytics

#### Streak / Gamification
- [x] Persist streak (current + longest) in `userData` Firestore doc
- [x] Streak milestone notifications at 3, 7, 14, 30 days
- [x] "Streak at risk" evening notification if no completions yet today

#### Manual Steps Needed
- [x] Add Firestore Security Rule for `userData` collection
- [x] Update privacy policy (see walkthrough for exact prompt)

---

## v1.1 — Task Power Features *(planned)*

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

## v1.2 — Collaboration *(planned)*

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

## 💡 Parking Lot (Ideas — No Version Assigned)

- **App Clips** — tight 15MB limit may be hard to meet with current Firebase+Expo binary
- **Android port** — currently iOS-only (WidgetKit, Apple Sign-In)
- **Web app companion** — `the-task-app.vercel.app` already exists as Next.js
- **Task templates** — the `templates.tsx` tab is currently "Search"; could become a template library
- **Natural language due dates in task modal** — mini-AI inline (e.g., type "tomorrow 3pm")
