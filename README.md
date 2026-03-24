# Pay-Gaurd Web Frontend

Next.js 14 frontend for Artha payment guard system.

## Setup

### 1. Install Dependencies
```bash
cd c:\x\pay-gaurd-web
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

The frontend will start on **http://localhost:3000**

### 3. Backend Must Be Running
Ensure the FastAPI backend is running on **http://localhost:8010**:
```bash
cd c:\x\pay-gaurd
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --log-level info
```

## Architecture

### Dual Mode
- **Frontend Mode** (active): Send test messages via web interface
  - Messages go to backend's `/test-message` endpoint
  - Backend processes them as if they came from WhatsApp
  - Logs appear in terminal with [TEST_MSG] tag

- **WhatsApp Mode** (passive): Real WhatsApp webhooks
  - Meta sends webhooks to ngrok tunnel → localhost:8010
  - Backend receives real messages via `/webhook` endpoint
  - Easy to toggle by changing Meta webhook configuration

### Running Both Simultaneously
```bash
# Terminal 1 - Backend (port 8010)
cd c:\x\pay-gaurd
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010

# Terminal 2 - ngrok tunnel
ngrok http 8010

# Terminal 3 - Frontend (port 3000)
cd c:\x\pay-gaurd-web
npm run dev
```

Visit **http://localhost:3000** and start testing!

## Features

- ✅ Send test messages without WhatsApp
- ✅ Real-time backend response
- ✅ Health check endpoint
- ✅ Mode selector (Frontend vs WhatsApp)
- ✅ Full logging visibility in backend terminal

## Switching to Real WhatsApp

When ready:
1. Change Meta webhook Callback URL to your ngrok URL
2. Switch frontend mode selector to "WhatsApp"
3. Send messages via real WhatsApp

All code remains compatible - just flips between test/real sources.

## File Structure

```
pay-gaurd-web/
├── app/
│   ├── page.tsx          # Main dashboard
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Tailwind styles
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Environment Variables

Set in `.env.local` if needed:
```env
NEXT_PUBLIC_API_URL=http://localhost:8010
```

## Logs to Watch

In backend terminal:
```
[TEST_MSG] phone=918767394523, mode=frontend, text='hii'...
[MSG_PROCESS_START] phone=918767394523, type=text
[MSG_AGENT_START] phone=918767394523, input_len=3
[MSG_AGENT_DONE] phone=918767394523, intent=GREETING, response_len=45
[SEND_MSG_START] phone=918767394523, text='Namaste...'
[SEND_MSG_OK] Successfully sent to 918767394523
```

Everything transparent. No silent failures.
