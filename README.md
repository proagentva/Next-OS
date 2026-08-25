# Next-OS

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-zpf3f44c)

KPI & expense operating system for a real-estate wholesaling/investing business, built on Vite + React + Supabase.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Supabase project's URL and anon key
npm run dev
```

Env vars (see `.env.example`):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — from Supabase Dashboard > Project Settings > API.
- `VITE_SIGNUP_CODE` — optional. If set, the sign-up form requires this code before creating an account.
  This is a client-side UX gate only, not a real access control — anyone can still call the Supabase
  sign-up API directly and bypass it. Every authenticated user gets full read/write access to all data
  per this app's shared-workspace RLS policies, so treat account creation as the real security boundary:
  either keep this code private, or turn off public sign-ups entirely in Supabase Dashboard >
  Authentication > Sign In / Providers and invite teammates from there instead.

## Supabase Auth URL configuration

In Supabase Dashboard > Authentication > URL Configuration, set:

- **Site URL** to your production origin (e.g. `https://crm.proagentva.com`)
- **Redirect URLs** to include that origin (e.g. `https://crm.proagentva.com/**`)

This controls where confirmation, magic-link, and OAuth redirects land. If it's left on the local dev
default (`http://localhost:5173`), auth emails will verify successfully server-side but the browser's
final redirect after clicking the link will fail to load.

## Social login (Google / Apple)

The login page has "Continue with Google" / "Continue with Apple" buttons wired up in code, but each
provider needs to be enabled and configured in Supabase Dashboard > Authentication > Providers with
credentials from that provider's own developer console (Google Cloud Console / Apple Developer). Until
a provider is enabled there, its button will show an error when clicked.

## Edge Functions

`supabase/functions/generate-report` calls the Anthropic API server-side to generate a written report
narrative. Requires the `ANTHROPIC_API_KEY` secret to be set on the Supabase project
(`supabase secrets set ANTHROPIC_API_KEY=...`). Without it, the function still returns the underlying
data tables, just without the AI narrative.
