'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';
import Sparkles from '@/components/Sparkles';

export default function Home() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    if (!hostName.trim()) {
      setError('Por favor, introduce tu nombre');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_name: hostName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create room');

      const data = await response.json();
      router.push(`/host/${data.room_id}`);
    } catch (err) {
      setError('Error al crear la sala. Asegúrate de que el servidor esté funcionando.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = () => {
    if (!roomCode.trim()) {
      setError('Por favor, introduce el código de la sala');
      return;
    }
    const code = roomCode.trim().toUpperCase();
    router.push(`/join/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <Sparkles />

      {/* Main Content - Two Column Layout */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 w-full max-w-6xl">

        {/* Left Side - Video & Title */}
        <div className="flex flex-col items-center lg:items-start">
          {/* Quiz Master Mascot */}
          <div className="relative w-80 md:w-[28rem] rounded-2xl overflow-hidden border-4 border-[#FFD700] mb-6" style={{ boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)' }}>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
            >
              <source src="/images/party_dog.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Logo / Title */}
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-[#FFD700] via-[#FFEC8B] to-[#FFD700] bg-clip-text text-transparent">
              Noche de Trivia
            </h1>
            <p className="text-xl md:text-2xl text-[#FFEC8B]/80">
              Edición Año Nuevo 2026
            </p>
          </div>
        </div>

        {/* Right Side - Host/Join Card */}
        <div className="w-full max-w-md bg-[#1A1A1A]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#FFD700]/30 shadow-lg gold-glow">
          {/* Create Game Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#FFD700] mb-4">Crear partida</h2>
            <input
              type="text"
              placeholder="Tu nombre"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0A0A0A] border border-[#FFD700]/30 text-white placeholder-gray-500 mb-4"
              maxLength={20}
            />
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="w-full btn-gold"
            >
              {isCreating ? 'Creando...' : 'Crear sala'}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#FFD700]/30"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#1A1A1A] px-4 text-gray-400">o</span>
            </div>
          </div>

          {/* Join Game Section */}
          <div>
            <h2 className="text-xl font-semibold text-[#FFD700] mb-4">Unirse a partida</h2>
            <input
              type="text"
              placeholder="Código de sala (ej. ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-lg bg-[#0A0A0A] border border-[#FFD700]/30 text-white placeholder-gray-500 mb-4 uppercase"
              maxLength={6}
            />
            <button
              onClick={joinRoom}
              className="w-full bg-transparent border-2 border-[#FFD700] text-[#FFD700] font-bold py-3 px-6 rounded-lg hover:bg-[#FFD700] hover:text-[#0A0A0A] transition-all duration-200"
            >
              Unirse
            </button>
          </div>

          {error && (
            <p className="mt-4 text-red-400 text-center text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
