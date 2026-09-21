# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

中臺科技大學機器人研究社 official website. Next.js 16 (App Router) + React 19 + TypeScript, mid-migration from Firebase to Supabase. UI/copy is bilingual (zh-TW default, en).

> **Keep this file current.** When a change lands that alters anything documented here — architecture, data backends, the Supabase schema, commands, conventions, deployment, or env vars — update the relevant section in the same piece of work. Treat CLAUDE.md as part of the change, not an afterthought. If a change makes a statement here wrong, fix it; if it adds a new durable rule or gotcha, add it (concisely — keep this file lean).

## Commands

Package manager is **pnpm** (not npm).

```bash
pnpm install
pnpm dev      # next dev — http://localhost:3000
pnpm build    # next build
pnpm start    # serve production build
```

- **`pnpm lint` (`next lint`) is broken** and also deprecated in Next 16. For verification use `npx tsc --noEmit` for type-checking plus a dev-server SSR smoke test. There is no test suite.
- No `.env.example` exists yet. Local dev needs Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), Firebase keys (`NEXT_PUBLIC_FIREBASE_*` + admin SA), and `NEXT_PUBLIC_ADMIN_EMAIL`.

## Deployment
- Hosted on **Vercel** (project is already linked — `.vercel/` exists). `vercel.json` only pins `regions: ["bom1"]` (Mumbai, same region as Supabase) so server renders and API routes sit next to the DB; otherwise Vercel's default Next.js build is used. Middleware is **not** governed by `regions` — it runs near the visitor — so keep network calls out of it.
- `pnpm deploy` runs `vercel --prod` for a manual production deploy. Pushing to the connected git branch also triggers Vercel's normal build/deploy.
- Environment variables live in the **Vercel project settings** (and locally in `.env`), not in the repo. When adding a new env var, remember it must be set in Vercel too or the production build will break.
- One-off data/migration scripts live in `scripts/` (e.g. `migrate-posts-to-supabase.ts`); they are run manually, not part of the build.

## Architecture

### Routing & i18n
- All pages live under `app/[locale]/`. Locales are `zh-TW` (default, no URL prefix) and `en` (`/en/...`). Config in `i18n/routing.ts`; translations in `messages/{zh-TW,en}.json`.
- **Adding/editing copy:** every string key MUST exist in **both** `messages/zh-TW.json` and `messages/en.json` with the same key path — a key present in only one locale will break the other. Read strings via `next-intl` (`useTranslations` / `getTranslations`), never hard-code user-facing text in components.
- **Use the locale-aware navigation from `i18n/navigation.ts`** (`Link`, `useRouter`, `usePathname`, `redirect`) — not `next/link` / `next/navigation` directly — so locale prefixing stays correct.
- `middleware.ts` is intentionally subtle: it chains custom geo/language redirect logic, `next-intl` middleware, and Supabase session refresh. `localeDetection` is off in next-intl; human geo-routing is done manually in middleware. **Search-engine/social bots are deliberately exempted from all redirects** (via `BOT_UA_REGEX`) to keep canonical per-locale URLs indexable — preserve this when touching middleware. API routes (`/api/*`) skip locale routing and only refresh the session.

### Data backends (migration in progress)
- **Supabase** is the primary backend: auth (Email + Google OAuth), PostgreSQL with Row Level Security, the user/profile/course/follow/schedule data. Services: `courseService.ts`, `profileService.ts`, `userService.ts`, `followService.ts`, `scheduleService.ts`.
- **Firebase** is legacy, still serving some data while being migrated out: `competitionService.ts`, parts of `postService.ts`, `firebaseService.ts`. Prefer Supabase for new work.
- **Static media** (activity photos etc.) lives on **Cloudflare R2**, served from `https://img.robotctust.com` (`SITE_CONFIG.mediaBase`; the host is whitelisted in `next.config.ts` `remotePatterns` and images go through `next/image`). Keys mirror usage: `home/about-hook/NN.webp`, `about/activity/NN.webp`. Upload manually with `wrangler r2 object put <bucket>/<key> --remote --file … --content-type image/webp --cache-control "public, max-age=31536000, immutable"` — `--remote` is required (wrangler defaults to a local simulator). Objects are immutable-cached, so **replace an image by uploading a new filename**, never by overwriting.
- **Firebase security rules** (`firestore.rules`, `storage.rules`, `database.rules.json`) in the repo are reference copies only — the maintainer edits the live rules **directly in the Firebase Console**, not by deploying these files. Do not assume the repo files are authoritative or deploy them; if rules need changing, instruct the user to update them in the Console.

