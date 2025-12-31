'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';
import Sparkles from '@/components/Sparkles';

export default function JoinGame() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [roomInfo, setRoomInfo] = useState<{ host_name: string; player_count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRoom = async () => {
      if (!roomId) return;

      try {
        const response = await fetch(`${API_URL}/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoomInfo(data);
        } else {
          setError('Sala no encontrada. Revisa el código e inténtalo de nuevo.');
        }
      } catch (err) {
        setError('No se puede conectar al servidor.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    checkRoom();
  }, [roomId]);

  const joinGame = () => {
    if (!playerName.trim()) {
      setError('Por favor, introduce tu nombre');
      return;
    }

    setIsJoining(true);
    router.push(`/play/${roomId}?name=${encodeURIComponent(playerName.trim())}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#FFD700] text-xl">Buscando sala...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <Sparkles />

      <div className="w-full max-w-md bg-[#1A1A1A]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#FFD700]/30 shadow-lg relative z-10">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-[#FFD700] to-[#FFEC8B] bg-clip-text text-transparent">
          Unirse a Noche de Trivia
        </h1>

        {roomInfo && (
          <div className="text-center mb-6">
            <p className="text-gray-400">
              Organizado por <span className="text-[#FFD700]">{roomInfo.host_name}</span>
            </p>
            <p className="text-gray-500 text-sm">
              {roomInfo.player_count} jugador{roomInfo.player_count !== 1 ? 'es' : ''} conectado{roomInfo.player_count !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tu nombre</label>
            <input
              type="text"
              placeholder="Introduce tu nombre"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
              className="w-full px-4 py-3 rounded-lg bg-[#0A0A0A] border border-[#FFD700]/30 text-white placeholder-gray-500 text-lg"
              maxLength={20}
              autoFocus
            />
          </div>

          <button
            onClick={joinGame}
            disabled={isJoining || !roomInfo}
            className="w-full btn-gold text-lg py-4"
          >
            {isJoining ? 'Uniéndose...' : 'Unirse'}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-center text-sm">{error}</p>
        )}

        <button
          onClick={() => router.push('/')}
          className="mt-6 w-full text-gray-400 hover:text-[#FFD700] transition-colors text-sm"
        >
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
