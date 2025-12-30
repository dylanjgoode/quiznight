import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Quiz Night API")

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load questions from JSON file
QUESTIONS_FILE = Path(__file__).parent / "questions.json"

def load_questions():
    if QUESTIONS_FILE.exists():
        with open(QUESTIONS_FILE, "r") as f:
            return json.load(f)
    return {"categories": {}}

# In-memory game state
class GameRoom:
    def __init__(self, room_id: str, host_name: str):
        self.room_id = room_id
        self.host_name = host_name
        self.host_ws: Optional[WebSocket] = None
        self.players: dict[str, dict] = {}  # player_id -> {name, score, ws, connected}
        self.current_question: Optional[dict] = None
        self.question_active = False
        self.buzzer_queue: list[dict] = []  # [{player_id, name, timestamp}]
        self.timer_seconds = 15
        self.timer_task: Optional[asyncio.Task] = None
        self.current_category: Optional[str] = None
        self.questions_data = load_questions()
        self.used_questions: set[str] = set()
        # Mini-game state (boat race)
        self.mini_game_positions: dict[str, float] = {}  # player_id -> position (0-100)
        self.mini_game_finished: list[str] = []  # player_ids who finished, in order
        self.mini_game_tide_task: Optional[asyncio.Task] = None
        self.mini_game_active = True  # Active until first question starts

    def get_leaderboard(self):
        sorted_players = sorted(
            [
                {"id": pid, "name": p["name"], "score": p["score"], "connected": p["connected"]}
                for pid, p in self.players.items()
            ],
            key=lambda x: x["score"],
            reverse=True
        )
        for i, player in enumerate(sorted_players):
            player["position"] = i + 1
        return sorted_players

    async def broadcast_to_all(self, message: dict):
        """Send message to host and all players"""
        if self.host_ws:
            try:
                await self.host_ws.send_json(message)
            except:
                pass
        for player in self.players.values():
            if player["ws"] and player["connected"]:
                try:
                    await player["ws"].send_json(message)
                except:
                    pass

    async def broadcast_to_players(self, message: dict):
        """Send message to all players only"""
        for player in self.players.values():
            if player["ws"] and player["connected"]:
                try:
                    await player["ws"].send_json(message)
                except:
                    pass

    async def send_to_host(self, message: dict):
        """Send message to host only"""
        if self.host_ws:
            try:
                await self.host_ws.send_json(message)
            except:
                pass

    async def send_to_player(self, player_id: str, message: dict):
        """Send message to specific player"""
        if player_id in self.players and self.players[player_id]["ws"]:
            try:
                await self.players[player_id]["ws"].send_json(message)
            except:
                pass

    def get_mini_game_state(self):
        """Get current mini-game state for broadcasting"""
        positions = {}
        for player_id, position in self.mini_game_positions.items():
            if player_id in self.players:
                positions[player_id] = {
                    "name": self.players[player_id]["name"],
                    "position": position,
                    "finished": player_id in self.mini_game_finished
                }
        return {
            "positions": positions,
            "winners": self.mini_game_finished[:2]  # First 2 winners
        }

    async def broadcast_mini_game_state(self):
        """Broadcast mini-game state to all"""
        if not self.mini_game_active:
            return
        state = self.get_mini_game_state()
        await self.broadcast_to_all({
            "type": "mini_game_update",
            **state
        })

    async def start_mini_game_tide(self):
        """Run the tide that pulls boats back"""
        while self.mini_game_active:
            await asyncio.sleep(0.5)
            if not self.mini_game_active:
                break
            # Apply tide to all non-finished players (1.5 per tick = 3 per second)
            changed = False
            for player_id in list(self.mini_game_positions.keys()):
                if player_id not in self.mini_game_finished:
                    old_pos = self.mini_game_positions[player_id]
                    self.mini_game_positions[player_id] = max(0, old_pos - 1.5)
                    if old_pos != self.mini_game_positions[player_id]:
                        changed = True
            if changed:
                await self.broadcast_mini_game_state()

    async def handle_mini_game_buzz(self, player_id: str) -> bool:
        """Handle a buzz during mini-game. Returns True if handled."""
        if not self.mini_game_active:
            return False
        if player_id in self.mini_game_finished:
            return True  # Already finished, ignore but consume the buzz

        # Initialize position if new
        if player_id not in self.mini_game_positions:
            self.mini_game_positions[player_id] = 0

        # Move boat forward
        self.mini_game_positions[player_id] = min(100, self.mini_game_positions[player_id] + 10)

        # Check if finished
        if self.mini_game_positions[player_id] >= 100:
            self.mini_game_finished.append(player_id)
            finish_position = len(self.mini_game_finished)

            # Award bonus points for first 2 finishers
            if finish_position <= 2:
                self.players[player_id]["score"] += 50
                # Send points notification to player
                await self.send_to_player(player_id, {
                    "type": "mini_game_bonus",
                    "points": 50,
                    "finish_position": finish_position
                })
                # Update leaderboard for everyone
                await self.broadcast_to_all({
                    "type": "leaderboard_update",
                    "leaderboard": self.get_leaderboard(),
                    "awarded_player": player_id,
                    "points": 50
                })

        # Broadcast updated positions
        await self.broadcast_mini_game_state()
        return True

    def stop_mini_game(self):
        """Stop the mini-game (when first question starts)"""
        self.mini_game_active = False
        if self.mini_game_tide_task:
            self.mini_game_tide_task.cancel()
            self.mini_game_tide_task = None


