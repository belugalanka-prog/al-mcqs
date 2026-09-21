# A/L Master — Physics & Chemistry MCQ platform

Next.js 15 + Supabase. Built to run on Vercel against a hosted Supabase project. There is no local
database step anywhere in this setup.

---

## Deploy in about twenty minutes

### 1. Create the Supabase project

Go to [supabase.com](https://supabase.com) → New project. Pick a region near Sri Lanka (Singapore
is the closest). Save the database password somewhere safe.

### 2. Run the schema

Supabase dashboard → **SQL Editor** → **New query**. Paste the whole of
`supabase/migrations/0001_init.sql` and run it. Then do the same with
`supabase/migrations/0002_storage.sql`.

That creates every table, the RLS policies, the `submit_attempt` marking function and the two
analytics views.

### 3. Create the storage buckets

Supabase → **Storage** → New bucket. Create three, all **public**:

- `questions`
- `reviews`
- `ads`

Public here means readable — the write policies from `0002_storage.sql` still restrict uploads to
staff accounts.

### 4. Set up Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials →
   Create credentials → OAuth client ID → Web application.
2. Under **Authorised redirect URIs** add exactly:
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Copy the client ID and secret into Supabase → **Authentication** → **Providers** → Google.
4. Supabase → **Authentication** → **URL Configuration**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: add `https://your-app.vercel.app/auth/callback` and
     `https://*.vercel.app/auth/callback` so preview deploys can sign in too.

### 5. Push and deploy

```bash
git init && git add -A && git commit -m "A/L MCQ platform"
gh repo create al-mcq-platform --private --source=. --push
```

