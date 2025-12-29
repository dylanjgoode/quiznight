'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { WS_URL } from '@/lib/config';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSounds } from '@/hooks/useSounds';
import type { Player, WebSocketMessage, PlayerInitMessage } from '@/lib/types';
import Leaderboard from '@/components/Leaderboard';
import confetti from 'canvas-confetti';

export default function PlayerGame() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const playerName = searchParams.get('name') || '';
  const { playSound } = useSounds();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState(0);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [awardedPlayer, setAwardedPlayer] = useState<string | null>(null);
  const [pointsReceived, setPointsReceived] = useState<number | null>(null);

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleMessage = useCallback(
    (data: unknown) => {
      const message = data as WebSocketMessage;

      switch (message.type) {
        case 'init':
          if ('player_id' in message) {
            const playerInit = message as PlayerInitMessage;
            setPlayerId(playerInit.player_id);
            setScore(playerInit.score);
            setPosition(playerInit.position);
            setBuzzerActive(playerInit.buzzer_active);
            setPlayers(playerInit.leaderboard);
          }
          break;
        case 'buzzer_active':
          setBuzzerActive(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          playSound('start');
          triggerHaptic();
          break;
        case 'buzzer_locked':
          setBuzzerActive(false);
          break;
        case 'timer_tick':
          setTimerRemaining(message.remaining);
          break;
        case 'timer_expired':
          setBuzzerActive(false);
          break;
        case 'buzz_confirmed':
          setBuzzPosition(message.position);
          setHasBuzzed(true);
          playSound('buzzer');
          triggerHaptic();
          break;
        case 'leaderboard_update':
          setPlayers(message.leaderboard);
          const myPlayer = message.leaderboard.find((p: Player) => p.id === playerId);
          if (myPlayer) {
            setScore(myPlayer.score);
            setPosition(myPlayer.position);
          }
          if (message.awarded_player) {
            setAwardedPlayer(message.awarded_player);
            if (message.awarded_player === playerId && message.points) {
              setPointsReceived(message.points);
              if (message.points > 0) {
                playSound('celebration');
                confetti({
                  particleCount: 150,
                  spread: 100,
                  origin: { y: 0.6 },
                  colors: ['#FFD700', '#FFEC8B', '#FFA500', '#FF69B4'],
                });
              } else {
                playSound('wrong');
              }
              setTimeout(() => setPointsReceived(null), 3000);
            }
            setTimeout(() => setAwardedPlayer(null), 2000);
          }
          break;
        case 'question_cleared':
          setBuzzerActive(false);
          setHasBuzzed(false);
          setBuzzPosition(null);
          break;
        case 'kicked':
          router.push('/');
          break;
      }
    },
    [playerId, playSound, router]
  );

  const { isConnected, sendMessage, reconnectCount } = useWebSocket(
    roomId && playerName ? `${WS_URL}/ws/player/${roomId}/${encodeURIComponent(playerName)}` : null,
    { onMessage: handleMessage }
  );

  const buzz = useCallback(() => {
    if (buzzerActive && !hasBuzzed) {
      sendMessage({ type: 'buzz' });
    }
  }, [buzzerActive, hasBuzzed, sendMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && buzzerActive && !hasBuzzed) {
        e.preventDefault();
        buzz();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buzzerActive, hasBuzzed, buzz]);

  if (!playerName) {
    router.push(`/join/${roomId}`);
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-[#FFD700] text-xl mb-4">
            {reconnectCount > 0 ? 'Reconnecting...' : 'Connecting to game...'}
          </div>
          <div className="animate-spin w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto"></div>
          {reconnectCount > 0 && (
            <p className="text-gray-500 text-sm mt-4">Attempt {reconnectCount}/5</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 bg-[#1A1A1A]/80 border-b border-[#FFD700]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="text-gray-400 hover:text-[#FFD700] transition-colors"
              title="Back to Home"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#FFD700]">{playerName}</h1>
              <p className="text-gray-400 text-sm">Position #{position}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#FFD700]">{score}</div>
            <p className="text-gray-400 text-sm">points</p>
          </div>
        </div>
      </div>

      {pointsReceived !== null && (
        <div
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full font-bold text-2xl animate-bounce ${
            pointsReceived > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {pointsReceived > 0 ? '+' : ''}{pointsReceived} points!
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {buzzerActive && (
          <div className="mb-8">
            <div
              className={`text-6xl font-bold font-mono ${
                timerRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-[#FFD700]'
              }`}
            >
              {timerRemaining}
            </div>
          </div>
        )}

        <button
          onClick={buzz}
          disabled={!buzzerActive || hasBuzzed}
          className={`w-64 h-64 md:w-80 md:h-80 rounded-full font-bold text-3xl transition-all transform ${
            buzzerActive && !hasBuzzed
              ? 'bg-gradient-to-br from-[#FFD700] to-[#DAA520] text-[#0A0A0A] active:scale-95 buzzer-active shadow-2xl'
              : hasBuzzed
              ? buzzPosition === 1
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {hasBuzzed ? (
            <div className="flex flex-col items-center">
              <span className="text-5xl mb-2">
                {buzzPosition === 1 ? '🥇' : `#${buzzPosition}`}
              </span>
              <span className="text-xl">
                {buzzPosition === 1 ? 'First!' : 'Buzzed!'}
              </span>
            </div>
          ) : buzzerActive ? (
            <div className="flex flex-col items-center">
              <span className="text-5xl mb-2">🔔</span>
              <span>BUZZ!</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2">⏳</span>
              <span className="text-xl">Wait...</span>
            </div>
          )}
        </button>

        <p className="mt-8 text-gray-400 text-center">
          {buzzerActive && !hasBuzzed
            ? 'Tap the button or press SPACE to buzz!'
            : hasBuzzed
            ? 'Waiting for the host...'
            : 'Watch the host screen for the question!'}
        </p>
      </div>

      <div className="p-4 bg-[#1A1A1A]/80 border-t border-[#FFD700]/30">
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="w-full py-3 bg-[#0A0A0A] border border-[#FFD700]/30 text-[#FFD700] rounded-lg"
        >
          {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
        </button>
      </div>

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-end">
          <div className="w-full max-h-[70vh] overflow-y-auto bg-[#1A1A1A] rounded-t-2xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#FFD700]">Leaderboard</h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <Leaderboard
              players={players}
              awardedPlayer={awardedPlayer}
              currentPlayerId={playerId || undefined}
            />
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-4 right-4 w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />
    </div>
  );
}
