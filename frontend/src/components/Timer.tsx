'use client';

interface TimerProps {
  seconds: number;
  total: number;
}

export default function Timer({ seconds, total }: TimerProps) {
  const percentage = (seconds / total) * 100;
  const isLow = seconds <= 5;
  const isCritical = seconds <= 3;

  return (
    <div className="bg-[#1A1A1A]/80 rounded-xl p-4 border border-[#FFD700]/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400">Time Remaining</span>
        <span
          className={`text-3xl font-bold font-mono ${
            isCritical ? 'text-red-500 animate-pulse' : isLow ? 'text-orange-500' : 'text-[#FFD700]'
          }`}
        >
          {seconds}s
        </span>
      </div>
      <div className="h-3 bg-[#0A0A0A] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-[#FFD700]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
