<p align="center">
  <img src="assets/images/Icon-iOS-Default-white-1024x1024@1x.png" width="120" alt="TaskApp Icon" />
</p>

<h1 align="center">TaskApp</h1>

<p align="center">
  <strong>AI-Powered Task Manager for iOS</strong><br/>
  Built with React Native & Expo
</p>

<p align="center">
  <a href="https://apps.apple.com/app/the-task-app/id6759473470">
    <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="50" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-iOS-blue?logo=apple" alt="Platform" />
  <img src="https://img.shields.io/badge/react_native-0.76-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/expo-52-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/firebase-11-FFCA28?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Assistant** | Type tasks in plain English — AI creates them with smart dates, priorities, and descriptions. |
| 📊 **Eisenhower Matrix** | Drag-and-drop prioritization into Do First, Schedule, Delegate, and Eliminate quadrants. |
| 📅 **Calendar View** | Visual calendar with color-coded priority dots for every due date. |
| 🔍 **Smart Search** | Instantly find any task. Filter by active, completed, or keyword. |
| 📱 **Home Screen Widgets** | Today Dashboard, Next Task, and AI Quick Action widgets. |
| 🎙️ **Voice Input** | Speak your tasks — AI transcribes and creates them. |
| ☁️ **Cloud Sync** | Tasks sync to Firebase and are accessible from any device via the [web app](https://the-task-app.vercel.app). |
| 📁 **Groups** | Organize tasks by class, project, or area of life. |
| 🔔 **Smart Notifications** | Configurable reminders with custom scheduling. |
| 🌗 **Dark Mode** | Full dark mode support with automatic system detection. |

> 100% free — no ads, no subscriptions, no in-app purchases.

---

## 📱 Screenshots

<p align="center">
  <em>Tasks • AI Assistant • Eisenhower Matrix • Calendar • Search • Widgets</em>
</p>

<!-- Replace with your actual App Store screenshots -->
<!-- <p align="center">
  <img src="screenshots/tasks.png" width="180" />
  <img src="screenshots/ai.png" width="180" />
  <img src="screenshots/matrix.png" width="180" />
  <img src="screenshots/calendar.png" width="180" />
  <img src="screenshots/search.png" width="180" />
</p> -->

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 52) |
| **Navigation** | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| **Backend** | [Firebase](https://firebase.google.com/) (Firestore, Auth) |
| **AI** | [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) (GPT-4o) |
| **Auth** | Google Sign-In via `@react-native-google-signin` |
| **Widgets** | Native iOS WidgetKit (Swift) |
| **Build** | [EAS Build](https://docs.expo.dev/build/introduction/) |
| **Language** | TypeScript |

---

## 🏗 Architecture

```
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/             # Auth screens (login)
│   ├── (tabs)/             # Main tab screens
│   │   ├── tasks.tsx       # Task list with groups and sorting
│   │   ├── matrix.tsx      # Eisenhower Matrix with drag-and-drop
│   │   ├── calendar.tsx    # Calendar view with task dots
│   │   ├── ai.tsx          # AI tab
│   │   ├── stats.tsx       # Analytics and statistics
│   │   └── settings.tsx    # App settings
│   └── _layout.tsx         # Root layout with auth guard
├── components/             # Reusable UI components
│   ├── AiFab.tsx           # AI Assistant floating action button & modal
│   ├── TaskModal.tsx       # Task creation/editing modal
│   ├── ScreenHeader.tsx    # Unified header component
│   └── ...
├── hooks/                  # Custom React hooks
│   ├── useAuth.tsx         # Firebase authentication
│   ├── useTasks.ts         # Task CRUD operations
│   ├── useTaskGroups.ts    # Task group management
│   └── useSync.ts          # Cloud sync logic
├── lib/                    # Shared utilities
│   ├── firestore.ts        # Firebase Firestore operations
│   ├── theme.ts            # Design tokens and color system
│   └── sharedStyles.ts     # Shared style definitions
├── ios/                    # Native iOS project
│   ├── TaskApp/            # Main app target
│   └── TaskAppWidgets/     # WidgetKit extension (Swift)
└── assets/                 # Images, fonts, and icons
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Xcode 15+ (for iOS builds)
- Firebase project with Firestore and Auth enabled

### Setup

```bash
# Clone the repo
git clone https://github.com/jonahr4/TaskApp-Mobile.git
cd TaskApp-Mobile

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Fill in your Firebase and Azure OpenAI credentials

# Start the dev server
npx expo start

# Run on iOS simulator
npx expo run:ios
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_AI_API_URL` | AI API endpoint URL |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In iOS client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In web client ID |

---

## 🌐 Web Version

TaskApp also has a companion web app built with Next.js, available at [the-task-app.vercel.app](https://the-task-app.vercel.app). Tasks sync in real-time between mobile and web via Firebase.

---

## 📄 License

MIT © [Jonah Rothman](https://github.com/jonahr4)
