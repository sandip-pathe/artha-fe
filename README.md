# Artha Frontend

Artha is a proof-of-concept AI munshi for small merchants. It gives shop owners a simple assistant that can remember shop context, answer business questions, support text and voice interactions, and help verify payment screenshots when connected to the backend.

This repository contains the public-facing web app prototype. The backend, merchant data model, and deeper AI orchestration live separately.

## What It Demonstrates

- Merchant authentication screens with Supabase support.
- Onboarding and optional shop-context seeding.
- Chat interface for daily business questions.
- Realtime voice entry point.
- Record-and-send voice note flow.
- OCR/payment screenshot upload path.
- Structured response rendering for summaries, lists, and alerts.
- Mobile-first UI that can become a PWA.

## Product Idea

Small merchants do not want another dashboard. They want someone who remembers the shop, understands their language, and answers practical questions:

- "Aaj kitna business hua?"
- "Udhaar list dikhao."
- "Top customers kaun hain?"
- "Ye payment screenshot real hai?"
- "Kal subah kisko reminder bhejna hai?"

Artha explores that assistant layer: memory plus business tools plus voice.

## Current Status

This is a light experiment and proof-of-concept, not a production SaaS yet.

Working prototype areas:

- Auth and onboarding
- Context seeding
- Chat UI
- Realtime voice UI
- Voice-note UI
- Payment/OCR upload wiring
- Structured result cards

Still experimental:

- Production deployment
- PWA packaging
- Push notifications
- Real merchant integrations
- Memory governance and editing
- Observability and billing

## Running Locally

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

By default the frontend expects the backend at:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8010
```

Set Supabase client values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://127.0.0.1:8010
```

Then open:

```text
http://127.0.0.1:3000
```

## Repository Layout

```text
app/
  auth/callback/        Supabase email confirmation callback
  confirm-email/        Email confirmation screen
  login/                Merchant login
  onboarding/           Merchant profile and context seeding
  register/             Merchant registration
  page.tsx              Main Artha assistant interface
components/
  chat/                 Input and attachment UI
  RealtimeVoiceModal.tsx
lib/
  auth-session.ts       Frontend session sync
  supabase.ts           Supabase browser client
  useRealtimeVoice.ts   Realtime voice hook
```

## Demo Narrative

1. Merchant creates an account.
2. Merchant optionally seeds shop context during onboarding.
3. Merchant asks a daily business question in chat.
4. Artha answers using merchant memory and backend tools.
5. Merchant can use realtime voice or a recorded voice note.
6. Merchant can upload payment screenshots for verification.

## One-Pager

See [ONE_PAGER.md](./ONE_PAGER.md) for the concise public pitch.

## Notes

Do not commit `.env.local`, API keys, Supabase secrets, backend credentials, merchant data, or local build artifacts.

