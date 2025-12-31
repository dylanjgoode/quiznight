'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { WS_URL } from '@/lib/config';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSounds } from '@/hooks/useSounds';
import type { Player, WebSocketMessage, PlayerInitMessage, MiniGamePosition, ScoringResult } from '@/lib/types';
import Leaderboard from '@/components/Leaderboard';
import BoatRace from '@/components/BoatRace';
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pointsReceived, setPointsReceived] = useState<number | null>(null);
  // Answer selection state
  const [questionActive, setQuestionActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerPosition, setAnswerPosition] = useState<number | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  // Mini-game state
  const [miniGameActive, setMiniGameActive] = useState(false);
  const [miniGamePositions, setMiniGamePositions] = useState<Record<string, MiniGamePosition>>({});
  const [miniGameWinners, setMiniGameWinners] = useState<string[]>([]);

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
            setQuestionActive(playerInit.buzzer_active || playerInit.question_active || false);
            setPlayers(playerInit.leaderboard);
            // Mini-game state
            if (playerInit.mini_game) {
              setMiniGamePositions(playerInit.mini_game.positions);
              setMiniGameWinners(playerInit.mini_game.winners);
            }
            setMiniGameActive(playerInit.mini_game_active);
          }
          break;
        case 'question_started':
          // New question started - show answer options
          setQuestionActive(true);
          setSelectedAnswer(null);
          setAnswerPosition(null);
          setAnswerLocked(false);
          setScoringResult(null);
          if ('timer' in message) {
            setTimerRemaining(message.timer);
          }
          playSound('start');
          triggerHaptic();
          break;
        case 'buzzer_active':
          // Legacy support - treat as question_started
          setQuestionActive(true);
          setSelectedAnswer(null);
          setAnswerPosition(null);
          setAnswerLocked(false);
          setScoringResult(null);
          playSound('start');
          triggerHaptic();
          break;
        case 'buzzer_locked':
          setQuestionActive(false);
          break;
        case 'timer_tick':
          setTimerRemaining(message.remaining);
          break;
        case 'timer_expired':
          setQuestionActive(false);
          break;
        case 'answer_confirmed':
          // Answer was recorded
          setAnswerPosition(message.position);
          setAnswerLocked(true);
          playSound('buzzer');
          triggerHaptic();
          break;
        case 'answer_revealed':
          // Auto-scoring complete - show results
          setQuestionActive(false);
          if (message.scoring_results && playerId) {
            const myResult = message.scoring_results.find(
              (r: ScoringResult) => r.player_id === playerId
            );
            if (myResult) {
              setScoringResult(myResult);
              setPointsReceived(myResult.points);
              if (myResult.points > 0) {
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
          }
          if (message.leaderboard) {
            setPlayers(message.leaderboard);
            const myPlayer = message.leaderboard.find((p: Player) => p.id === playerId);
            if (myPlayer) {
              setScore(myPlayer.score);
              setPosition(myPlayer.position);
            }
          }
          break;
        case 'leaderboard_update':
          setPlayers(message.leaderboard);
          const myPlayer = message.leaderboard.find((p: Player) => p.id === playerId);
          if (myPlayer) {
            setScore(myPlayer.score);
            setPosition(myPlayer.position);
          }
          // Mini-game bonus points
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
            }
            setTimeout(() => setPointsReceived(null), 3000);
          }
          break;
        case 'question_cleared':
          setQuestionActive(false);
          setSelectedAnswer(null);
          setAnswerPosition(null);
          setAnswerLocked(false);
          setScoringResult(null);
          break;
        case 'kicked':
          router.push('/');
          break;
        case 'mini_game_update':
          setMiniGamePositions(message.positions);
          setMiniGameWinners(message.winners);
          break;
        case 'mini_game_ended':
          setMiniGameActive(false);
          break;
        case 'mini_game_bonus':
          // Show bonus points notification
          setPointsReceived(message.points);
          playSound('celebration');
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFEC8B', '#FFA500'],
          });
          setTimeout(() => setPointsReceived(null), 3000);
          break;
      }
    },
    [playerId, playSound, router]
  );

  const { isConnected, sendMessage, reconnectCount } = useWebSocket(
    roomId && playerName ? `${WS_URL}/ws/player/${roomId}/${encodeURIComponent(playerName)}` : null,
    { onMessage: handleMessage }
  );

  // Submit answer (A, B, C, or D)
  const submitAnswer = useCallback((answer: string) => {
    if (!answerLocked && questionActive) {
      setSelectedAnswer(answer);
      sendMessage({ type: 'submit_answer', answer });
    }
  }, [answerLocked, questionActive, sendMessage]);

  // Mini-game buzz (boat race only)
  const miniGameBuzz = useCallback(() => {
    if (miniGameActive && !questionActive) {
      const myPosition = playerId ? miniGamePositions[playerId] : null;
      if (!myPosition?.finished) {
        sendMessage({ type: 'buzz' });
        triggerHaptic();
      }
    }
  }, [miniGameActive, questionActive, playerId, miniGamePositions, sendMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys or A/B/C/D for answers
      if (questionActive && !answerLocked) {
        const keyMap: Record<string, string> = {
          'KeyA': 'A', 'Digit1': 'A',
          'KeyB': 'B', 'Digit2': 'B',
          'KeyC': 'C', 'Digit3': 'C',
          'KeyD': 'D', 'Digit4': 'D',
        };
        if (e.code in keyMap) {
          e.preventDefault();
          submitAnswer(keyMap[e.code]);
        }
      }
      // Space for mini-game
      if (e.code === 'Space') {
        const myPosition = playerId ? miniGamePositions[playerId] : null;
        const canBuzzMiniGame = miniGameActive && !questionActive && !myPosition?.finished;
        if (canBuzzMiniGame) {
          e.preventDefault();
          miniGameBuzz();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questionActive, answerLocked, miniGameActive, playerId, miniGamePositions, submitAnswer, miniGameBuzz]);

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
        {/* Mini-game boat race when waiting */}
        {miniGameActive && !questionActive && !scoringResult && (
          <div className="w-full max-w-md mb-6">
            <BoatRace
              positions={miniGamePositions}
              winners={miniGameWinners}
              currentPlayerId={playerId || undefined}
            />
          </div>
        )}

        {/* Timer during question */}
        {questionActive && (
          <div className="mb-6">
            <div
              className={`text-5xl font-bold font-mono ${
                timerRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-[#FFD700]'
              }`}
            >
              {timerRemaining}
            </div>
          </div>
        )}

        {/* Answer Selection UI */}
        {questionActive && !answerLocked && (
          <div className="w-full max-w-sm">
            <p className="text-center text-gray-400 mb-4 text-sm">Look at the big screen!</p>
            <div className="grid grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map((letter) => (
                <button
                  key={letter}
                  onClick={() => submitAnswer(letter)}
                  className="aspect-square rounded-2xl font-bold text-5xl md:text-6xl transition-all transform
                    bg-gradient-to-br from-[#FFD700] to-[#DAA520] text-[#0A0A0A]
                    active:scale-95 hover:shadow-lg shadow-md"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Answer Locked - waiting for reveal */}
        {answerLocked && !scoringResult && (
          <div className="text-center">
            <div className="text-7xl mb-4">
              {answerPosition === 1 ? '🥇' : answerPosition === 2 ? '🥈' : answerPosition === 3 ? '🥉' : `#${answerPosition}`}
            </div>
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#DAA520] text-[#0A0A0A] font-bold text-5xl flex items-center justify-center mb-4">
              {selectedAnswer}
            </div>
            <p className="text-[#FFD700] text-xl font-semibold">Answer locked!</p>
            <p className="text-gray-400 mt-2">
              {answerPosition === 1 ? 'First to answer!' : `Position #${answerPosition}`}
            </p>
          </div>
        )}

        {/* Scoring Result */}
        {scoringResult && (
          <div className={`text-center p-8 rounded-2xl ${
            scoringResult.is_correct ? 'bg-green-500/20 border-2 border-green-500' : 'bg-red-500/20 border-2 border-red-500'
          }`}>
            <div className="text-7xl mb-4">
              {scoringResult.is_correct ? '✓' : '✗'}
            </div>
            {scoringResult.answer && (
              <p className="text-gray-300 mb-2">You answered: {scoringResult.answer}</p>
            )}
            {!scoringResult.answer && (
              <p className="text-gray-400 mb-2">No answer submitted</p>
            )}
            <p className={`text-3xl font-bold ${
              scoringResult.points > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {scoringResult.points > 0 ? '+' : ''}{scoringResult.points} points
            </p>
          </div>
        )}

        {/* Mini-game button when no question */}
        {!questionActive && !scoringResult && (() => {
          const myPosition = playerId ? miniGamePositions[playerId] : null;
          const isMiniGameMode = miniGameActive;
          const hasFinishedRace = myPosition?.finished;

          if (isMiniGameMode) {
            return (
              <button
                onClick={miniGameBuzz}
                disabled={hasFinishedRace}
                className={`w-64 h-64 md:w-80 md:h-80 rounded-full font-bold text-3xl transition-all transform ${
                  !hasFinishedRace
                    ? 'bg-gradient-to-br from-[#4a90d9] to-[#2563eb] text-white active:scale-95 shadow-2xl'
                    : 'bg-green-600 text-white'
                }`}
              >
                {hasFinishedRace ? (
                  <div className="flex flex-col items-center">
                    <span className="text-5xl mb-2">🏁</span>
                    <span className="text-xl">Finished!</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-5xl mb-2">🚣</span>
                    <span>ROW!</span>
                  </div>
                )}
              </button>
            );
          }

          return (
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-gray-400 text-xl">Waiting for next question...</p>
            </div>
          );
        })()}

        <p className="mt-8 text-gray-400 text-center text-sm">
          {questionActive && !answerLocked
            ? 'Tap an answer or press A/B/C/D!'
            : answerLocked && !scoringResult
            ? 'Waiting for the host to reveal...'
            : scoringResult
            ? 'Get ready for the next question!'
            : miniGameActive && !questionActive
            ? 'Spam the button to row your boat!'
            : 'Watch the host screen!'}
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
