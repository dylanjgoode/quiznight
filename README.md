# Quiz Night - New Year's Eve Edition

A real-time multiplayer quiz game with buzzer functionality, perfect for New Year's Eve parties! Built with FastAPI (WebSocket) backend and React frontend.

## Features

- **Host Interface** (Desktop/Laptop):
  - Question display with multiple choice options
  - Manual answer reveal and scoring controls
  - Live leaderboard with all players
  - Configurable round timer (10-60 seconds)
  - Category selection between rounds
  - Buzzer feed showing who buzzed and when
  - Score adjustment controls

- **Player Interface** (Mobile Web):
  - Large buzzer button with haptic feedback
  - Current score and leaderboard position
  - Visual feedback when buzzed
  - No question text shown (keeps focus on host screen)

- **Game Features**:
  - Real-time WebSocket sync
  - Confetti celebrations on correct answers
  - Sound effects (buzzer, correct/wrong, countdown)
  - New Year's themed design (gold, black, sparkles)
  - Reconnection handling

## Project Structure

```
quiznight/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── questions.json       # Question bank (editable)
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile          # For deployment
│   └── .env.example        # Environment template
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   └── ...
│   ├── vercel.json         # Vercel config
│   └── .env.example        # Environment template
└── README.md
```

## Local Development

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:8000`.

## How to Play

1. **Host creates a room**: Go to the homepage and enter your name to create a room
2. **Share the link**: Copy the join link and share it with players
3. **Players join**: Players enter their name and join the game
4. **Host controls the game**:
   - Select a category
   - Click "Start Question" to begin
   - Timer starts and players can buzz in
   - First to buzz gets priority
   - Host reveals answer and awards points manually
5. **Repeat** until all questions are done!

## Customizing Questions

Edit `backend/questions.json` to add your own questions:

```json
{
  "categories": {
    "Category Name": [
      {
        "id": "unique-id",
        "question": "Your question here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option B",
        "points": 100
      }
    ]
  }
}
```

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Set the root directory to `frontend`
4. Add environment variables:
   - `VITE_API_URL`: Your backend URL (e.g., `https://your-backend.railway.app`)
   - `VITE_WS_URL`: Your backend WebSocket URL (e.g., `wss://your-backend.railway.app`)
5. Deploy!

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add environment variable:
   - `CORS_ORIGINS`: Your frontend URLs, comma-separated (e.g., `https://your-app.vercel.app`)
5. Railway will automatically detect the Dockerfile and deploy

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable:
   - `CORS_ORIGINS`: Your frontend URLs

## Tech Stack

- **Backend**: Python FastAPI with WebSocket support
- **Frontend**: React (Vite) with TypeScript and Tailwind CSS
- **Real-time**: WebSocket for live sync
- **Animations**: CSS animations + canvas-confetti
- **Sound**: Web Audio API

## License

MIT - Feel free to use for your own quiz nights!

---

Happy New Year! 🎉🥂✨
