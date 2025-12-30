'use client';

import { useState, useRef, useEffect } from 'react';
import type { Question } from '@/lib/types';

interface QuestionCardProps {
  question: Question;
  answerRevealed: boolean;
  buzzerActive: boolean;
  onStop: () => void;
  onReveal: () => void;
  onNext: () => void;
}

const MAX_PLAY_SECONDS = 30;

export default function QuestionCard({
  question,
  answerRevealed,
  buzzerActive,
  onStop,
  onReveal,
  onNext,
}: QuestionCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const isMusicQuestion = question.type === 'music';

  // Reset audio state when question changes
  useEffect(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [question.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle audio time updates - stop at 30 seconds
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      setAudioProgress((currentTime / MAX_PLAY_SECONDS) * 100);

      if (currentTime >= MAX_PLAY_SECONDS) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
      <div className="flex items-start justify-between mb-4">
        <span className="bg-[#FFD700]/20 text-[#FFD700] px-3 py-1 rounded-full text-sm">
          {question.points} points
        </span>
        <div className="flex gap-2">
          {isMusicQuestion && (
            <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm">
              Music Round
            </span>
          )}
          {buzzerActive && (
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm animate-pulse">
              Buzzer Active
            </span>
          )}
        </div>
      </div>

      {/* Music Question: Audio Player */}
      {isMusicQuestion && question.audio_file ? (
        <div className="mb-6">
          <audio
            ref={audioRef}
            src={`/music/${question.audio_file}`}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
          />

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500]
                         flex items-center justify-center text-[#0A0A0A] text-4xl
                         hover:scale-105 transition-transform shadow-lg cursor-pointer"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Progress bar for 30-second clip */}
            <div className="w-full max-w-md">
              <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] transition-all"
                  style={{ width: `${Math.min(audioProgress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0:00</span>
                <span>0:30</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Text Question: Standard display */
        <h3 className="text-2xl font-semibold text-white mb-6">{question.question}</h3>
      )}

      {/* Options (same for both types) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {question.options.map((option, index) => {
          const isCorrect = option === question.correct_answer;
          const optionLetter = String.fromCharCode(65 + index);

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all ${
                answerRevealed && isCorrect
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-[#0A0A0A]/50 border-gray-700 text-white'
              }`}
            >
              <span className="font-bold mr-2 text-[#FFD700]">{optionLetter}.</span>
              {option}
              {answerRevealed && isCorrect && <span className="ml-2">✓</span>}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {buzzerActive && !isMusicQuestion && (
          <button
            onClick={onStop}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Stop Timer
          </button>
        )}
        {!answerRevealed && (
          <button
            onClick={onReveal}
            className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Reveal Answer
          </button>
        )}
        {answerRevealed && (
          <button onClick={onNext} className="btn-gold">
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
}
