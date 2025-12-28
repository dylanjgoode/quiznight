'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { WS_URL, API_URL } from '@/lib/config';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSounds } from '@/hooks/useSounds';
import type { Player, Question, BuzzEntry, WebSocketMessage, HostInitMessage } from '@/lib/types';
import Leaderboard from '@/components/Leaderboard';
import BuzzerFeed from '@/components/BuzzerFeed';
import Timer from '@/components/Timer';
import QuestionCard from '@/components/QuestionCard';
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
  const [awardedPlayer, setAwardedPlayer] = useState<string | null>(null);

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
          setBuzzerQueue(message.buzzer_queue);
          playSound('buzzer');
          break;
        case 'timer_tick':
          setTimerRemaining(message.remaining);
          if (message.remaining <= 3 && message.remaining > 0) {
            playSound('tick');
          }
          break;
        case 'timer_expired':
          setBuzzerActive(false);
          setBuzzerQueue(message.buzzer_queue);
          break;
        case 'leaderboard_update':
          setPlayers(message.leaderboard);
          if (message.awarded_player && message.points && message.points > 0) {
            setAwardedPlayer(message.awarded_player);
            playSound('correct');
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFEC8B', '#FFA500'],
            });
            setTimeout(() => setAwardedPlayer(null), 2000);
          } else if (message.awarded_player && message.points && message.points < 0) {
            playSound('wrong');
          }
          break;
        case 'answer_revealed':
          setAnswerRevealed(true);
          break;
        case 'question_cleared':
          setCurrentQuestion(null);
          setBuzzerQueue([]);
          setAnswerRevealed(false);
          setBuzzerActive(false);
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
    setQuestionIndex((prev) => prev + 1);
    setCurrentQuestion(null);
    setBuzzerQueue([]);
    setAnswerRevealed(false);
    sendMessage({ type: 'next_question' });
  };

  const updateTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    sendMessage({ type: 'set_timer', seconds });
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#FFD700] text-xl mb-4">Connecting to game...</div>
          <div className="animate-spin w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  const categoryQuestions = currentCategory ? questions.categories[currentCategory] || [] : [];
  const hasMoreQuestions = questionIndex < categoryQuestions.length;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#FFD700]">Quiz Night Host</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-gray-400">
              Room Code: <span className="text-[#FFD700] font-mono font-bold text-xl">{roomCode}</span>
            </span>
            <button
              onClick={copyJoinLink}
              className="text-sm bg-[#1A1A1A] border border-[#FFD700]/30 text-[#FFD700] px-3 py-1 rounded hover:bg-[#FFD700] hover:text-[#0A0A0A] transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Timer:</span>
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
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {!currentQuestion && (
            <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
              <h2 className="text-xl font-semibold text-[#FFD700] mb-4">
                {currentCategory ? `${currentCategory} - Question ${questionIndex + 1}/${categoryQuestions.length}` : 'Select Category'}
              </h2>
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
                  Start Question
                </button>
              )}
              {currentCategory && !hasMoreQuestions && (
                <p className="text-gray-400">No more questions in this category!</p>
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

          {buzzerActive && <Timer seconds={timerRemaining} total={timerSeconds} />}

          <BuzzerFeed
            buzzerQueue={buzzerQueue}
            currentQuestion={currentQuestion}
            answerRevealed={answerRevealed}
            awardedPlayer={awardedPlayer}
            onAwardPoints={awardPoints}
          />
        </div>

        <div className="lg:col-span-1">
          <Leaderboard
            players={players}
            awardedPlayer={awardedPlayer}
            isHost={true}
            onAdjustScore={adjustScore}
          />
        </div>
      </div>
    </div>
  );
}