Then on [vercel.com](https://vercel.com): **Add New → Project → Import** your repo.

Before clicking Deploy, add these environment variables (Production, Preview and Development all
ticked). The Supabase values are under Project Settings → API.

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
CRON_SECRET=<any long random string>
```

`SUPABASE_SERVICE_ROLE_KEY` must never get a `NEXT_PUBLIC_` prefix. It bypasses every security
policy, and anything prefixed that way is bundled into the browser.

Deploy. Once you know your production URL, update `NEXT_PUBLIC_SITE_URL` to match and redeploy.

### 6. Make yourself an admin

Sign in once with Google on the live site, then in Supabase SQL Editor:

```sql
update profiles set role = 'admin' where full_name = 'Your Name';
```

`/admin` is now open to you. Anyone else typing that URL gets bounced to their dashboard by the
middleware.

### 7. Working on it afterwards

```bash
npm install
vercel env pull .env.local   # one source of truth for secrets
npm run dev
```

`npm run dev` still serves the UI on your machine, but every query, file upload and login goes to
the same hosted Supabase project as production. Nothing runs on a local database.

---

## Loading your first paper

1. `/admin/papers` → fill in the form → **Create paper**.
2. Open the paper → drag all fifty question screenshots onto the drop zone. Name them `001.png`
   through `050.png`; anything without a number in the filename is reported rather than guessed at.
   Each image is converted to WebP in your browser before upload, so a 5 MB screenshot lands at
   roughly 400 KB.
3. In the answer key on the right, press **A**–**E** to set each answer and drop to the next row.
   A whole paper goes in without touching the mouse. Rows save individually.
4. Type a topic per question — this is what powers every topic breakdown students see, so it is
   worth doing.
5. Optionally add a worked answer per question. Students see it after submitting.
6. **Publish**. Publishing is refused while questions are missing, and tells you how many.

---

## How answers stay secret

This is enforced in three layers, not one:

1. `questions` has no student-facing RLS policy at all. A student querying that table directly with
   their own token gets an empty set, whatever the query.
2. The exam page reads questions with the service-role client and selects only
   `id, question_number, question_image_url, topic`. `correct_answer` never enters the payload
   sent to the browser.
3. Marking runs inside the `submit_attempt` Postgres function. The client sends no scores — only
   which option it picked.

Practice mode reveals one answer at a time, and only after the student has recorded a selection for
that specific question. Exam mode refuses the reveal endpoint entirely.

The timer is derived from `attempts.expires_at` on the server. Closing the tab, changing the system
clock, or editing the countdown in devtools does not extend it.

---

## What is built

| Area | State |
|---|---|
| Google sign-in, profile creation, role gating | Done |
| Subject → paper browsing by past / topic / model | Done |
| Exam runner: timer, navigator, autosave, resume, submit confirmation | Done |
| Practice mode with per-question reveal | Done |
| Server-side marking, topic breakdown, wrong-answer review | Done |
| Leaderboards: all-time, weekly, monthly, accuracy | Done |
| Streaks, points, user statistics | Done |
| Admin: create paper, bulk upload, answer key, publish guard | Done |
| Admin: student list, student 360 page, hardest questions | Done |
| Ad placements with a deliberate gap inside `/exam` | Slots render; upload form is a stub |
| Teacher accounts and classes | Schema supports the role; UI not built |

The `teacher` role already passes the staff checks, so a teacher can create and manage papers
today. Class assignment and class-level analytics are the natural next build.

---

## Structure

```
app/
  page.tsx                          landing
  dashboard/                        student home
  subjects/[subject]/               paper browser
  papers/[paperId]/                 cover + mode picker
  exam/[attemptId]/                 the runner
  results/[attemptId]/              score, topics, wrong-answer review
  leaderboard/
  admin/                            papers, questions, students, ads
  api/attempts/                     start, answer, submit, reveal
  api/cron/leaderboard/             weekly roll-over
lib/supabase/
  client.ts                         browser, RLS applies
  server.ts                         server components, RLS applies
  admin.ts                          service role, server only
supabase/migrations/                schema, RLS, storage policies
```

---

## Google AdSense

Two separate things, and you can do the first without the second.

### A. Serving ads (this is what earns money)

1. Apply at [adsense.google.com](https://adsense.google.com) with your site's domain.
2. Once approved, copy your publisher ID (`ca-pub-…`) into Vercel as
   `NEXT_PUBLIC_ADSENSE_CLIENT`.
3. Edit `public/ads.txt` and replace the placeholder publisher ID with yours. Without a matching
   `ads.txt`, many buyers will not bid on your inventory, which quietly caps what you earn.
4. In AdSense, create a display ad unit for each placement and copy its slot ID. Then in Supabase:

```sql
update app_settings set value = to_jsonb('1234567890'::text) where key = 'adsense_slot_dashboard';
update app_settings set value = to_jsonb('2345678901'::text) where key = 'adsense_slot_paper_top';
update app_settings set value = to_jsonb('3456789012'::text) where key = 'adsense_slot_result';
update app_settings set value = to_jsonb('4567890123'::text) where key = 'adsense_slot_sidebar';
```

Slots live in the database rather than in code, so you can move or switch off a placement without
redeploying. Set `adsense_enabled` to `false` to turn all AdSense off at once.

**Before you apply, two things are worth knowing.** AdSense reviewers frequently reject
`*.vercel.app` subdomains — buy a domain (a `.lk` or a cheap `.com`) and attach it in Vercel →
Settings → Domains first. And approval needs real content on the site, so upload a few complete
papers and add privacy policy and contact pages before applying.

**Never click your own ads, and never ask students to.** It is the most common reason accounts get
terminated, and termination is usually permanent.

### B. Reading earnings into `/admin/earnings` (optional)

This pulls your real revenue figures into the admin panel so you are not logging into AdSense
separately.

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Library → enable
   **AdSense Management API**.
2. Credentials → Create credentials → OAuth client ID → **Web application**. Under authorised
   redirect URIs add `http://localhost:8737`.
3. Run the helper once on your own machine:

```bash
GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/get-adsense-token.mjs
```

It opens a Google sign-in, then prints a refresh token. Sign in as the account that owns the
AdSense account.

4. Add these four to Vercel:

```
ADSENSE_ACCOUNT_ID=pub-0000000000000000     # no "ca-" prefix here
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
ADSENSE_REFRESH_TOKEN=1//...
```

The scope requested is `adsense.readonly`, so this token can read reports and nothing else. Reports
are cached in `adsense_snapshots` for 20 to 240 minutes depending on the report, because the API is
rate limited and slow. If a call fails, the last good snapshot is shown rather than an error.

Until these are set, `/admin/earnings` still loads and still shows your directly sold ad
performance — it just says the revenue side is not connected.

### What the earnings page shows

Today, last 7 days, month to date and last month, each with page views, RPM and clicks; a 30-day
revenue chart; which ad units actually earn over the last 28 days; and your payment history.
Every number AdSense returns is an estimate until Google finalises the month, so what lands in your
bank will differ slightly.

### Two ad systems, one slot

Ads you sell directly to tuition classes take priority over AdSense at every placement, because a
fixed rate you negotiated beats an auction. AdSense fills whatever is left. Direct ads are tracked
by this app — impressions count only once the ad is at least half visible on screen, so the numbers
you report to an advertiser mean something.

### Nothing renders inside `/exam`

There is no ad placement on a running paper, deliberately. Interrupting a timed exam costs more in
abandoned attempts than the impression is worth, and accidental clicks on a page where students are
tapping quickly are exactly the pattern that gets AdSense accounts flagged.
