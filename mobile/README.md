# TaskApp Mobile

A full-featured, production-quality task management app built with **React Native** and **Expo**. Combines Eisenhower Matrix prioritization, AI-powered task parsing, smart notifications, calendar integration, and fuzzy search — all wrapped in a polished iOS-native interface.

---

## ✨ Features

### 📋 Tasks

- **Grouped task lists** with custom group names, colors, and reorderable sections
- **Inline task creation** with title, notes, due date/time, priority, and group assignment
- **Drag-and-drop reordering** within and across groups
- **Swipe actions** for quick complete/delete
- **Filters** — status (all / active / completed) and group multi-select
- **Auto-urgent** — tasks automatically escalate to "urgent" when their due date approaches

### 🧠 Eisenhower Matrix

- **Interactive 4-quadrant grid** — Do, Schedule, Delegate, Eliminate
- **Drag-and-drop** tasks between quadrants with haptic feedback
- **Expandable quadrants** — tap to focus one quadrant at 75% screen space
- **Uncategorized tray** — slide-out panel for unprioritized tasks to drag into quadrants
- **Sort & filter** — by due date, creation date, title, or status + group filtering

### 🤖 AI Task Parsing

- **Natural language input** — type "Finish report by Friday at 3pm for Work" and the AI extracts title, due date, time, priority, and group
- **Multi-task generation** — AI can create multiple tasks from a single prompt
- **Full-width inline pickers** — native iOS date picker (calendar) and time picker (spinner)
- **Review & edit** before saving — modify any parsed field before committing

### 📅 Calendar

- **Monthly calendar view** with color-coded task dots by group
- **Day detail panel** — tap a day to see all tasks with priority badges and group tags
- **Task management** — add/edit/complete tasks directly from the calendar
- **Navigation** — swipe between months, quick "Today" button
- **Group filtering** — multi-select dropdown to show/hide groups

### 🔍 Search

- **Fuzzy text search** on task titles and notes (via Fuse.js)
- **Date parsing** — type "September" or "12/5" to find tasks by due date
- **Group search** — type a group name to find all tasks in that group
- **Status filtering** — filter results by all / active / completed
- **Real-time results** with result count

### 📊 Statistics

- **Completion analytics** — tasks over time, completion rates
- **Quadrant distribution** — visual breakdown of task prioritization
- **Productivity insights** — streaks, heatmaps, and trends

### 🔔 Notifications

- **Customizable reminders** — 5 min, 15 min, 30 min, 1 hour, or custom time before due
- **Daily summary** — configurable morning digest of upcoming tasks
- **Smart content** — notifications include group color emoji (🔴🟠🟡🟢🔵🟣), group name, priority, and due time
- **Per-task control** — enable/disable reminders per task

### 📆 Calendar Feed (iCal)

- **Subscribe via webcal://` URL** — tasks appear in Apple Calendar, Google Calendar, etc.
- **Live sync** — feed updates automatically as tasks change
- **Completion indicators** — completed tasks show ✅ in calendar event titles
- **One-tap setup** from onboarding or settings

### 🚀 Onboarding

- **Interactive walkthrough** — swipeable pages introducing each feature
- **One-tap setup actions** — enable notifications and subscribe to calendar feed during onboarding
- **First-launch only** — shown once, then remembered via AsyncStorage

---

## 🏗 Architecture