### Rendering & caching (public pages must stay static)
All public pages (home, about, news, calendar, competitions, docs, contact, privacy, terms…) are prerendered (`●` in `next build`) and served from Vercel's CDN; only per-user pages (courses, profile, login, onboarding, settings, dashboard) are dynamic. Caching breaks **silently** — no build error, the page still renders — so after touching a public page run `pnpm build` and confirm it is still `●`, not `ƒ`. Rules:
- Every page and `generateMetadata` in `[locale]/layout.tsx` calls `setRequestLocale(locale)`; a public page whose server components use `useTranslations`/`getLocale` must call it too, or next-intl reads `headers()` and the page goes dynamic.
- Public pages must not call `cookies()`/`headers()` or read `searchParams` on the server. Read data with `createPublicClient()` or `createAdminClient()` (neither touches cookies).
- Pages with DB data set `export const revalidate = 300`, and dashboard writes clear them on demand. `revalidatePath` must use the route pattern (`revalidatePath('/[locale]/news', 'page')`) — a literal URL like `'/news'` misses zh-TW, which is internally rewritten to `/zh-TW/news`. See `app/action/revalidate.ts`.

### Supabase clients (pick the right one)
- `app/utils/supabase/client.ts` — browser/client components.
- `app/utils/supabase/server.ts` — server components/route handlers; uses the publishable (anon) key, **respects RLS**.
- `app/utils/supabase/public.ts` — `createPublicClient()`: publishable key, **no cookies**, acts as an anonymous visitor under RLS. Use it for public data on public pages; `server.ts` reads `cookies()` and forces the whole page dynamic.
- `app/utils/supabase/admin.ts` — `createAdminClient()` uses the service-role key and **bypasses RLS**. Server-only, never import into client code.
- `app/utils/supabase/middleware.ts` — `updateSession()` session-cookie refresh used by `middleware.ts`. Uses `getClaims()` (JWT is asymmetric ES256, verified locally against cached JWKS), not `getUser()`, so middleware makes no network call per request; server code that must confirm the account is still valid calls `getUser()` itself.

### Supabase database (schema & change policy)
Project **Robot CTUST** (ref `fdejhtwkvqrccnnpivwa`, ap-south-1, Postgres 17). **Every `public` table has RLS enabled.** Inspect the live schema with the Supabase MCP tools (`list_tables`, `list_migrations`, etc.) before relying on this summary — it can drift.

**Mandatory workflow for any DB-touching work:**
1. **Before** writing or changing any feature that reads/writes the database, confirm the current Supabase schema (tables, columns, RLS policies, triggers) via the Supabase MCP — do not code against assumptions.
2. **Any change to database structure or settings** — creating/altering/dropping tables, columns, indexes, RLS policies, triggers, functions, extensions, or project config — **requires the user's explicit approval before execution.** Propose the change and wait for a clear yes; never run `apply_migration` / DDL on your own initiative.

Schema changes are tracked as Supabase migrations (latest: `add_follows_feature`). Tables by domain:
- **Identity & social:** `users` (PK = `auth.users.id`; `roles text[]`, `club_identity`, `school_identity`; `username`/`student_id` unique), `user_stats` (`exp`, `level` — gamification), `follows` (composite PK `follower_id`+`following_id`).
- **Courses/learning (normalized hierarchy):** `semesters` → `chapters` → `courses` → `course_contents` (a content block; `type` + `content`, optional `program_id`); `programs` (reusable code snippets: `language` + `code_content`); `course_verifications` (`status`, `approved_at`, `verified_by`); `semester_members` (per-semester student-id roster).
- **Achievements:** `achievements` (`required_exp`), `user_achievements`.
- **Content & calendar:** `posts` (markdown, `category`, `author_id`), `schedule_events` (`type` ∈ class/competition/activity/event/school-event, `semester_id`, `published`).

