# TaskApp v1.1 — TODO

## Bug Fixes

### P0 — Notification Spam
- [x] **Fix streak-at-risk daily repeat** — `lib/notifications.ts:278-298`
  - Root cause: uses `DAILY` trigger → repeats every 8 PM forever
  - Never cancelled when a task is completed
  - Fix: cancel streak-at-risk in task completion handler (`lib/crud.ts`)
  - Fix: only schedule if streak > 0 AND notifications enabled
  - Fix: if streak is already broken (0), don't schedule at all
- [x] **Tone down streak notifications**
  - Reduce milestone triggers (currently 3, 7, 14, 21, 28…)
  - If streak is lost → bi-weekly nudge at most, not daily
  - Consider making streak notifications opt-in via settings
- [x] **Debounce `rescheduleAllReminders`** — `app/(tabs)/tasks.tsx:932-946`
  - Currently fires on every `[tasks, groups]` change
  - Add 2-second debounce to prevent cancel/reschedule flood

---

### P0 — Sign-Out / Sign-In Task Persistence
- [x] **Sign out → clear local tasks** — `hooks/useAuth.tsx:160-178`
  - Current: snapshots cloud data TO local on sign-out (tasks persist locally after logout)
  - New: on sign-out, clear local tasks (safe in cloud)
  - Remove `replaceAllLocalTasks` / `replaceAllLocalGroups` calls in `logOut()`
  - Add `clearLocalData()` after `signOut(auth)`
- [x] **Keep local-only tasks (no account)**
  - If user has been using app WITHOUT an account → tasks stay local
  - Only clear local data if user WAS signed in
- [x] **Fix sign-in merge/discard flow**
  - Bug: user chose to "discard local tasks" but they stayed anyway
  - Fix: discard path must call `clearLocalData()`
  - Merge path: upload/merge local tasks into the signed-in account

---

### P1 — Local Tasks in Matrix
- [x] **Matrix missing `reloadLocal` calls** — `app/(tabs)/matrix.tsx`
  - Matrix never called `reloadLocal()` after task create/edit/toggle/drag
  - Fix: destructure `reloadLocal` from `useTasks`, call after all mutations when signed out

---

### P2 — Sign-Out / Merge UI Consistency
- [x] **Replace native Alert sign-out dialog** with a styled modal matching `MergePrompt.tsx`
  - Both screens handle "keep vs discard" local data — should look the same
  - Created `SignOutPrompt.tsx` component with matching theme

---

## Feature Changes

### P1 — Default Group Reorder & Delete
- [ ] **Allow reordering all groups** including the first/default one
  - Verify drag-reorder in `tasks.tsx` doesn't skip the first group
- [ ] **Allow deleting any group** — `components/GroupModal.tsx`
  - Remove any "can't delete first group" restriction
  - Guard: if deleting leaves 0 groups → alert "You need at least one group"
  - When deleting a group with tasks → prompt "Move tasks to [other group] or delete them?"
  - Move orphaned tasks to the first remaining group

---

### P1 — Rename Quadrant Labels
- [ ] **Rename quadrant names** in `lib/types.ts:51-54`
  - Current sublabels: "Do First" / "Schedule" / "Delegate" / "Eliminate"
  - Rename to use "Important" and "Urgent" in names
  - Also update any hardcoded refs in `matrix.tsx` and notification labels

---

### P2 — Archive Mode (Port from Web)
Reference: `TheTaskApp/src/app/archives/page.tsx` (in parent workspace)

- [ ] Add `archived?: boolean` field to Task and TaskGroup in `lib/types.ts`
- [ ] Filter archived items from main task list and group views
- [ ] Add archive/unarchive actions to task menus and group modals
- [ ] Create Archives page — port from web app
  - Archived tasks grouped by group
  - Unarchive button per task and group
  - Greyed out / muted styling
- [ ] Note: web uses `useTasks(uid, true)` to include archived, then filters client-side

---

### P2 — 7-Day Adjustable Filter
- [ ] Add date range filter to task list: Today / 7d / 30d / All
- [ ] Default to 7 days
- [ ] Filter by due date
- [ ] Persist selection in AsyncStorage

---

### P2 — Calendar Group Filter Bug (Web)
- [ ] Fix: `Web Version/` calendar shows all tasks instead of respecting group filter
- [ ] Apply same group filtering as task list

---

## UX Improvements

### P3 — Splash Screen
- [ ] Update splash screen to say "TaskApp" in app font and coloring
- [ ] Remove default Expo splash content
- [ ] Update `app.json` splash config

---

### P3 — Scroll Indicators
- [ ] Add subtle gradient fade at bottom of scrollable task lists
- [ ] Indicates more content below

---

## Already Done / Removed
- ~~Matrix uncategorized drag-down~~ (removed)
- ~~Onboarding screenshots~~ (removed)
- ~~Settings consolidation~~ (already done)
- ~~Dark mode~~ (shipped v1.0.3)
- ~~App review prompts~~ (shipped v1.0.3)
