'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { WS_URL, API_URL } from '@/lib/config';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSounds } from '@/hooks/useSounds';
import type { Player, Question, BuzzEntry, WebSocketMessage, HostInitMessage, MiniGamePosition, ScoringResult } from '@/lib/types';
import Leaderboard from '@/components/Leaderboard';
import BuzzerFeed from '@/components/BuzzerFeed';
import BoatRace from '@/components/BoatRace';
import Timer from '@/components/Timer';
import QuestionCard from '@/components/QuestionCard';
import ScorePopup, { type ScoreChange } from '@/components/ScorePopup';
import WinnerScreen from '@/components/WinnerScreen';
import confetti from 'canvas-confetti';

interface QuestionsData {
  categories: Record<string, Question[]>;
}

export default function HostGame() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { playSound } = useSounds();

  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionsData>({ categories: {} });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzEntry[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [lastAwardedPlayer, setLastAwardedPlayer] = useState<string | null>(null);
  const [scoreChanges, setScoreChanges] = useState<ScoreChange[]>([]);
  // Answer selection state
  const [answerCount, setAnswerCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [scoringResults, setScoringResults] = useState<ScoringResult[]>([]);
  const [correctLetter, setCorrectLetter] = useState<string | null>(null);
  // Mini-game state
  const [miniGameActive, setMiniGameActive] = useState(false);
  const [miniGamePositions, setMiniGamePositions] = useState<Record<string, MiniGamePosition>>({});
  const [miniGameWinners, setMiniGameWinners] = useState<string[]>([]);
  // Game ended state
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/questions`)
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch(console.error);
  }, []);

  const handleMessage = useCallback(
    (data: unknown) => {
      const message = data as WebSocketMessage;

      switch (message.type) {
        case 'init':
          if ('room_code' in message) {
            const hostInit = message as HostInitMessage;
            setRoomCode(hostInit.room_code);
            setPlayers(hostInit.players);
            setCategories(hostInit.categories);
            setTimerSeconds(hostInit.timer_seconds);
            // Mini-game state
            if (hostInit.mini_game) {
              setMiniGamePositions(hostInit.mini_game.positions);
              setMiniGameWinners(hostInit.mini_game.winners);
            }
            setMiniGameActive(hostInit.mini_game_active);
          }
          break;
        case 'player_joined':
          setPlayers(message.leaderboard);
          playSound('start');
          break;
        case 'player_disconnected':
        case 'player_left':
          setPlayers(message.leaderboard);
          break;
        case 'player_buzzed':
          // Legacy support - still used for mini-game?
          setBuzzerQueue(message.buzzer_queue);
          playSound('buzzer');
          break;
        case 'answer_count_update':
          // New: update answer count
          setAnswerCount(message.count);
          setTotalPlayers(message.total_players);
          if (message.count === 1) {
            playSound('buzzer');  // Sound on first answer
          }
          break;
        case 'timer_tick':
          setTimerRemaining(message.remaining);
          if (message.remaining <= 3 && message.remaining > 0) {
            playSound('tick');
          }
          break;
        case 'timer_expired':
          setBuzzerActive(false);
          break;
        case 'leaderboard_update':
          setPlayers(message.leaderboard);
          // Handle mini-game bonus points (boat race)
          if (message.awarded_player && message.points) {
            const awardedId = message.awarded_player as string;
            const awardedPlayerData = message.leaderboard.find(
              (p: Player) => p.id === awardedId
            );

            // Add floating score popup for mini-game bonus
            const scoreChange: ScoreChange = {
              id: `${awardedId}-${Date.now()}`,
              playerId: awardedId,
              playerName: awardedPlayerData?.name || 'Player',
              points: message.points,
              timestamp: Date.now(),
            };
            setScoreChanges((prev) => [...prev, scoreChange]);

            if (message.points > 0) {
              setLastAwardedPlayer(awardedId);
              playSound('correct');
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFEC8B', '#FFA500'],
              });
              setTimeout(() => setLastAwardedPlayer(null), 2000);
            }
          }
          break;
        case 'answer_revealed':
          setAnswerRevealed(true);
          setBuzzerActive(false);
          if (message.scoring_results) {
            setScoringResults(message.scoring_results);
            // Show score popups for all players
            message.scoring_results.forEach((result: ScoringResult) => {
              const scoreChange: ScoreChange = {
                id: `${result.player_id}-${Date.now()}-${Math.random()}`,
                playerId: result.player_id,
                playerName: result.name,
                points: result.points,
                timestamp: Date.now(),
              };
              setScoreChanges((prev) => [...prev, scoreChange]);
            });
            // Play celebration sound if anyone got it right
            const correctCount = message.scoring_results.filter((r: ScoringResult) => r.is_correct).length;
            if (correctCount > 0) {
              playSound('correct');
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFEC8B', '#FFA500'],
              });
            } else {
              playSound('wrong');
            }
          }
          if (message.correct_letter) {
            setCorrectLetter(message.correct_letter);
          }
          if (message.leaderboard) {
            setPlayers(message.leaderboard);
          }
          break;
        case 'question_cleared':
          setCurrentQuestion(null);
          setBuzzerQueue([]);
          setAnswerRevealed(false);
          setBuzzerActive(false);
          setAnswerCount(0);
          setTotalPlayers(0);
          setScoringResults([]);
          setCorrectLetter(null);
          break;
        case 'mini_game_update':
          setMiniGamePositions(message.positions);
          setMiniGameWinners(message.winners);
          break;
        case 'mini_game_ended':
          setMiniGameActive(false);
          break;
      }
    },
    [playSound]
  );

  const { isConnected, sendMessage } = useWebSocket(
    roomId ? `${WS_URL}/ws/host/${roomId}` : null,
    { onMessage: handleMessage }
  );

  const selectCategory = (category: string) => {
    setCurrentCategory(category);
    setQuestionIndex(0);
    sendMessage({ type: 'select_category', category });
  };

  const startQuestion = () => {
    if (!currentCategory) return;
    const categoryQuestions = questions.categories[currentCategory] || [];
    if (questionIndex >= categoryQuestions.length) return;

    const question = categoryQuestions[questionIndex];
    setCurrentQuestion(question);
    setBuzzerQueue([]);
    setAnswerRevealed(false);
    setBuzzerActive(true);
    setAnswerCount(0);
    setTotalPlayers(players.filter(p => p.connected).length);
    setScoringResults([]);
    setCorrectLetter(null);
    sendMessage({ type: 'start_question', question });
    playSound('start');
  };

  const stopQuestion = () => {
    setBuzzerActive(false);
    sendMessage({ type: 'stop_question' });
  };

  const revealAnswer = () => {
    sendMessage({ type: 'reveal_answer' });
    setAnswerRevealed(true);
  };

  const awardPoints = (playerId: string, points: number) => {
    sendMessage({ type: 'award_points', player_id: playerId, points });
  };

  const adjustScore = (playerId: string, newScore: number) => {
    sendMessage({ type: 'adjust_score', player_id: playerId, score: newScore });
  };

  const nextQuestion = () => {
    if (!currentCategory) return;
    const categoryQuestions = questions.categories[currentCategory] || [];
    const nextIndex = questionIndex + 1;

    // Clear current state
    setBuzzerQueue([]);
    setAnswerRevealed(false);
    setAnswerCount(0);
    setScoringResults([]);
    setCorrectLetter(null);
    setQuestionIndex(nextIndex);

    if (nextIndex < categoryQuestions.length) {
      // Automatically start next question (don't send next_question, go straight to start)
      const nextQ = categoryQuestions[nextIndex];
      setCurrentQuestion(nextQ);
      setBuzzerActive(true);
      setTotalPlayers(players.filter(p => p.connected).length);
      sendMessage({ type: 'start_question', question: nextQ });
      playSound('start');
    } else {
      // No more questions in category - go back to selection
      setCurrentQuestion(null);
      setBuzzerActive(false);
      sendMessage({ type: 'next_question' });
    }
  };

  const updateTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    sendMessage({ type: 'set_timer', seconds });
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
  };

  const removeScoreChange = useCallback((id: string) => {
    setScoreChanges((prev) => prev.filter((change) => change.id !== id));
  }, []);

  const endGame = () => {
    setGameEnded(true);
  };

  const handlePlayAgain = () => {
    window.location.href = '/';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#FFD700] text-xl mb-4">Conectando al juego...</div>
          <div className="animate-spin w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show winner screen when game ends
  if (gameEnded) {
    return <WinnerScreen players={players} onPlayAgain={handlePlayAgain} />;
  }

  const categoryQuestions = currentCategory ? questions.categories[currentCategory] || [] : [];
  const hasMoreQuestions = questionIndex < categoryQuestions.length;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      {/* Score Change Popups */}
      <ScorePopup changes={scoreChanges} onRemove={removeScoreChange} />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="text-gray-400 hover:text-[#FFD700] transition-colors"
              title="Volver al inicio"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#FFD700]">Noche de Trivia - Anfitrión</h1>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-gray-400">
              Código de sala: <span className="text-[#FFD700] font-mono font-bold text-xl">{roomCode}</span>
            </span>
            <button
              onClick={copyJoinLink}
              className="text-sm bg-[#1A1A1A] border border-[#FFD700]/30 text-[#FFD700] px-3 py-1 rounded hover:bg-[#FFD700] hover:text-[#0A0A0A] transition-colors"
            >
              Copiar enlace
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Tiempo:</span>
            <select
              value={timerSeconds}
              onChange={(e) => updateTimer(Number(e.target.value))}
              className="bg-[#1A1A1A] border border-[#FFD700]/30 text-white px-3 py-1 rounded"
            >
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
            </select>
          </div>
          <button
            onClick={endGame}
            className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Terminar juego
          </button>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Mini-game boat race when waiting for game to start */}
          {miniGameActive && !currentQuestion && Object.keys(miniGamePositions).length > 0 && (
            <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
              <BoatRace
                positions={miniGamePositions}
                winners={miniGameWinners}
                isHost={true}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => sendMessage({ type: 'end_mini_game' })}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Terminar carrera
                </button>
              </div>
            </div>
          )}

          {!currentQuestion && (
            <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
              <h2 className="text-xl font-semibold text-[#FFD700] mb-4">
                {currentCategory ? currentCategory : 'Seleccionar categoría'}
              </h2>

              {/* Question Progress Bar */}
              {currentCategory && categoryQuestions.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progreso</span>
                    <span>Pregunta {questionIndex + 1} de {categoryQuestions.length}</span>
                  </div>
                  <div className="h-3 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] transition-all duration-500 ease-out"
                      style={{ width: `${((questionIndex + 1) / categoryQuestions.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    {categoryQuestions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx < questionIndex ? 'bg-[#FFD700]' : idx === questionIndex ? 'bg-[#FFD700] ring-2 ring-[#FFD700]/50' : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mb-6">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      currentCategory === cat
                        ? 'bg-[#FFD700] text-[#0A0A0A]'
                        : 'bg-[#0A0A0A] border border-[#FFD700]/30 text-white hover:border-[#FFD700]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {currentCategory && hasMoreQuestions && (
                <button onClick={startQuestion} className="btn-gold text-lg px-8">
                  Empezar pregunta
                </button>
              )}
              {currentCategory && !hasMoreQuestions && (
                <p className="text-gray-400">¡No hay más preguntas en esta categoría!</p>
              )}
            </div>
          )}

          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              answerRevealed={answerRevealed}
              buzzerActive={buzzerActive}
              onStop={stopQuestion}
              onReveal={revealAnswer}
              onNext={nextQuestion}
            />
          )}

          {buzzerActive && currentQuestion?.type !== 'music' && <Timer seconds={timerRemaining} total={timerSeconds} />}

          <BuzzerFeed
            buzzerQueue={buzzerQueue}
            currentQuestion={currentQuestion}
            answerRevealed={answerRevealed}
            answerCount={answerCount}
            totalPlayers={totalPlayers}
            scoringResults={scoringResults}
            correctLetter={correctLetter}
          />
        </div>

        <div className="lg:col-span-1">
          <Leaderboard
            players={players}
            awardedPlayer={lastAwardedPlayer}
            isHost={true}
            onAdjustScore={adjustScore}
          />
        </div>
      </div>
    </div>
  );
}