# Store all active rooms
rooms: dict[str, GameRoom] = {}


class CreateRoomRequest(BaseModel):
    host_name: str


class CreateRoomResponse(BaseModel):
    room_id: str
    room_code: str


@app.get("/")
async def root():
    return {"status": "Quiz Night API is running"}


@app.get("/api/questions")
async def get_questions():
    """Get all questions for editing"""
    return load_questions()


@app.post("/api/rooms")
async def create_room(request: CreateRoomRequest):
    """Create a new game room"""
    room_id = str(uuid.uuid4())
    room_code = room_id[:6].upper()
    rooms[room_id] = GameRoom(room_id, request.host_name)
    return {"room_id": room_id, "room_code": room_code}


@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    """Check if room exists"""
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    room = rooms[room_id]
    return {
        "room_id": room_id,
        "host_name": room.host_name,
        "player_count": len(room.players)
    }


@app.websocket("/ws/host/{room_id}")
async def host_websocket(websocket: WebSocket, room_id: str):
    """WebSocket connection for the host"""
    if room_id not in rooms:
        await websocket.close(code=4004, reason="Room not found")
        return

    await websocket.accept()
    room = rooms[room_id]
    room.host_ws = websocket

    # Send initial state
    await websocket.send_json({
        "type": "init",
        "room_id": room_id,
        "room_code": room_id[:6].upper(),
        "players": room.get_leaderboard(),
        "categories": list(room.questions_data.get("categories", {}).keys()),
        "timer_seconds": room.timer_seconds,
        "mini_game": room.get_mini_game_state(),
        "mini_game_active": room.mini_game_active
    })

    try:
        while True:
            data = await websocket.receive_json()
            await handle_host_message(room, data)
    except WebSocketDisconnect:
        room.host_ws = None
    except Exception as e:
        print(f"Host WebSocket error: {e}")
        room.host_ws = None


async def handle_host_message(room: GameRoom, data: dict):
    """Handle messages from host"""
    msg_type = data.get("type")

    if msg_type == "select_category":
        room.current_category = data.get("category")
        await room.send_to_host({
            "type": "category_selected",
            "category": room.current_category
        })

    elif msg_type == "start_question":
        question_data = data.get("question")
        if question_data:
            # Stop mini-game when first question starts
            if room.mini_game_active:
                room.stop_mini_game()
                await room.broadcast_to_all({
                    "type": "mini_game_ended",
                    "winners": room.mini_game_finished[:2]
                })

            room.current_question = question_data
            room.question_active = True
            room.buzzer_queue = []

            # Notify host with full question
            await room.send_to_host({
                "type": "question_started",
                "question": question_data,
                "timer": room.timer_seconds
            })

            # Notify players that buzzer is active (no question text)
            await room.broadcast_to_players({
                "type": "buzzer_active",
                "timer": room.timer_seconds
            })

            # Start timer (skip for music questions - host controls playback)
            is_music_question = question_data.get("type") == "music"
            if not is_music_question:
                if room.timer_task:
                    room.timer_task.cancel()
                room.timer_task = asyncio.create_task(run_timer(room))

    elif msg_type == "stop_question":
        room.question_active = False
        if room.timer_task:
            room.timer_task.cancel()
            room.timer_task = None
        await room.broadcast_to_all({
            "type": "buzzer_locked"
        })

    elif msg_type == "reveal_answer":
        if room.current_question:
            await room.send_to_host({
                "type": "answer_revealed",
                "answer": room.current_question.get("correct_answer")
            })

    elif msg_type == "award_points":
        player_id = data.get("player_id")
        points = data.get("points", 0)
        if player_id in room.players:
            room.players[player_id]["score"] += points
            leaderboard = room.get_leaderboard()

            # Broadcast updated leaderboard to all
            await room.broadcast_to_all({
                "type": "leaderboard_update",
                "leaderboard": leaderboard,
                "awarded_player": player_id,
                "points": points
            })

    elif msg_type == "adjust_score":
        player_id = data.get("player_id")
        new_score = data.get("score", 0)
        if player_id in room.players:
            room.players[player_id]["score"] = new_score
            leaderboard = room.get_leaderboard()
            await room.broadcast_to_all({
                "type": "leaderboard_update",
                "leaderboard": leaderboard
            })

    elif msg_type == "set_timer":
        room.timer_seconds = data.get("seconds", 15)
        await room.send_to_host({
            "type": "timer_updated",
            "seconds": room.timer_seconds
        })

    elif msg_type == "next_question":
        room.current_question = None
        room.question_active = False
        room.buzzer_queue = []
        await room.broadcast_to_all({
            "type": "question_cleared"
        })

    elif msg_type == "end_mini_game":
        if room.mini_game_active:
            room.stop_mini_game()
            await room.broadcast_to_all({
                "type": "mini_game_ended",
                "winners": room.mini_game_finished[:2]
            })

    elif msg_type == "kick_player":
        player_id = data.get("player_id")
        if player_id in room.players:
            await room.send_to_player(player_id, {"type": "kicked"})
            if room.players[player_id]["ws"]:
                try:
                    await room.players[player_id]["ws"].close()
                except:
                    pass
            del room.players[player_id]
            await room.broadcast_to_all({
                "type": "player_left",
                "player_id": player_id,
                "leaderboard": room.get_leaderboard()
            })


