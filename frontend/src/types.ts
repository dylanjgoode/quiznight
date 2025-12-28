export interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  position: number;
  connected: boolean;
}

export interface BuzzEntry {
  player_id: string;
  name: string;
  timestamp: string;
  position: number;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  connected: boolean;
  players: Player[];
  currentQuestion: Question | null;
  buzzerActive: boolean;
  buzzerQueue: BuzzEntry[];
  timerSeconds: number;
  timerRemaining: number;
  categories: string[];
  currentCategory: string | null;
}

export interface PlayerState {
  playerId: string;
  name: string;
  score: number;
  position: number;
  buzzPosition: number | null;
  hasBuzzed: boolean;
}

// Host init message
export type HostInitMessage = { type: 'init'; room_id: string; room_code: string; players: Player[]; categories: string[]; timer_seconds: number };

// Player init message
export type PlayerInitMessage = { type: 'init'; player_id: string; name: string; score: number; position: number; buzzer_active: boolean; leaderboard: Player[] };

export type WebSocketMessage =
  | HostInitMessage
  | PlayerInitMessage
  | { type: 'player_joined'; player_id: string; name: string; leaderboard: Player[] }
  | { type: 'player_disconnected'; player_id: string; name: string; leaderboard: Player[] }
  | { type: 'player_left'; player_id: string; leaderboard: Player[] }
  | { type: 'category_selected'; category: string }
  | { type: 'question_started'; question: Question; timer: number }
  | { type: 'buzzer_active'; timer: number }
  | { type: 'buzzer_locked' }
  | { type: 'timer_tick'; remaining: number }
  | { type: 'timer_expired'; buzzer_queue: BuzzEntry[] }
  | { type: 'player_buzzed'; buzz: BuzzEntry; buzzer_queue: BuzzEntry[] }
  | { type: 'buzz_confirmed'; position: number }
  | { type: 'answer_revealed'; answer: string }
  | { type: 'leaderboard_update'; leaderboard: Player[]; awarded_player?: string; points?: number }
  | { type: 'timer_updated'; seconds: number }
  | { type: 'question_cleared' }
  | { type: 'kicked' };
