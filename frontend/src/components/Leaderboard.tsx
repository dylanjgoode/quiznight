'use client';

import { useState } from 'react';
import type { Player } from '@/lib/types';

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
    if (position === 1) return 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]';
    if (position === 2) return 'bg-gradient-to-r from-[#C0C0C0] to-[#A8A8A8]';
    if (position === 3) return 'bg-gradient-to-r from-[#CD7F32] to-[#8B4513]';
    return 'bg-[#1A1A1A]';
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

  const hasScores = players.some((player) => player.score > 0);

  return (
    <div className="bg-[#1A1A1A]/80 rounded-xl p-4 border border-[#FFD700]/30">
      <h2 className="text-xl font-semibold text-[#FFD700] mb-4 flex items-center gap-2">
        <span>🏆</span> Clasificación
      </h2>

      {hasScores && (
        <div className="relative w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-[#FFD700]/50 mb-4">
          <img
            src="/images/busterleaderboard.gif"
            alt="Buster celebrating"
            className="w-full h-auto"
          />
        </div>
      )}

      {players.length === 0 ? (
        <div className="text-center py-4">
          <div className="relative w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-[#FFD700]/50 mb-4">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
            >
              <source src="/images/party_dog.mp4" type="video/mp4" />
            </video>
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Esperando jugadores...</p>
          <p className="text-[#FFD700]/60 text-xs mt-2">¡Comparte el código de la sala!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                awardedPlayer === player.id ? 'ring-2 ring-[#FFD700] animate-pulse' : ''
              } ${currentPlayerId === player.id ? 'ring-2 ring-[#FFEC8B]' : ''} ${
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
                <span className={`font-medium ${currentPlayerId === player.id ? 'text-[#FFD700]' : 'text-white'}`}>
                  {player.name}
                  {!player.connected && <span className="text-gray-500 text-xs ml-2">(desconectado)</span>}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editingPlayer === player.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-[#0A0A0A] border border-[#FFD700]/30 text-white text-sm"
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
                        awardedPlayer === player.id ? 'text-[#FFD700] animate-bounce' : 'text-[#FFEC8B]'
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
                        className="text-gray-500 hover:text-[#FFD700] text-xs ml-2"
                        title="Editar puntuación"
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
