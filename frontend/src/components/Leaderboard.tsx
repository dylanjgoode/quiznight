import { useState } from 'react';
import type { Player } from '../types';

interface LeaderboardProps {
  players: Player[];
  awardedPlayer?: string | null;
  isHost?: boolean;
  currentPlayerId?: string;
  onAdjustScore?: (playerId: string, newScore: number) => void;
}

export default function Leaderboard({
  players,
  awardedPlayer,
  isHost = false,
  currentPlayerId,
  onAdjustScore,
}: LeaderboardProps) {
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editScore, setEditScore] = useState('');

  const getPositionStyle = (position: number) => {
    if (position === 1) return 'position-1';
    if (position === 2) return 'position-2';
    if (position === 3) return 'position-3';
    return 'bg-nye-dark';
  };

  const getPositionEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const handleScoreSubmit = (playerId: string) => {
    const score = parseInt(editScore, 10);
    if (!isNaN(score) && onAdjustScore) {
      onAdjustScore(playerId, score);
    }
    setEditingPlayer(null);
    setEditScore('');
  };

  return (
    <div className="bg-nye-dark/80 rounded-xl p-4 border border-nye-gold/30">
      <h2 className="text-xl font-semibold text-nye-gold mb-4 flex items-center gap-2">
        <span>🏆</span> Leaderboard
      </h2>

      {players.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Waiting for players...</p>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                awardedPlayer === player.id
                  ? 'ring-2 ring-nye-gold animate-pulse'
                  : ''
              } ${currentPlayerId === player.id ? 'ring-2 ring-nye-gold-light' : ''} ${
                !player.connected ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${getPositionStyle(
                    player.position
                  )}`}
                >
                  {getPositionEmoji(player.position)}
                </span>
                <span className={`font-medium ${currentPlayerId === player.id ? 'text-nye-gold' : 'text-white'}`}>
                  {player.name}
                  {!player.connected && <span className="text-gray-500 text-xs ml-2">(disconnected)</span>}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editingPlayer === player.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-nye-black border border-nye-gold/30 text-white text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleScoreSubmit(player.id);
                        if (e.key === 'Escape') setEditingPlayer(null);
                      }}
                    />
                    <button
                      onClick={() => handleScoreSubmit(player.id)}
                      className="text-green-500 hover:text-green-400 text-sm"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingPlayer(null)}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`text-lg font-bold ${
                        awardedPlayer === player.id ? 'text-nye-gold animate-bounce' : 'text-nye-gold-light'
                      }`}
                    >
                      {player.score}
                    </span>
                    {isHost && onAdjustScore && (
                      <button
                        onClick={() => {
                          setEditingPlayer(player.id);
                          setEditScore(player.score.toString());
                        }}
                        className="text-gray-500 hover:text-nye-gold text-xs ml-2"
                        title="Edit score"
                      >
                        ✏️
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