### Authorization (read before touching admin/dashboard code)
- Users hold an **array of roles** (`super_admin`, `admin`, per-module admins like `admin_course`/`admin_news`/`admin_accounts`/..., and `member`). The single source of truth for role logic is `app/utils/auth/roles.ts` — always go through `normalizeRoles`, `isAdminRole`, `getAssignableRoles`, `canManageTargetUser` rather than comparing role strings inline.
- Client-side auth state: `app/contexts/AuthContext.tsx` (`useAuth()`).
- **Critical invariant:** `/api/dashboard/*` route handlers use the service-role admin client, which bypasses the DB's `prevent_role_escalation` trigger and RLS. Therefore every dashboard route MUST enforce authorization in code — call `requireDashboardAccess(module)` from `app/utils/dashboard/auth.ts` and validate role-assignment boundaries (`getAssignableRoles` / `canManageTargetUser`) before any write. Do not rely on the DB or frontend to gate these.

### API routes
- `app/api/dashboard/*` — admin console operations (courses, members, accounts, news, calendar, verifications). Service-role + in-code authz as above.
- `app/api/mobile/*` — JSON endpoints for the companion iOS app (`posts`, `events`, `me`).
- `app/api/courses/[slug]/verify` — course completion verification submissions.

### Course/achievement system
The course system is normalized PostgreSQL (semester → chapter → course → content blocks → code programs) with `order_index` ordering and `is_published` drafting. EXP/achievements are awarded **only via Supabase DB triggers** on verification approval — never grant EXP from the frontend. Background and schema in `PROJECT.md` and `supabase-setup.md`.

## Conventions
- **Path alias:** `@/*` maps to repo root (e.g. `@/app/utils/...`).
- **Styling:** SCSS Modules are primary (`Component.module.scss`), Tailwind v4 is auxiliary. Shared tokens/mixins in `app/styles/_colors.scss` and `_mixins.scss`.
- **Feature-based component folders:** a page's local UI lives in a `ui/` subfolder beside it, each component in its own dir (`about/ui/ClubOfficer/ClubOfficer.tsx` + `ClubOfficer.module.scss`). Cross-page shared components go in `app/components/`.
- TypeScript types live in `app/types/`; keep new features typed there.
- Comments in this codebase are written in Traditional Chinese; match the surrounding style.

## Commit & versioning workflow
- **One commit = one feature or fix.** Don't batch unrelated work; split unrelated changes (e.g. copy/contact info vs. a page redesign) into separate commits. Related docs (this file, `messages/*`) go in the same commit as the change.
- **Claude never runs `git add` / `git commit`.** When a piece of work is finished and verified (`npx tsc --noEmit` + dev SSR smoke test), Claude writes the message to `COMMIT_MESSAGE.md` at the repo root and bumps the version; the maintainer reviews, deletes the file, and commits.
- **Version** is written in three places that must move together: the commit title, `SITE_CONFIG.version` (`app/utils/siteConfigs.ts`, shown in the footer as `v{version}`), and `package.json` `version` (beta uses the short `X.Y-beta.N` form, same as `SITE_CONFIG.version`; pnpm accepts it even though it isn't strict semver). The target release is picked when a series starts (new features → next minor, e.g. `2.5`; fix / perf / refactor only → next patch). Every commit on `dev` bumps the beta counter:

  | Commit title | `SITE_CONFIG.version` | `package.json` |
  | --- | --- | --- |
  | `v2.5 Beta 4 …` | `'2.5-beta.4'` | `2.5-beta.4` |
  | `v2.5.0 …` (stable merge into `main`) | `'2.5.0'` | `2.5.0` |
- **Message format:** copy the structure of recent `git log` entries — `vX.Y Beta N <type>: <title>` (plain `vX.Y.Z` on `main`), a one-line English summary on the next line, then categorized bullets (Feature Addition, Bug Fix, UI Adjustments, Refactoring, …; omit empty ones). One line per bullet saying what changed; no per-file detail, no verification log.
