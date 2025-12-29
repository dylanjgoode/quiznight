# Quiz Night - Project Context

## Overview
Real-time multiplayer quiz game with buzzer functionality for New Year's Eve parties. Host displays questions on a big screen, players buzz in from their phones. Spanish-themed "Noche de Trivia" branding with party dog mascot.

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
| `frontend/src/components/BuzzerFeed.tsx` | Buzzer queue with toggle scoring UI |
| `frontend/src/components/FirstBuzzAlert.tsx` | Dramatic first buzz animation |
| `frontend/src/components/ScorePopup.tsx` | Floating score change indicators |
| `frontend/src/components/Leaderboard.tsx` | Player rankings (shows party dog when empty) |
| `frontend/public/images/party_dog.mp4` | Mascot video |

## Game Features

### Scoring System
Points are scaled based on buzz position:
- **1st place**: 100% of points
- **2nd place**: 75% of points
- **3rd place**: 50% of points
- **4th+**: 25% of points

### Host UI Features
- **Question Progress Bar**: Visual indicator showing question X of Y
- **First Buzz Alert**: Full-screen dramatic animation when first player buzzes
- **Score Popups**: Floating +/- indicators when points are awarded
- **Toggle Scoring**: Select correct/wrong for each player, then "Apply Points"
- **Quick Select**: "Select All ✓" / "Select All ✗" buttons
- **Auto-Advance**: "Next Question" automatically starts the next question
- **Party Dog**: Shows in leaderboard while waiting for players

### Player UI Features
- Large buzzer button with haptic feedback
- Score and position display
- Points received animation (+100 / -50)
- Leaderboard modal

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

### Next Question Goes Back to Categories
- Fixed: `nextQuestion()` now auto-starts next question instead of sending `next_question` message
- The `next_question` message triggers `question_cleared` which was overwriting state

## WebSocket Message Types

### Host receives:
- `init`, `player_joined`, `player_disconnected`, `player_buzzed`
- `timer_tick`, `timer_expired`, `leaderboard_update`
- `category_selected`, `question_started`, `answer_revealed`

### Player receives:
- `init`, `buzzer_active`, `buzzer_locked`, `buzz_confirmed`
- `timer_tick`, `leaderboard_update`, `question_cleared`, `kicked`

### Host sends:
- `select_category`, `start_question`, `stop_question`
- `reveal_answer`, `award_points`, `adjust_score`, `next_question`
- `set_timer`, `kick_player`

## UI Components

### Home Page (`/`)
- Two-column layout: Party dog video + title on left, Host/Join form on right
- Spanish branding: "Noche de Trivia - Edición Año Nuevo 2026"

### Host Page (`/host/[roomId]`)
- Back to home button (← arrow)
- Room code display with copy link
- Timer selector (10-60 seconds)
- Category selection with progress bar
- Question card with answer options
- Buzzer feed with toggle scoring
- Leaderboard sidebar

### Player Page (`/play/[roomId]`)
- Back to home button
- Score and position header
- Large buzzer button (changes state: waiting/active/buzzed)
- Timer display
- Leaderboard modal
