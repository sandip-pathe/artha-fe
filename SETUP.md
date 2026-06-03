# Local Setup

## Requirements

- Node.js 18+
- npm
- Running Artha backend at `http://127.0.0.1:8010`
- Supabase project credentials for auth

## Install

```bash
npm install
```

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://127.0.0.1:8010
```

## Run

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Build

```bash
npm run build
```

## Common Local Issue

If styles or route chunks look stale after switching between `next build` and `next dev`, stop the dev server, remove `.next`, and start it again.

PowerShell:

```powershell
Remove-Item -LiteralPath .\.next -Recurse -Force
npm run dev
```

