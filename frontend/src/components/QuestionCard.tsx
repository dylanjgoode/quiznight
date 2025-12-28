import type { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  answerRevealed: boolean;
  buzzerActive: boolean;
  onStop: () => void;
  onReveal: () => void;
  onNext: () => void;
}

export default function QuestionCard({
  question,
  answerRevealed,
  buzzerActive,
  onStop,
  onReveal,
  onNext,
}: QuestionCardProps) {
  return (
    <div className="bg-nye-dark/80 rounded-xl p-6 border border-nye-gold/30">
      <div className="flex items-start justify-between mb-4">
        <span className="bg-nye-gold/20 text-nye-gold px-3 py-1 rounded-full text-sm">
          {question.points} points
        </span>
        {buzzerActive && (
          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm animate-pulse">
            Buzzer Active
          </span>
        )}
      </div>

      <h3 className="text-2xl font-semibold text-white mb-6">{question.question}</h3>

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
                  : 'bg-nye-black/50 border-gray-700 text-white'
              }`}
            >
              <span className="font-bold mr-2 text-nye-gold">{optionLetter}.</span>
              {option}
              {answerRevealed && isCorrect && <span className="ml-2">✓</span>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {buzzerActive && (
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
            className="bg-nye-purple hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
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
