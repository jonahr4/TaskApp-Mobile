# E2E tests (Playwright, via Expo web)

Browser end-to-end tests for TheTaskApp mobile, driven through its **Expo
web build** in Chromium against the real Firebase backend, signed in as a
**dedicated dummy account** — never a personal account.

## One-time setup

1. Create (or reuse) a dummy Firebase Auth email/password account in the
   Firebase project the app points at. It only ever touches its own
   per-user task data.
2. Export its credentials (never commit them):

   ```bash
   export E2E_TEST_EMAIL="taskapp-e2e-dummy@example.com"
   export E2E_TEST_PASSWORD="..."
   ```

3. Export the Expo public env the web build needs (same values as the
   app's normal `.env`):

   ```bash
   export EXPO_PUBLIC_FIREBASE_API_KEY=...
   export EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   export EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   export EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   export EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   export EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

4. Install dependencies and browsers once:

   ```bash
   npm install
   npx playwright install chromium
   ```

## Running

```bash
npm run test:e2e            # builds the web bundle and serves it locally
```

Against a hosted web build instead of a local one:

```bash
PLAYWRIGHT_BASE_URL=https://<hosted-web-build> npm run test:e2e
```

Useful flags: `--headed` (watch it run), `--debug`, `-g "auto-urgent"`
(run one spec), `--reporter=html`.

## What is covered (mirrors the web suite's cases)

| Spec | Cases |
|---|---|
| `auth.spec.ts` | invalid credentials error, unauthenticated redirect to `/login`, signup-mode toggle, sign out |
| `tasks.spec.ts` | create (title-only and all fields), edit title, complete/uncomplete, title-required validation |
| `auto-urgent.spec.ts` | trigger date passed → becomes urgent ("Do First"); trigger in future → stays |
| `groups.spec.ts` | create list, assign task to it |
| `matrix.spec.ts` | task renders on the matrix with its priority badge; editing priority updates the badge |
| `calendar.spec.ts` | task due today renders on the calendar; tapping opens the editor |

Auth runs once (`auth.setup.ts`) and every spec reuses the saved session.

## Test hygiene

- Task/list titles are timestamped per run (`uniqueTitle`) so repeated runs
  never collide.
- The suite runs with a single worker because specs share one dummy
  account backed by Firestore.

## Test IDs

A handful of `testID` props were added to make the suite reliable
(`app/(tabs)/tasks.tsx`: `fab`, `fab-new-task`, `fab-new-list`,
`task-row`, `group-add-task`; `components/ScreenHeader.tsx`:
`profile-menu`). They render as inert `data-testid` attributes and do not
change app behavior.

## Known limitations (not covered)

- **Delete flows** (`tasks`, list deletion): the app confirms via
  `Alert.alert`, which React Native Web does not implement, so the dialog
  never appears on web. The delete test is `test.skip`ped; un-skip it once
  the app uses a web-safe confirmation dialog.
- **Cleanup**: because deletion is unavailable on web, created tasks are
  left on the dummy account (unique titles keep runs independent).
- Google/Apple OAuth sign-in.
- Push notifications (`expo-notifications` is stubbed no-op on web).
- First-run onboarding / merge prompts are dismissed best-effort; the
  suite assumes a fresh browser profile.
- Future-date calendar navigation is gesture-driven; the calendar test
  uses a task due today.

## CI

`.github/workflows/e2e.yml` runs the suite on manual dispatch
(`workflow_dispatch`). Add these repository secrets before running:

- `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`
- `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`,
  `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`
