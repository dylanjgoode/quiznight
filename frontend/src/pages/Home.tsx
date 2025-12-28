import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import Sparkles from '../components/Sparkles';

export default function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    if (!hostName.trim()) {
      setError('Please enter your name');
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
      navigate(`/host/${data.room_id}`);
    } catch (err) {
      setError('Failed to create room. Make sure the server is running.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    // Try to find room by code
    const code = roomCode.trim().toUpperCase();
    // The room ID starts with the code
    navigate(`/join/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <Sparkles />

      {/* Logo / Title */}
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-nye-gold via-nye-gold-light to-nye-gold bg-clip-text text-transparent">
          Quiz Night
        </h1>
        <p className="text-xl md:text-2xl text-nye-gold-light/80">
          New Year's Eve Edition
        </p>
        <div className="mt-4 text-6xl">
          🎉✨🥂
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-nye-dark/80 backdrop-blur-sm rounded-2xl p-8 border border-nye-gold/30 shadow-lg gold-glow relative z-10">
        {/* Create Game Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-nye-gold mb-4">Host a Game</h2>
          <input
            type="text"
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-nye-black border border-nye-gold/30 text-white placeholder-gray-500 mb-4"
            maxLength={20}
          />
          <button
            onClick={createRoom}
            disabled={isCreating}
            className="w-full btn-gold"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-nye-gold/30"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-nye-dark px-4 text-gray-400">or</span>
          </div>
        </div>

        {/* Join Game Section */}
        <div>
          <h2 className="text-xl font-semibold text-nye-gold mb-4">Join a Game</h2>
          <input
            type="text"
            placeholder="Room code (e.g., ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 rounded-lg bg-nye-black border border-nye-gold/30 text-white placeholder-gray-500 mb-4 uppercase"
            maxLength={6}
          />
          <button
            onClick={joinRoom}
            className="w-full bg-transparent border-2 border-nye-gold text-nye-gold font-bold py-3 px-6 rounded-lg hover:bg-nye-gold hover:text-nye-black transition-all duration-200"
          >
            Join Room
          </button>
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-center text-sm">{error}</p>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-gray-500 text-sm relative z-10">
        Happy New Year 2025! 🎆
      </p>
    </div>
  );
}
