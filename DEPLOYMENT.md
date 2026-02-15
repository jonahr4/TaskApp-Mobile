# TaskApp Mobile — Deployment & App Store Guide

> From `npx expo start` → your phone → friend's phone → App Store

---

## Table of Contents

1. [Phase 1 — Run on Your Own Device](#phase-1--run-on-your-own-device)
2. [Phase 2 — Share with Friends (TestFlight)](#phase-2--share-with-friends-testflight)
3. [Phase 3 — App Icon & Launch Screen](#phase-3--app-icon--launch-screen)
4. [Phase 4 — App Store Submission](#phase-4--app-store-submission)
5. [Phase 5 — CI/CD (Optional but Recommended)](#phase-5--cicd-optional-but-recommended)
6. [Quick Reference Checklist](#quick-reference-checklist)

---

## Phase 1 — Run on Your Own Device

### Option A: Development Build via Expo Go (what you're doing now)

You're already running `npx expo start` and scanning the QR code with **Expo Go** on your phone. This works for development but has limitations (no custom native modules, no push notification tokens, etc.).

### Option B: Development Build (recommended)

A "dev build" is a custom version of Expo Go that includes your native dependencies. This is the step before production.

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Configure your project (one-time)
eas build:configure
# This creates eas.json and adds bundleIdentifier to app.json

# 4. Build for your device (iOS simulator or device)
eas build --profile development --platform ios

# 5. Or, build locally if you have Xcode installed:
npx expo run:ios --device
```

> **Note:** `npx expo run:ios --device` will auto-detect your connected iPhone via USB and install the dev build.

### Option C: Quick Local Install via Xcode

```bash
# Generate the native iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/mobile.xcworkspace

# In Xcode:
# 1. Select your team under Signing & Capabilities
# 2. Select your connected device as the build target
# 3. Press ▶️ to build and install
```

---

## Phase 2 — Share with Friends (TestFlight)

TestFlight lets up to **10,000 people** install your app without going through App Store review.

### Prerequisites

| Requirement | Cost | How to Get |
|---|---|---|
| Apple Developer Account | $99/year | [developer.apple.com](https://developer.apple.com/programs/) |
| Xcode installed | Free | Mac App Store |
| EAS CLI | Free | `npm install -g eas-cli` |

### Steps

```bash
# 1. Set your bundle identifier in app.json
# Add under "ios":
#   "bundleIdentifier": "com.jonahrothman.taskapp"

# 2. Build for internal distribution (TestFlight)
eas build --platform ios --profile preview

# 3. Submit to TestFlight
eas submit --platform ios
```

After submission (~5–15 min processing):
1. Open **App Store Connect** → Your App → TestFlight tab
2. Add **internal testers** (up to 25, instant access — no review needed)
3. Add **external testers** (up to 10,000 — requires a quick beta review, ~24 hrs)
4. Testers get an email invite → install via the **TestFlight** app

### EAS Configuration

Add to your `eas.json` (created by `eas build:configure`):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      }
    }
  }
}
```

---

## Phase 3 — App Icon & Launch Screen

### App Icon Requirements

Apple requires a **single 1024×1024 PNG** (no transparency, no rounded corners — Apple adds them).

#### Generating the Icon

1. **Design** your icon at 1024×1024 in Figma, Sketch, or any image editor
2. Save as `icon.png` (no alpha channel)
3. Replace `assets/images/icon.png` with your new file

Expo handles all the resizing automatically — you only need **one 1024×1024 file**.

#### What Expo Generates from Your Icon

| Size | Usage |
|---|---|
| 1024×1024 | App Store listing |
| 180×180 | iPhone home screen (@3x) |
| 120×120 | iPhone home screen (@2x) |
| 167×167 | iPad Pro |
| 152×152 | iPad |
| 87×87 | Spotlight (@3x) |
| 80×80 | Spotlight (@2x) |
| 60×60 | Notification (@3x) |
| 40×40 | Notification (@2x) |

#### If You Want Manual Control via Xcode

```bash
# Generate native project
npx expo prebuild --platform ios

# Open in Xcode
open ios/mobile.xcworkspace
```

In Xcode:
1. Open `ios/mobile/Images.xcassets`
2. Click `AppIcon`
3. Drag your 1024×1024 icon into the slot — Xcode fills all sizes

> **Tip:** Use [appicon.co](https://appicon.co) to auto-generate all sizes from one image if you want to fill them manually.

### Splash / Launch Screen

Update `app.json`:

```json
{
  "splash": {
    "image": "./assets/images/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#1a1a2e"
  }
}
```

- `image`: your centered logo/icon (recommend 1284×2778)
- `backgroundColor`: the fill color behind it
- `resizeMode`: `"contain"` (fit) or `"cover"` (fill)

---

## Phase 4 — App Store Submission

### Pre-submission: Update `app.json`

```json
{
  "expo": {
    "name": "TaskApp",
    "slug": "taskapp",
    "version": "1.0.0",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.jonahrothman.taskapp",
      "buildNumber": "1",
      "infoPlist": {
        "NSCalendarsUsageDescription": "TaskApp uses your calendar to add task reminders.",
        "NSUserTrackingUsageDescription": "This app does not track you."
      }
    }
  }
}
```

### Build & Submit

```bash
# Build production binary
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios

# Or do both in one command:
eas build --platform ios --profile production --auto-submit
```

### App Store Connect Preparation

Before your app can go live, you need to fill out these in [App Store Connect](https://appstoreconnect.apple.com):

| Field | What to Provide |
|---|---|
| **App Name** | TaskApp (must be unique on the App Store) |
| **Subtitle** | AI-Powered Task Management |
| **Category** | Productivity |
| **Description** | Your app's full description |
| **Keywords** | tasks, productivity, reminders, eisenhower, AI |
| **Screenshots** | 6.7" (iPhone 15 Pro Max) + 6.1" (iPhone 15 Pro) — at minimum |
| **Privacy Policy URL** | Required — can host on GitHub Pages |
| **Support URL** | Your website or GitHub repo |
| **App Icon** | Auto-uploaded from your build |

### Screenshot Requirements

| Device | Resolution | Required? |
|---|---|---|
| 6.7" (iPhone 15 Pro Max) | 1290×2796 | ✅ Yes |
| 6.1" (iPhone 15 Pro) | 1179×2556 | ✅ Yes |
| 5.5" (iPhone 8 Plus) | 1242×2208 | Optional |
| iPad Pro 12.9" | 2048×2732 | If tablet support |

> **Tip:** Use the iOS Simulator to take perfect screenshots: `⌘+S` in Simulator.

### Review Timeline

- **First submission:** 24–48 hours (sometimes longer)
- **Updates:** Usually 24 hours
- **Common rejection reasons:**
  - Missing privacy policy
  - Crashes on launch
  - Incomplete features / placeholder content
  - Login required but no demo account provided

---

## Phase 5 — CI/CD (Optional but Recommended)

### Do You Need CI/CD?

**Short answer: Not for launch.** EAS Build already handles building in the cloud. CI/CD becomes valuable when:

- You want **automatic builds** on every push to `main`
- You want **automatic TestFlight** deploys for your team
- You have multiple contributors
- You want to run tests before building

### Recommended: EAS + GitHub Actions

This is the simplest CI/CD for Expo apps.

#### `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        run: cd mobile && npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: cd mobile && eas build --platform ios --profile production --non-interactive

      - name: Submit to App Store
        run: cd mobile && eas submit --platform ios --non-interactive
```

#### Setup

1. Get an Expo token: `eas credentials` → copy your token
2. Add it as a GitHub secret: Repo → Settings → Secrets → `EXPO_TOKEN`
3. Push to `main` → auto-builds and submits

### Alternative: Manual Workflow (no CI/CD)

For a solo developer, this is perfectly fine:

```bash
# When you're ready to release an update:
eas build --platform ios --profile production --auto-submit

# That's it. One command.
```

---

## Quick Reference Checklist

### Before First Build

- [ ] Create Apple Developer Account ($99/year)
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Run `eas login`
- [ ] Run `eas build:configure`
- [ ] Set `bundleIdentifier` in `app.json`
- [ ] Design and replace `assets/images/icon.png` (1024×1024)
- [ ] Update splash screen image and background color

### Before App Store Submission

- [ ] Set app `name`, `version`, and `buildNumber` in `app.json`
- [ ] Add required `infoPlist` permission descriptions
- [ ] Create a privacy policy (can be a simple GitHub Pages site)
- [ ] Take screenshots on required device sizes
- [ ] Fill out App Store Connect: name, description, keywords, category
- [ ] Build: `eas build --platform ios --profile production`
- [ ] Submit: `eas submit --platform ios`

### For TestFlight (Share with Friends)

- [ ] Build: `eas build --platform ios --profile preview`
- [ ] Submit: `eas submit --platform ios`
- [ ] Add testers in App Store Connect → TestFlight
- [ ] Friends install **TestFlight** app and accept invite

---

## Commands Cheatsheet

```bash
# Development
npx expo start                                    # Start dev server
npx expo run:ios --device                          # Run on connected iPhone

# Building
eas build --platform ios --profile development     # Dev build
eas build --platform ios --profile preview         # TestFlight build
eas build --platform ios --profile production      # App Store build

# Submitting
eas submit --platform ios                          # Submit latest build

# Combo
eas build --platform ios --profile production --auto-submit  # Build + submit

# Credentials
eas credentials                                    # Manage signing certs
```
