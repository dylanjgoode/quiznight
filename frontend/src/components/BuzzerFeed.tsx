'use client';

import type { BuzzEntry, Question } from '@/lib/types';

interface BuzzerFeedProps {
  buzzerQueue: BuzzEntry[];
  currentQuestion: Question | null;
  answerRevealed: boolean;
  awardedPlayer: string | null;
  onAwardPoints: (playerId: string, points: number) => void;
}

export default function BuzzerFeed({
  buzzerQueue,
  currentQuestion,
  answerRevealed,
  awardedPlayer,
  onAwardPoints,
}: BuzzerFeedProps) {
  if (!currentQuestion) {
    return null;
  }

  const points = currentQuestion.points || 100;

  return (
    <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
      <h2 className="text-xl font-semibold text-[#FFD700] mb-4 flex items-center gap-2">
        <span>🔔</span> Buzzer Feed
      </h2>

      {buzzerQueue.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No one has buzzed yet...</p>
      ) : (
        <div className="space-y-3">
          {buzzerQueue.map((buzz, index) => {
            const isFirst = index === 0;
            const wasAwarded = awardedPlayer === buzz.player_id;

            return (
              <div
                key={`${buzz.player_id}-${buzz.timestamp}`}
                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                  isFirst
                    ? 'bg-[#FFD700]/20 border-2 border-[#FFD700]'
                    : 'bg-[#0A0A0A]/50 border border-gray-700'
                } ${wasAwarded ? 'ring-2 ring-green-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                      isFirst ? 'bg-[#FFD700] text-[#0A0A0A]' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {buzz.position}
                  </span>
                  <div>
                    <span className={`font-medium ${isFirst ? 'text-[#FFD700] text-lg' : 'text-white'}`}>
                      {buzz.name}
                    </span>
                    {isFirst && <span className="ml-2 text-[#FFEC8B] text-sm">First!</span>}
                  </div>
                </div>

                {answerRevealed && !wasAwarded && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAwardPoints(buzz.player_id, points)}
                      className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      +{points} ✓
                    </button>
                    <button
                      onClick={() => onAwardPoints(buzz.player_id, -Math.floor(points / 2))}
                      className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      -{Math.floor(points / 2)} ✗
                    </button>
                  </div>
                )}

                {wasAwarded && (
                  <span className="text-green-500 font-bold">
                    Awarded! ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {buzzerQueue.length > 0 && answerRevealed && (
        <p className="text-gray-500 text-sm mt-4 text-center">
          Click a button to award or deduct points
        </p>
      )}
    </div>
  );
}