async def run_timer(room: GameRoom):
    """Run the question timer"""
    for remaining in range(room.timer_seconds, -1, -1):
        if not room.question_active:
            break
        await room.broadcast_to_all({
            "type": "timer_tick",
            "remaining": remaining
        })
        if remaining > 0:
            await asyncio.sleep(1)

    if room.question_active:
        room.question_active = False
        await room.broadcast_to_all({
            "type": "timer_expired",
            "buzzer_queue": room.buzzer_queue
        })


@app.websocket("/ws/player/{room_id}/{player_name}")
async def player_websocket(websocket: WebSocket, room_id: str, player_name: str):
    """WebSocket connection for players"""
    if room_id not in rooms:
        await websocket.close(code=4004, reason="Room not found")
        return

    await websocket.accept()
    room = rooms[room_id]

    # Check if player is reconnecting
    player_id = None
    for pid, pdata in room.players.items():
        if pdata["name"] == player_name and not pdata["connected"]:
            player_id = pid
            room.players[pid]["ws"] = websocket
            room.players[pid]["connected"] = True
            break

    # New player
    if not player_id:
        player_id = str(uuid.uuid4())
        room.players[player_id] = {
            "name": player_name,
            "score": 0,
            "ws": websocket,
            "connected": True
        }

    leaderboard = room.get_leaderboard()
    player_position = next(
        (p["position"] for p in leaderboard if p["id"] == player_id),
        len(leaderboard)
    )

    # Initialize player in mini-game if active
    if room.mini_game_active and player_id not in room.mini_game_positions:
        room.mini_game_positions[player_id] = 0
        # Start tide task if this is the first player
        if not room.mini_game_tide_task:
            room.mini_game_tide_task = asyncio.create_task(room.start_mini_game_tide())

    # Send player their initial state
    await websocket.send_json({
        "type": "init",
        "player_id": player_id,
        "name": player_name,
        "score": room.players[player_id]["score"],
        "position": player_position,
        "buzzer_active": room.question_active,
        "leaderboard": leaderboard,
        "mini_game": room.get_mini_game_state(),
        "mini_game_active": room.mini_game_active
    })

    # Notify host and other players
    await room.send_to_host({
        "type": "player_joined",
        "player_id": player_id,
        "name": player_name,
        "leaderboard": leaderboard
    })

    try:
        while True:
            data = await websocket.receive_json()
            await handle_player_message(room, player_id, data)
    except WebSocketDisconnect:
        if player_id in room.players:
            room.players[player_id]["connected"] = False
            room.players[player_id]["ws"] = None
            await room.send_to_host({
                "type": "player_disconnected",
                "player_id": player_id,
                "name": room.players[player_id]["name"],
                "leaderboard": room.get_leaderboard()
            })
    except Exception as e:
        print(f"Player WebSocket error: {e}")
        if player_id in room.players:
            room.players[player_id]["connected"] = False
            room.players[player_id]["ws"] = None


async def handle_player_message(room: GameRoom, player_id: str, data: dict):
    """Handle messages from players"""
    msg_type = data.get("type")

    if msg_type == "buzz":
        # If mini-game is active and no question, handle as mini-game buzz
        if not room.question_active and room.mini_game_active:
            await room.handle_mini_game_buzz(player_id)
            return

        if room.question_active and player_id in room.players:
            # Check if player already buzzed
            if not any(b["player_id"] == player_id for b in room.buzzer_queue):
                buzz_entry = {
                    "player_id": player_id,
                    "name": room.players[player_id]["name"],
                    "timestamp": datetime.now().isoformat(),
                    "position": len(room.buzzer_queue) + 1
                }
                room.buzzer_queue.append(buzz_entry)

                # Confirm buzz to player
                await room.send_to_player(player_id, {
                    "type": "buzz_confirmed",
                    "position": buzz_entry["position"]
                })

                # Notify host
                await room.send_to_host({
                    "type": "player_buzzed",
                    "buzz": buzz_entry,
                    "buzzer_queue": room.buzzer_queue
                })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
