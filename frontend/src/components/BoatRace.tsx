'use client';

import { MiniGamePosition } from '@/lib/types';

interface BoatRaceProps {
  positions: Record<string, MiniGamePosition>;
  winners: string[];
  currentPlayerId?: string;
  isHost?: boolean;
}

export default function BoatRace({ positions, winners, currentPlayerId, isHost = false }: BoatRaceProps) {
  const sortedPlayers = Object.entries(positions).sort((a, b) => b[1].position - a[1].position);

  return (
    <div className={`bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] rounded-2xl p-4 ${isHost ? 'p-6' : ''}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-[#FFD700] font-bold text-lg">¡Carrera de botes!</h3>
        <p className="text-gray-400 text-sm">Pulsa el botón para remar y cruzar el río</p>
        {winners.length > 0 && (
          <p className="text-green-400 text-xs mt-1">
            {winners.length === 1 ? '1 ganador!' : `${winners.length} ganadores!`} Los 2 primeros obtienen +50 puntos
          </p>
        )}
      </div>

      {/* River */}
      <div className="relative bg-gradient-to-r from-[#1e4d6b] via-[#2a6b8a] to-[#1e4d6b] rounded-xl overflow-hidden">
        {/* Wave pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="wave-pattern" />
        </div>

        {/* Start and finish lines */}
        <div className="absolute left-2 top-0 bottom-0 w-1 bg-white/30 rounded" />
        <div className="absolute right-2 top-0 bottom-0 w-1 bg-[#FFD700] rounded" />

        {/* Finish flag */}
        <div className="absolute right-1 top-1 text-lg">🏁</div>

        {/* Boats */}
        <div className={`py-4 space-y-2 ${isHost ? 'min-h-[200px]' : 'min-h-[150px]'}`}>
          {sortedPlayers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Esperando jugadores...
            </div>
          ) : (
            sortedPlayers.map(([playerId, data]) => {
              const isCurrentPlayer = playerId === currentPlayerId;
              const isWinner = winners.includes(playerId);
              const winnerPosition = winners.indexOf(playerId) + 1;

              return (
                <div key={playerId} className="relative h-8 mx-4">
                  {/* Boat */}
                  <div
                    className={`absolute transition-all duration-300 ease-out flex items-center gap-1 ${
                      isCurrentPlayer ? 'z-10' : 'z-0'
                    }`}
                    style={{ left: `${Math.min(data.position, 100)}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Trophy for winners */}
                    {isWinner && winnerPosition <= 2 && (
                      <span className="text-lg">{winnerPosition === 1 ? '🥇' : '🥈'}</span>
                    )}

                    {/* Boat emoji with player indicator */}
                    <div className={`flex flex-col items-center ${data.finished ? 'animate-bounce' : ''}`}>
                      <span className={`text-2xl ${isCurrentPlayer ? 'scale-125' : ''}`}>
                        🚣
                      </span>
                      <span className={`text-xs font-bold px-1 rounded whitespace-nowrap ${
                        isCurrentPlayer
                          ? 'bg-[#FFD700] text-black'
                          : 'bg-black/50 text-white'
                      }`}>
                        {data.name.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  {/* Progress track line */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instructions for player */}
      {!isHost && currentPlayerId && (
        <div className="mt-3 text-center">
          {positions[currentPlayerId]?.finished ? (
            <p className="text-green-400 font-bold">
              {winners.indexOf(currentPlayerId) < 2 ? '🎉 ¡Ganaste +50 puntos de bonificación!' : '✓ ¡Cruzaste la línea de meta!'}
            </p>
          ) : (
            <p className="text-gray-400 text-sm animate-pulse">
              ⬇️ ¡Pulsa el botón para remar! ⬇️
            </p>
          )}
        </div>
      )}
    </div>
  );
}
