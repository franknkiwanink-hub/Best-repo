# Siterifty — Next.js migration

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000

**Only 4 env vars needed** (down from 11) — the public Firebase client config
is hardcoded directly in `lib/firebase.ts` since those values aren't secret
(they're visible in any browser's dev tools on a live Firebase web app
regardless). Only the real secrets — Firebase Admin SDK credentials, used
server-side in `app/api/account` — need to be set as env vars:

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
ADMIN_EMAIL=
```

These are the same values your old Vercel deployment already has set —
copy them from Vercel dashboard → your project → Settings → Environment Variables.
Keep the `\n` escapes in `FIREBASE_PRIVATE_KEY` literal (don't convert to
real newlines) — the code converts them at runtime.

Without these 4 set, the site will build and load fine, but login/signup
(anything touching `app/api/account`) will fail until they're added.

If `npm run dev` throws any error, copy the full error message back to Claude —
this scaffold was hand-written (no network access in the build sandbox to run
`npm install` and verify), so there may be a small mismatch to fix on first run.

## What's done

**Step 1 — scaffold:**
- Next.js 14, App Router, TypeScript
- `app/globals.css` — your full `styles/siterifty.css` copied in unchanged
- Layout shell as real components (Header, NavDrawer, BottomNav, AnnouncementBar)
- `lib/firebase.ts` — Firebase client init as a real module, replacing `window.__db`
- Real routes replacing the old `vercel.json` rewrites (placeholder content):
  `/marketplace`, `/settings`, `/myprofile`, `/profile`, `/sellers`, `/messages`,
  `/messages/deal/[id]`, `/messages/group/[id]`, `/aiagent`, `/leaderboard`, `/sell`,
  `/seller/[id]`, `/listing/[id]`

**Step 2 — Auth modal (this step):**
- `lib/AuthContext.tsx` — replaces `window.__fbUser` / `window.__authReady` /
  `__syncUserSession` with real React state (`useAuth()` hook), backed by
  `onAuthStateChanged` + a live Firestore `onSnapshot` on `users/{uid}`
  (upgraded from the old one-time `getDoc`, so wallet balance/plan update live)
- `lib/authActions.ts` — replaces `window.__doLogin` / `__doSignup` / `__doGoogle` /
  `__doGithub` / `__doForgot` / `__doLogout` as plain importable functions
- `components/auth/AuthModal.tsx` — full login/signup UI (email+password,
  Google, GitHub, forgot password, username validation, avatar picker),
  same markup/styling as the original, driven by React state instead of
  `getElementById`
- `components/auth/AuthModalProvider.tsx` — lets any component open the
  modal via `useAuthModal().openAuthModal()`
- `app/api/account/route.ts` + `_handler.js` — your original `api/account.js`
  copied byte-for-byte (all 6 actions: ensureAccount, amIAdmin, setPrivacy,
  revokeApiKey, notifyOnRestore, submitAppeal) with a thin adapter so it runs
  under Next.js's route handler signature. Account creation still happens
  server-side only, exactly as the original comments require — the client
  can never set its own `walletBalance`/`plan`.
- Header and NavDrawer now show real logged-in/out state, real avatar,
  wallet balance, and plan; login button opens the modal; logout button works

## What's NOT done yet (later steps)

- OAuth onboarding modal (username/avatar setup for new Google/GitHub users) —
  `AuthModalProvider`'s `onNewOAuthUser` callback is wired but empty
- "Welcome back" screen, banned/suspended account overlay, admin flag —
  these read more fields from the user doc than Step 2 brought over
- Live listings count in the nav drawer (currently shows "—" rather than a
  fabricated 0, matching the original's own "don't fabricate a number" policy)
- Plan badge and unread-message action slot in the announcement bar
- No listings/marketplace data fetching
- Other `/api/*.js` routes (listings, paypal, webhooks, etc.) not yet ported
- No content in the route placeholder pages yet

## Notes

- Header/NavDrawer/AnnouncementBar are siblings of `<main>` in `app/layout.tsx`,
  matching the original — the original code has comments warning that nesting
  modals inside `<main>` breaks z-index stacking, so this is preserved deliberately.
- All original element `id`s were kept as-is in the ported markup so future JS
  logic (event handlers, DOM queries) can be ported without renaming lookups.
- `app/api/account/_handler.js` is a direct copy of your old `api/account.js`.
  If you need to change what ensureAccount/amIAdmin/etc. actually do, edit
  that file — `route.ts` is only a request/response format adapter.

## Notes

- Header/NavDrawer/announcement-bar are siblings of `<main>` in `app/layout.tsx`,
  matching the original — the original code has comments warning that nesting
  modals inside `<main>` breaks z-index stacking, so this is preserved deliberately.
- All original element `id`s were kept as-is in the ported markup so future JS
  logic (event handlers, DOM queries) can be ported without renaming lookups.
