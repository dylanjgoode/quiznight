import { useCallback, useRef } from 'react';

// Audio context for Web Audio API sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Generate buzzer sound
function playBuzzerSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(800, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

// Generate correct answer sound
function playCorrectSound() {
  const ctx = getAudioContext();

  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);

    oscillator.start(ctx.currentTime + i * 0.1);
    oscillator.stop(ctx.currentTime + i * 0.1 + 0.3);
  });
}

// Generate wrong answer sound
function playWrongSound() {
  const ctx = getAudioContext();

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(200, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
  oscillator.type = 'sawtooth';

  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

// Generate countdown tick sound
function playTickSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

// Generate start round sound
function playStartSound() {
  const ctx = getAudioContext();

  const frequencies = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);

    oscillator.start(ctx.currentTime + i * 0.08);
    oscillator.stop(ctx.currentTime + i * 0.08 + 0.2);
  });
}

// Generate celebration sound
function playCelebrationSound() {
  const ctx = getAudioContext();

  // Play a little fanfare
  const notes = [
    { freq: 523.25, time: 0 },     // C5
    { freq: 659.25, time: 0.1 },   // E5
    { freq: 783.99, time: 0.2 },   // G5
    { freq: 1046.5, time: 0.3 },   // C6
    { freq: 783.99, time: 0.5 },   // G5
    { freq: 1046.5, time: 0.6 },   // C6
  ];

  notes.forEach(({ freq, time }) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + time);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime + time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.15);

    oscillator.start(ctx.currentTime + time);
    oscillator.stop(ctx.currentTime + time + 0.15);
  });
}

export function useSounds() {
  const soundsEnabled = useRef(true);

  const playSound = useCallback((sound: 'buzzer' | 'correct' | 'wrong' | 'tick' | 'start' | 'celebration') => {
    if (!soundsEnabled.current) return;

    try {
      switch (sound) {
        case 'buzzer':
          playBuzzerSound();
          break;
        case 'correct':
          playCorrectSound();
          break;
        case 'wrong':
          playWrongSound();
          break;
        case 'tick':
          playTickSound();
          break;
        case 'start':
          playStartSound();
          break;
        case 'celebration':
          playCelebrationSound();
          break;
      }
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  }, []);

  const toggleSounds = useCallback((enabled: boolean) => {
    soundsEnabled.current = enabled;
  }, []);

  return { playSound, toggleSounds };
}
