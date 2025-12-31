'use client';

import { useEffect, useState } from 'react';

interface FirstBuzzAlertProps {
  playerName: string;
  show: boolean;
  onComplete: () => void;
}

export default function FirstBuzzAlert({ playerName, show, onComplete }: FirstBuzzAlertProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit' | 'hidden'>('hidden');

  useEffect(() => {
    if (show) {
      setPhase('enter');
      const showTimer = setTimeout(() => setPhase('show'), 50);
      const exitTimer = setTimeout(() => setPhase('exit'), 900);
      const hideTimer = setTimeout(() => {
        setPhase('hidden');
        onComplete();
      }, 1050);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(exitTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, onComplete]);

  if (phase === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Background flash */}
      <div
        className={`absolute inset-0 bg-[#FFD700] transition-opacity duration-100 ${
          phase === 'enter' || phase === 'show' ? 'opacity-20' : 'opacity-0'
        }`}
      />

      {/* Main alert */}
      <div
        className={`relative transform transition-all duration-150 ${
          phase === 'enter' ? 'scale-0 opacity-0' : ''
        } ${phase === 'show' ? 'scale-100 opacity-100' : ''} ${
          phase === 'exit' ? 'scale-110 opacity-0' : ''
        }`}
      >
        {/* Glow rings */}
        <div className="absolute inset-0 -m-8 animate-ping">
          <div className="w-full h-full rounded-full bg-[#FFD700]/30" />
        </div>
        <div className="absolute inset-0 -m-4 animate-pulse">
          <div className="w-full h-full rounded-full bg-[#FFD700]/20" />
        </div>

        {/* Content */}
        <div className="relative bg-gradient-to-br from-[#FFD700] via-[#FFEC8B] to-[#FFA500] rounded-2xl p-8 shadow-2xl text-center min-w-[300px]">
          {/* Sparkle decorations */}
          <div className="absolute -top-2 -left-2 text-2xl animate-bounce">✨</div>
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</div>
          <div className="absolute -bottom-2 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
          <div className="absolute -bottom-2 -right-2 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>✨</div>

          <div className="text-6xl mb-2">🔔</div>
          <div className="text-[#0A0A0A] font-black text-3xl mb-2 tracking-wider">
            ¡PRIMERO!
          </div>
          <div className="text-[#0A0A0A]/80 text-2xl font-bold">
            {playerName}
          </div>
        </div>
      </div>
    </div>
  );
}
