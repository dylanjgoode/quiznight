# Quiz Night - Project Context

## Overview
Real-time multiplayer quiz game with buzzer functionality for New Year's Eve parties. Host displays questions on a big screen, players buzz in from their phones.

## Architecture

### Backend (FastAPI + WebSocket)
- **Location**: `backend/`
- **Main file**: `backend/main.py`
- **Port**: 8000 (local)
- **Production URL**: `https://quiznight-production.up.railway.app`

### Frontend (Next.js 16 + TypeScript + Tailwind CSS v4)
- **Location**: `frontend/`
- **Port**: 3000 (local)
- **Production URL**: `https://quiznight-eight.vercel.app`

## Key Files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI server, WebSocket handlers, game logic |
| `backend/questions.json` | Question bank (editable) |
| `frontend/src/lib/config.ts` | API/WebSocket URL configuration |
| `frontend/src/lib/types.ts` | TypeScript types |
| `frontend/src/hooks/useWebSocket.ts` | WebSocket connection hook |
| `frontend/src/app/host/[roomId]/page.tsx` | Host interface |
| `frontend/src/app/play/[roomId]/page.tsx` | Player buzzer interface |

## Local Development

```bash
# Backend (Terminal 1)
cd backend
source venv/bin/activate  # Use Python 3.12, NOT 3.14
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
cd frontend
npm run dev
```

## Deployment

### Frontend (Vercel)
- **Root Directory**: `frontend` (must be set in Vercel settings)
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Backend HTTPS URL
  - `NEXT_PUBLIC_WS_URL`: Backend WSS URL (use `wss://` not `ws://`)

### Backend (Railway)
- **Root Directory**: `backend`
- **Environment Variables**:
  - `CORS_ORIGINS`: Comma-separated list of allowed frontend URLs (no spaces)

Example CORS config:
```
https://quiznight-eight.vercel.app,https://quiznight-dw5zeelws-dylanjgoodes-projects.vercel.app
```

## Common Issues

### CORS Errors
- Backend `CORS_ORIGINS` must include exact Vercel URL(s)
- Vercel creates different URLs for preview deployments vs production
- Check browser console for the exact origin being blocked

### Python Version
- Use Python 3.12, not 3.14 (pydantic wheel build fails on 3.14)

### WebSocket Connection
- Local: `ws://localhost:8000`
- Production: `wss://your-railway-url.up.railway.app` (note: `wss://` not `ws://`)

## WebSocket Message Types

### Host receives:
- `init`, `player_joined`, `player_disconnected`, `player_buzzed`
- `timer_tick`, `timer_expired`, `leaderboard_update`

### Player receives:
- `init`, `buzzer_active`, `buzzer_locked`, `buzz_confirmed`
- `timer_tick`, `leaderboard_update`

### Host sends:
- `select_category`, `start_question`, `stop_question`
- `reveal_answer`, `award_points`, `adjust_score`, `next_question`