```
mobile/
├── app/                        # Expo Router file-based routing
│   ├── _layout.tsx             # Root layout (auth gate + tab navigator)
│   ├── index.tsx               # Entry redirect
│   ├── (auth)/                 # Auth screens
│   │   ├── _layout.tsx
│   │   └── login.tsx           # Login / signup screen
│   └── (tabs)/                 # Main tab screens
│       ├── _layout.tsx         # Tab bar configuration
│       ├── tasks.tsx           # Task list (grouped, filterable, draggable)
│       ├── matrix.tsx          # Eisenhower Matrix (4-quadrant grid)
│       ├── ai.tsx              # AI task parsing screen
│       ├── calendar.tsx        # Monthly calendar view
│       ├── templates.tsx       # Search screen (fuzzy + date + group)
│       └── stats.tsx           # Analytics & statistics
│
├── components/                 # Reusable UI components
│   ├── TaskModal.tsx           # Full task editor (create/edit)
│   ├── GroupModal.tsx          # Group create/edit modal
│   ├── GroupFilterDropdown.tsx # Multi-select group filter chip
│   ├── CalendarFeedSheet.tsx   # iCal subscription bottom sheet
│   ├── NotificationSettingsSheet.tsx  # Notification preferences
│   ├── OnboardingScreen.tsx    # First-launch walkthrough
│   └── MergePrompt.tsx        # Cloud ↔ local data merge dialog
│
├── hooks/                      # Custom React hooks
│   ├── useAuth.tsx             # Firebase auth context provider
│   ├── useTasks.ts             # Task CRUD with local + cloud sync
│   ├── useTaskGroups.ts        # Group CRUD with local + cloud sync
│   ├── useSync.ts              # Bidirectional Firestore ↔ AsyncStorage sync
│   └── useAutoUrgent.ts        # Auto-escalate tasks approaching due date
│
├── lib/                        # Core libraries
│   ├── types.ts                # TypeScript types (Task, TaskGroup, Quadrant)
│   ├── theme.ts                # Design tokens (colors, spacing, radius, fonts)
│   ├── firebase.ts             # Firebase app initialization
│   ├── firestore.ts            # Firestore queries & calendar token management
│   ├── crud.ts                 # Unified CRUD (local-first, cloud-synced)
│   ├── localDb.ts              # AsyncStorage persistence layer
│   └── notifications.ts        # Notification scheduling & management
│
└── assets/
    └── images/                 # App icon, splash screen, favicon
```

### Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   UI Layer  │ ──▶ │  Custom Hooks    │ ──▶ │  CRUD Layer    │
│  (Screens)  │ ◀── │  (useTasks, etc) │ ◀── │  (crud.ts)     │
└─────────────┘     └──────────────────┘     └────────────────┘
                                                   │      │
                                              ┌────▼──┐ ┌─▼──────────┐
                                              │ Local │ │  Firestore │
                                              │ (AS)  │ │  (Cloud)   │
                                              └───────┘ └────────────┘
```

**Local-first:** Tasks are written to AsyncStorage immediately for instant UI, then synced to Firestore in the background. On app launch, `useSync` merges local and cloud data, resolving conflicts by `updatedAt` timestamp.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.81 + Expo SDK 54 |
| **Routing** | Expo Router (file-based) |
| **State** | React hooks + `useMemo` / `useCallback` |
| **Animations** | React Native Reanimated 4 |
| **Gestures** | React Native Gesture Handler |
| **Auth** | Firebase Authentication (Email/Password, Google) |
| **Database** | Cloud Firestore (real-time sync) |
| **Local Storage** | AsyncStorage (offline-first) |
| **Search** | Fuse.js (fuzzy matching) |
| **Notifications** | expo-notifications (local scheduling) |
| **Haptics** | expo-haptics |
| **Maps** | react-native-maps (location-based reminders) |
| **Language** | TypeScript 5.9 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Expo CLI**: `npm install -g expo-cli` (optional, `npx expo` works too)
- **Xcode** (for iOS simulator/device builds)
- **Expo Go** app on your iPhone (for quick testing)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/TaskApp-Mobile.git
cd TaskApp-Mobile/mobile

# Install dependencies
npm install
```

### Environment Setup

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` with your Firebase project credentials:

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# AI API (your deployed web app endpoint)
EXPO_PUBLIC_AI_API_URL=https://your-app.vercel.app/api/ai/parse
```

### Running Locally

```bash
# Start the dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on physical device (scan QR with Expo Go)
npx expo start
# → Scan the QR code with your iPhone camera
```

---

## 📱 Screens Overview

| Tab | Screen | Description |
|---|---|---|
| 📋 | **Tasks** | Grouped task list with drag-drop, filters, inline editing |
| 🧠 | **Matrix** | 4-quadrant Eisenhower grid with drag-and-drop prioritization |
| 🤖 | **AI** | Natural language → structured tasks with AI parsing |
| 📅 | **Calendar** | Monthly view with color-coded dots and day detail panel |
| 🔍 | **Search** | Fuzzy search across titles, notes, dates, and groups |
| 📊 | **Stats** | Completion analytics, streaks, and productivity charts |

---

## 🎨 Design System

All styling uses a centralized token system defined in `lib/theme.ts`:

### Colors

