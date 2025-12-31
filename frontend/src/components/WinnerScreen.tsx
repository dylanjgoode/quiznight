'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Player } from '@/lib/types';

interface WinnerScreenProps {
  players: Player[];
  onPlayAgain: () => void;
}

export default function WinnerScreen({ players, onPlayAgain }: WinnerScreenProps) {
  const [phase, setPhase] = useState<'drumroll' | 'reveal' | 'celebration'>('drumroll');
  const [showPodium, setShowPodium] = useState(false);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  useEffect(() => {
    // Phase 1: Drumroll (2 seconds)
    const drumrollTimer = setTimeout(() => {
      setPhase('reveal');
    }, 2000);

    // Phase 2: Reveal winner (after 2s, show for 3s, then celebrate)
    const revealTimer = setTimeout(() => {
      setPhase('celebration');
      // Trigger massive confetti
      const duration = 5000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Big burst in center
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#FFD700', '#FFA500', '#FFEC8B'],
      });
    }, 5000);

    // Phase 3: Show podium after celebration starts
    const podiumTimer = setTimeout(() => {
      setShowPodium(true);
    }, 7000);

    return () => {
      clearTimeout(drumrollTimer);
      clearTimeout(revealTimer);
      clearTimeout(podiumTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A] via-[#0A0A0A] to-[#1A1A1A]" />
        {phase !== 'drumroll' && (
          <div className="absolute inset-0 animate-pulse-slow">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFD700]/5 rounded-full blur-3xl" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Drumroll Phase */}
        {phase === 'drumroll' && (
          <div className="animate-pulse">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8">
              Y el ganador es...
            </h1>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-[#FFD700] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reveal Phase */}
        {phase === 'reveal' && (
          <div className="animate-scale-in">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Y el ganador es...
            </h1>
            <div className="mt-8 animate-winner-reveal">
              <div className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] animate-shimmer">
                {winner?.name || 'Nadie'}
              </div>
              <div className="text-3xl md:text-5xl text-[#FFD700] mt-4 font-bold">
                {winner?.score || 0} puntos
              </div>
            </div>
          </div>
        )}

        {/* Celebration Phase */}
        {phase === 'celebration' && (
          <div className="space-y-8">
            {/* Winner */}
            <div className="animate-float">
              <div className="text-2xl md:text-3xl text-white mb-2">El ganador</div>
              <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700]">
                {winner?.name || 'Nadie'}
              </div>
              <div className="text-3xl md:text-4xl text-[#FFD700] mt-2 font-bold">
                {winner?.score || 0} puntos
              </div>
            </div>

            {/* Podium */}
            {showPodium && sortedPlayers.length > 1 && (
              <div className="mt-12 animate-slide-up">
                <div className="flex items-end justify-center gap-4 md:gap-8">
                  {/* 2nd Place */}
                  {secondPlace && (
                    <div className="text-center">
                      <div className="text-lg md:text-xl text-gray-300 mb-2">{secondPlace.name}</div>
                      <div className="w-24 md:w-32 h-24 md:h-32 bg-gradient-to-t from-gray-600 to-gray-400 rounded-t-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl md:text-4xl font-bold text-white">2</div>
                          <div className="text-sm text-white/80">{secondPlace.score} pts</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      <span className="animate-bounce inline-block">&#128081;</span>
                    </div>
                    <div className="w-28 md:w-40 h-36 md:h-44 bg-gradient-to-t from-[#B8860B] to-[#FFD700] rounded-t-lg flex items-center justify-center shadow-lg shadow-[#FFD700]/30">
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-bold text-[#0A0A0A]">1</div>
                        <div className="text-sm text-[#0A0A0A]/80 font-semibold">{winner?.score} pts</div>
                      </div>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  {thirdPlace && (
                    <div className="text-center">
                      <div className="text-lg md:text-xl text-gray-300 mb-2">{thirdPlace.name}</div>
                      <div className="w-24 md:w-32 h-20 md:h-24 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl md:text-4xl font-bold text-white">3</div>
                          <div className="text-sm text-white/80">{thirdPlace.score} pts</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rest of leaderboard */}
                {sortedPlayers.length > 3 && (
                  <div className="mt-8 max-w-md mx-auto bg-[#1A1A1A]/80 rounded-xl p-4 border border-[#FFD700]/20">
                    {sortedPlayers.slice(3).map((player, idx) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 font-mono w-6">{idx + 4}.</span>
                          <span className="text-white">{player.name}</span>
                        </div>
                        <span className="text-[#FFD700] font-semibold">{player.score} pts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Play Again Button */}
                <button
                  onClick={onPlayAgain}
                  className="mt-8 px-8 py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0A] font-bold text-xl rounded-xl hover:scale-105 transition-transform shadow-lg shadow-[#FFD700]/30"
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes winner-reveal {
          0% {
            transform: translateY(50px) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes slide-up {
          0% {
            transform: translateY(100px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
        .animate-winner-reveal {
          animation: winner-reveal 1s ease-out forwards;
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
