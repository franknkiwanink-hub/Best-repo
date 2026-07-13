# Siterifty — Next.js migration

> **Stack: Next.js 15 + React 19.** This project targets Next.js 15 (not 14) —
> upgraded deliberately for SEO and because `fetch()` is no longer cached by
> default in Server Components/Route Handlers (opt IN with `cache: 'force-cache'`
> when you want caching, instead of opting out). If you're an AI picking this
> project up, do not scaffold or suggest Next.js 14 patterns/APIs. `params`/
> `searchParams` in Server Components are async (`Promise`-based) in this
> version — await them, don't destructure synchronously. Client-side
> `fetch()` calls in `"use client"` hooks (all current data fetching in this
> repo) are unaffected by either version's caching default.

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
- Next.js 15, App Router, TypeScript
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

**Step 3 — Marketplace grid (this step):**
- `app/api/_lib/limits.js`, `app/api/_lib/storage.js` — copied from the
  original `api/limits.js` / `api/storage.js` unchanged, shared by any
  route that needs them (currently just listings)
- `app/api/listings/_handler.js` + `route.ts` — your original
  `api/listings.js` ported the same way as `account` (byte-for-byte copy,
  only its two relative imports repointed to `_lib/`; adapter translates
  Vercel's `(req,res)` shape to a Next.js route handler). Only `POST` is
  wired since the original API is POST-only even for reads (action-based
  dispatch: `listing.feed`, `.mine`, `.create`, etc. — see that file's
  top-of-file comment block for the full list). Only `listing.feed` has a
  client caller wired up so far.
- `lib/listings.ts` — `Listing` type (superset covering website/app/game
  fields, since the feed returns raw Firestore docs), `fetchFeed()`,
  `trackListing()` (impression/view beacon), and formatting helpers
  (`fmtPrice`, `fmtFinVal`, `isBoosted`, `isPremiumSeller`) ported from
  marketplace.js
- `lib/useFeed.ts` — React hook wrapping `fetchFeed`, handling the
  seed/cursor pagination contract (seed generated server-side on first
  call, echoed back verbatim on every subsequent page/reset)
- `lib/useSeller.ts` — **lightweight** seller lookup (username/profilePic/
  rating only, single `getDoc`) for the card strip. Deliberately NOT a
  port of `mpGetSeller`, which also fetches the seller's listings,
  follower count, and lifetime deals for the full profile popup — that's
  heavier and belongs to a future "seller profile modal" step
- `components/marketplace/`: `Stars`, `SellerStrip`, `SaveButton` (direct
  Firestore writes, optimistic UI + revert-on-failure, same as
  `mpToggleSave`), `SiteCard`, `AppCard`, `GameCard` (all three ported
  1:1 from `mpRenderCard`'s three template branches), `ListingCard`
  (type dispatcher)
- `app/marketplace/page.tsx` — real grid wired to `useFeed`, with loading/
  empty/error states matching the original's `mp-state` markup, and an
  `IntersectionObserver`-based infinite scroll sentinel (`rootMargin:
  '200px'`, same as `_setupSentinel`). Clicking a card opens a bare
  placeholder modal (not the real listing detail/seller modals yet) just
  so the click wiring is visibly testable.
- Trust badges (`sellerBadgesHtml` — verified checkmarks, deal-tier badge)
  are NOT shown on cards yet since they need the heavier seller data
  `useSeller` deliberately doesn't fetch. `_srBadgeCluster` (boosted-listing
  badge) was confirmed a genuine no-op in the original source (its own
  comment says "Badges disabled — CSS missing, causes layout breakage") so
  it was not ported at all, not even as a stub.

## What's NOT done yet (later steps)

- Listing detail modal (`mpOpenModal` equivalent) and seller profile popup
  (`mpOpenSellerModal` equivalent) — currently bare placeholders on the
  marketplace page, not the real modal UI/content
- Trust badge cluster on cards (verified checkmarks, deal-tier badge) —
  needs the heavier seller-data fetch `useSeller` intentionally skips
- Search/filter chips, boosted row, premium sellers strip, ad slots,
  seller-promo/AI-promo interstitial cards — all present in the original
  `mpRenderCards`/marketplace page but not yet ported
- OAuth onboarding modal (username/avatar setup for new Google/GitHub
  users) — `AuthModalProvider`'s `onNewOAuthUser` callback is wired but
  empty
- "Welcome back" screen, banned/suspended account overlay, admin flag —
  these read more fields from the user doc than Step 2 brought over
- Live listings count in the nav drawer (currently shows "—" rather than a
  fabricated 0, matching the original's own "don't fabricate a number" policy)
- Plan badge and unread-message action slot in the announcement bar
- Other `/api/*.js` routes (paypal, deal, admin, webhooks, aistudio, push,
  objectives, edit-file) not yet ported — only `account` and `listings`
  (partial — `listing.feed` only) are done
- No content in the other route placeholder pages yet (listing/[id],
  seller/[id], sell, profile, myprofile, settings, messages, etc.)

## Notes

- Header/NavDrawer/AnnouncementBar are siblings of `<main>` in `app/layout.tsx`,
  matching the original — the original code has comments warning that nesting
  modals inside `<main>` breaks z-index stacking, so this is preserved deliberately.
- All original element `id`s were kept as-is in the ported markup so future JS
  logic (event handlers, DOM queries) can be ported without renaming lookups.
- `app/api/account/_handler.js` and `app/api/listings/_handler.js` are direct
  copies of the old `api/account.js` / `api/listings.js`. If you need to
  change what an action actually does, edit `_handler.js` — `route.ts` is
  only a request/response format adapter. This adapter pattern is the
  template for porting the rest of `/api/*.js`: copy the file into
  `app/api/<name>/_handler.js`, fix any relative imports to point at
  `app/api/_lib/`, then copy an existing `route.ts` and swap the import.
