'use client';

import { useEffect, useState } from 'react';

interface ScoreChange {
  id: string;
  playerId: string;
  playerName: string;
  points: number;
  timestamp: number;
}

interface ScorePopupProps {
  changes: ScoreChange[];
  onRemove: (id: string) => void;
}

export default function ScorePopup({ changes, onRemove }: ScorePopupProps) {
  return (
    <div className="fixed top-20 right-8 z-40 pointer-events-none">
      <div className="space-y-2">
        {changes.map((change) => (
          <ScorePopupItem key={change.id} change={change} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function ScorePopupItem({ change, onRemove }: { change: ScoreChange; onRemove: (id: string) => void }) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const isPositive = change.points > 0;

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase('show'), 50);
    const exitTimer = setTimeout(() => setPhase('exit'), 2000);
    const removeTimer = setTimeout(() => onRemove(change.id), 2500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [change.id, onRemove]);

  return (
    <div
      className={`transform transition-all duration-500 ${
        phase === 'enter' ? 'translate-x-20 opacity-0' : ''
      } ${phase === 'show' ? 'translate-x-0 opacity-100' : ''} ${
        phase === 'exit' ? '-translate-y-4 opacity-0' : ''
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
          isPositive
            ? 'bg-gradient-to-r from-green-600 to-green-500'
            : 'bg-gradient-to-r from-red-600 to-red-500'
        }`}
      >
        <span className="text-3xl">{isPositive ? '🎉' : '😢'}</span>
        <div className="text-white">
          <div className="font-bold text-lg">{change.playerName}</div>
          <div className={`text-2xl font-black ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
            {isPositive ? '+' : ''}{change.points}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ScoreChange };
