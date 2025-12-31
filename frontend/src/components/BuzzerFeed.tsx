'use client';

import type { BuzzEntry, Question, ScoringResult } from '@/lib/types';

interface BuzzerFeedProps {
  buzzerQueue: BuzzEntry[];  // Legacy, kept for compatibility
  currentQuestion: Question | null;
  answerRevealed: boolean;
  answerCount: number;
  totalPlayers: number;
  scoringResults: ScoringResult[];
  correctLetter: string | null;
}

export default function BuzzerFeed({
  currentQuestion,
  answerRevealed,
  answerCount,
  totalPlayers,
  scoringResults,
  correctLetter,
}: BuzzerFeedProps) {
  if (!currentQuestion) {
    return null;
  }

  // Sort results: correct first, then by position
  const sortedResults = [...scoringResults].sort((a, b) => {
    if (a.is_correct !== b.is_correct) return a.is_correct ? -1 : 1;
    return (a.position || 999) - (b.position || 999);
  });

  const correctCount = scoringResults.filter(r => r.is_correct).length;
  const wrongCount = scoringResults.filter(r => !r.is_correct && r.answer !== null).length;
  const noAnswerCount = scoringResults.filter(r => r.answer === null).length;

  return (
    <div className="bg-[#1A1A1A]/80 rounded-xl p-6 border border-[#FFD700]/30">
      <h2 className="text-xl font-semibold text-[#FFD700] mb-4 flex items-center gap-2">
        <span>📝</span> Respuestas
      </h2>

      {!answerRevealed ? (
        // Before reveal: show count only
        <div className="text-center py-8">
          <div className="text-6xl font-bold text-[#FFD700] mb-2">
            {answerCount} / {totalPlayers}
          </div>
          <p className="text-gray-400">jugadores han respondido</p>

          {/* Progress bar */}
          <div className="mt-4 h-3 bg-[#0A0A0A] rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] transition-all duration-300"
              style={{ width: `${totalPlayers > 0 ? (answerCount / totalPlayers) * 100 : 0}%` }}
            />
          </div>

          {totalPlayers > 0 && answerCount === 0 && (
            <p className="text-gray-600 text-sm mt-4">Esperando respuestas...</p>
          )}

          {answerCount > 0 && answerCount < totalPlayers && (
            <p className="text-gray-600 text-sm mt-4">
              Esperando a {totalPlayers - answerCount} más...
            </p>
          )}

          {answerCount === totalPlayers && totalPlayers > 0 && (
            <p className="text-green-400 text-sm mt-4">¡Todos han respondido!</p>
          )}
        </div>
      ) : (
        // After reveal: show detailed results
        <div className="space-y-3">
          {sortedResults.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay respuestas registradas</p>
          ) : (
            <>
              {sortedResults.map((result) => (
                <div
                  key={result.player_id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    result.is_correct
                      ? 'bg-green-500/20 border-2 border-green-500'
                      : result.answer === null
                      ? 'bg-gray-500/20 border border-gray-600'
                      : 'bg-red-500/20 border border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.position && (
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                        result.position === 1 ? 'bg-[#FFD700] text-[#0A0A0A]' :
                        result.position === 2 ? 'bg-gray-300 text-[#0A0A0A]' :
                        result.position === 3 ? 'bg-amber-600 text-white' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {result.position}
                      </span>
                    )}
                    {!result.position && (
                      <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-gray-700 text-gray-500">
                        -
                      </span>
                    )}
                    <div>
                      <span className={`font-medium ${result.is_correct ? 'text-green-400' : 'text-white'}`}>
                        {result.name}
                      </span>
                      <span className="ml-2 text-gray-400 text-sm">
                        {result.answer ? (
                          <>
                            respondió <span className={result.answer === correctLetter ? 'text-green-400 font-bold' : 'text-red-400'}>{result.answer}</span>
                          </>
                        ) : (
                          <span className="text-gray-500">(sin respuesta)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <span className={`font-bold text-lg ${
                    result.points > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.points > 0 ? '+' : ''}{result.points}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Summary */}
          {sortedResults.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
              <p className="text-gray-400">
                <span className="text-green-400">{correctCount} correcta{correctCount !== 1 ? 's' : ''}</span>
                {' · '}
                <span className="text-red-400">{wrongCount} incorrecta{wrongCount !== 1 ? 's' : ''}</span>
                {noAnswerCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-gray-500">{noAnswerCount} sin respuesta</span>
                  </>
                )}
              </p>
              {correctLetter && (
                <p className="text-[#FFD700] mt-2">
                  Respuesta correcta: <span className="font-bold">{correctLetter}</span>
                </p>
              )}
            </div>
          )}

          {/* Points scale hint */}
          <p className="text-gray-600 text-xs mt-4 text-center">
            Escala de puntos: 1º = 100% · 2º = 75% · 3º = 50% · 4º+ = 25%
          </p>
        </div>
      )}
    </div>
  );
}
