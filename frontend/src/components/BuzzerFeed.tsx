'use client';

import { useState, useEffect } from 'react';
import type { BuzzEntry, Question } from '@/lib/types';

interface BuzzerFeedProps {
  buzzerQueue: BuzzEntry[];
  currentQuestion: Question | null;
  answerRevealed: boolean;
  awardedPlayers: Set<string>;
  onAwardPoints: (playerId: string, points: number) => void;
}

type Selection = 'correct' | 'wrong' | null;

// Points multiplier based on buzz position
const getPointsMultiplier = (position: number): number => {
  switch (position) {
    case 1: return 1.0;    // 100%
    case 2: return 0.75;   // 75%
    case 3: return 0.5;    // 50%
    default: return 0.25;  // 25% for 4th and beyond
  }
};

export default function BuzzerFeed({
  buzzerQueue,
  currentQuestion,
  answerRevealed,
  awardedPlayers,
  onAwardPoints,
}: BuzzerFeedProps) {
  const [selections, setSelections] = useState<Record<string, Selection>>({});

  // Reset selections when question changes
  useEffect(() => {
    setSelections({});
  }, [currentQuestion]);

  if (!currentQuestion) {
    return null;
  }

  const basePoints = currentQuestion.points || 100;

  const toggleSelection = (playerId: string, selection: Selection) => {
    setSelections(prev => ({
      ...prev,
      [playerId]: prev[playerId] === selection ? null : selection
    }));
  };

  const applyAll = () => {
    buzzerQueue.forEach(buzz => {
      const selection = selections[buzz.player_id];
      if (selection && !awardedPlayers.has(buzz.player_id)) {
        const multiplier = getPointsMultiplier(buzz.position);
        const earnPoints = Math.floor(basePoints * multiplier);
        const penaltyPoints = Math.floor((basePoints / 2) * multiplier);

        if (selection === 'correct') {
          onAwardPoints(buzz.player_id, earnPoints);
        } else {
          onAwardPoints(buzz.player_id, -penaltyPoints);
        }
      }
    });
    setSelections({});
  };

  const selectAllCorrect = () => {
    const newSelections: Record<string, Selection> = {};
    buzzerQueue.forEach(buzz => {
      if (!awardedPlayers.has(buzz.player_id)) {
        newSelections[buzz.player_id] = 'correct';
      }
    });
    setSelections(newSelections);
  };

  const selectAllWrong = () => {
    const newSelections: Record<string, Selection> = {};
    buzzerQueue.forEach(buzz => {
      if (!awardedPlayers.has(buzz.player_id)) {
        newSelections[buzz.player_id] = 'wrong';
      }
    });
    setSelections(newSelections);
  };

  const clearSelections = () => {
    setSelections({});
  };

  const hasSelections = Object.values(selections).some(s => s !== null);
  const unawardedCount = buzzerQueue.filter(b => !awardedPlayers.has(b.player_id)).length;

  return (
    <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
      <h2 className="text-xl font-semibold text-[#FFD700] mb-4 flex items-center gap-2">
        <span>🔔</span> Buzzer Feed
      </h2>

      {buzzerQueue.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No one has buzzed yet...</p>
      ) : (
        <>
          {/* Quick select buttons */}
          {answerRevealed && unawardedCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={selectAllCorrect}
                className="text-xs bg-green-600/20 border border-green-600 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
              >
                Select All ✓
              </button>
              <button
                onClick={selectAllWrong}
                className="text-xs bg-red-600/20 border border-red-600 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
              >
                Select All ✗
              </button>
              {hasSelections && (
                <button
                  onClick={clearSelections}
                  className="text-xs bg-gray-600/20 border border-gray-600 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {buzzerQueue.map((buzz, index) => {
              const isFirst = index === 0;
              const isAwarded = awardedPlayers.has(buzz.player_id);
              const multiplier = getPointsMultiplier(buzz.position);
              const earnPoints = Math.floor(basePoints * multiplier);
              const penaltyPoints = Math.floor((basePoints / 2) * multiplier);
              const selection = selections[buzz.player_id];

              return (
                <div
                  key={`${buzz.player_id}-${buzz.timestamp}`}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    isFirst
                      ? 'bg-[#FFD700]/20 border-2 border-[#FFD700]'
                      : 'bg-[#0A0A0A]/50 border border-gray-700'
                  } ${isAwarded ? 'opacity-50' : ''} ${
                    selection === 'correct' ? 'ring-2 ring-green-500' : ''
                  } ${selection === 'wrong' ? 'ring-2 ring-red-500' : ''}`}
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
                      {isFirst && !isAwarded && <span className="ml-2 text-[#FFEC8B] text-sm">First!</span>}
                      {!isFirst && !isAwarded && (
                        <span className="ml-2 text-gray-500 text-xs">
                          ({Math.floor(multiplier * 100)}%)
                        </span>
                      )}
                      {isAwarded && (
                        <span className="ml-2 text-green-500 text-sm">✓ Done</span>
                      )}
                    </div>
                  </div>

                  {answerRevealed && !isAwarded && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSelection(buzz.player_id, 'correct')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selection === 'correct'
                            ? 'bg-green-500 text-white scale-105'
                            : 'bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                        }`}
                      >
                        +{earnPoints}
                      </button>
                      <button
                        onClick={() => toggleSelection(buzz.player_id, 'wrong')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selection === 'wrong'
                            ? 'bg-red-500 text-white scale-105'
                            : 'bg-red-600/20 border border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        -{penaltyPoints}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Apply All Button */}
          {answerRevealed && hasSelections && (
            <button
              onClick={applyAll}
              className="w-full mt-4 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0A] font-bold rounded-lg hover:opacity-90 transition-opacity text-lg"
            >
              Apply Points
            </button>
          )}

          {/* Points scale hint */}
          {answerRevealed && unawardedCount > 0 && !hasSelections && (
            <p className="text-gray-600 text-xs mt-4 text-center">
              1st: 100% · 2nd: 75% · 3rd: 50% · 4th+: 25%
            </p>
          )}
        </>
      )}
    </div>
  );
}