| Token | Light | Dark |
|---|---|---|
| `bg` | `#f2f3f7` | `#0f0f0f` |
| `bgCard` | `#ffffff` | `#1a1a1a` |
| `accent` | `#4f46e5` (indigo) | `#6366f1` |
| `danger` | `#ef4444` | `#f87171` |
| `success` | `#22c55e` | `#4ade80` |

### Spacing Scale

`xs: 4` → `sm: 8` → `md: 12` → `lg: 16` → `xl: 20` → `xxl: 24` → `xxxl: 32`

### Border Radius

`sm: 6` → `md: 10` → `lg: 14` → `xl: 20` → `full: 9999`

### Font Sizes

`xs: 11` → `sm: 13` → `md: 15` → `lg: 17` → `xl: 20` → `xxl: 24` → `title: 28`

---

## 🔐 Authentication

Firebase Auth with email/password and Google Sign-In. Auth state is managed via `useAuth` context provider in `hooks/useAuth.tsx`.

```
Unauthenticated → (auth)/login.tsx
Authenticated   → (tabs)/_layout.tsx → Tab screens
```

The root `_layout.tsx` handles the auth gate: if no user, redirect to login; otherwise, show the tab navigator.

---

## 💾 Data Model

### Task

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `title` | `string` | Task name |
| `notes` | `string?` | Optional description |
| `urgent` | `boolean \| null` | Urgency flag (null = unprioritized) |
| `important` | `boolean \| null` | Importance flag (null = unprioritized) |
| `dueDate` | `string \| null` | `YYYY-MM-DD` format |
| `dueTime` | `string \| null` | `HH:MM` format |
| `groupId` | `string \| null` | Reference to TaskGroup |
| `autoUrgentDays` | `number \| null` | Days before due to auto-mark urgent |
| `location` | `string?` | Location for geo-reminders |
| `completed` | `boolean` | Completion status |
| `order` | `number` | Sort position within group |
| `createdAt` | `Timestamp` | Firestore timestamp |
| `updatedAt` | `Timestamp` | Firestore timestamp |

### TaskGroup

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `name` | `string` | Group display name |
| `color` | `string \| null` | Hex color for dots/badges |
| `order` | `number` | Sort position |
| `createdAt` | `Timestamp` | Firestore timestamp |

### Quadrant Mapping

| Urgent | Important | Quadrant |
|---|---|---|
| ✅ | ✅ | **DO** (Important & Urgent) |
| ❌ | ✅ | **SCHEDULE** (Important & Not Urgent) |
| ✅ | ❌ | **DELEGATE** (Urgent & Not Important) |
| ❌ | ❌ | **DELETE** (Not Important or Urgent) |
| `null` | any | **Uncategorized** |

---

## 📂 Key Files Reference

| File | Purpose |
|---|---|
| `lib/crud.ts` | Unified create/update/delete — writes local + cloud |
| `lib/localDb.ts` | AsyncStorage read/write for offline-first persistence |
| `lib/firestore.ts` | Firestore queries, calendar token CRUD |
| `lib/notifications.ts` | Schedule/cancel reminders, daily summaries, color emoji mapping |
| `lib/types.ts` | All TypeScript types and quadrant logic |
| `hooks/useSync.ts` | Bidirectional sync engine (local ↔ Firestore) |
| `components/TaskModal.tsx` | Full-featured task editor (43KB — the largest component) |
| `components/NotificationSettingsSheet.tsx` | Notification preferences with custom time input |

---

## 📦 Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for the full guide covering:

- Running on your device (Expo Go, dev builds, Xcode)
- Sharing with friends via TestFlight
- App icon and splash screen setup
- App Store submission
- CI/CD with GitHub Actions + EAS

---

## 🧪 Development Tips

### Hot Reload

The dev server supports fast refresh. Save any file and the app updates instantly.

### Debugging

```bash
# Open React DevTools
npx expo start --dev-client

# Shake device → "Open Debugger" for Chrome DevTools
```

### Common Issues

| Issue | Fix |
|---|---|
| Metro bundler cache | `npx expo start --clear` |
| Pod install errors | `cd ios && pod install --repo-update` |
| Missing env vars | Check `.env` file exists and matches `.env.example` |
| Firestore permission denied | Check Firebase console security rules |

---

## 📄 License

This project is private and not licensed for redistribution.
