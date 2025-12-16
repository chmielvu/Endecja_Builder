import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Phone, PhoneOff, Activity, Volume2, X } from 'lucide-react';
import { notify } from '../lib/utils';

// Helper for audio encoding/decoding
function b64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const DmowskiChat: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [volume, setVolume] = useState<number>(0); // For visualizer
  const [minimized, setMinimized] = useState(true);

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const responseQueueRef = useRef<AudioBufferSourceNode[]>([]);

  // Initialize Gemini API
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const startSession = async () => {
    try {
      setStatus('connecting');
      
      // 1. Setup Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }});
      streamRef.current = stream;

      // 2. Connect to Gemini Live
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Roman Dmowski, the Polish statesman and ideologue of National Democracy (Endecja). 
          Speak with the gravitas, intelligence, and slight arrogance of a 1930s political leader.
          You are a realist, believing in "National Egoism" and the "Piast Idea" (western orientation).
          You are deeply skeptical of Józef Piłsudski, romantic insurrections, and socialism.
          Speak clearly and concisely. You can speak Polish or English depending on the user.
          Current context: You are speaking to a student of history analyzing your political network.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // Deep, authoritative voice
          }
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setStatus('connected');
            setupAudioInput();
          },
          onmessage: async (message: LiveServerMessage) => {
            handleServerMessage(message);
          },
          onclose: () => {
            console.log('Session closed');
            cleanup();
          },
          onerror: (e) => {
            console.error('Session error', e);
            setStatus('error');
            notify.error("Connection error");
            cleanup();
          }
        }
      });

      setIsActive(true);
      setMinimized(false);

    } catch (e) {
      console.error(e);
      notify.error("Failed to start voice session");
      cleanup();
    }
  };

  const setupAudioInput = () => {
    if (!audioContextRef.current || !streamRef.current) return;

    // Create a separate context for input if needed, but reusing context is fine for sample rate matching if careful
    // Gemini expects 16kHz input. We'll use a ScriptProcessor to capture and downsample if necessary, 
    // or rely on getUserMedia constraints (which we set to 16000).
    
    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const source = inputContext.createMediaStreamSource(streamRef.current);
    const processor = inputContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for(let i=0; i<inputData.length; i+=10) sum += Math.abs(inputData[i]);
      setVolume(sum / (inputData.length/10));

      // Convert Float32 to Int16 for Gemini
      const l = inputData.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32768;
      }
      
      const b64Data = arrayBufferToBase64(int16.buffer);

      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: b64Data
            }
          });
        });
      }
    };

    source.connect(processor);
    processor.connect(inputContext.destination);

    inputSourceRef.current = source;
    processorRef.current = processor;
  };

  const handleServerMessage = async (message: LiveServerMessage) => {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && audioContextRef.current) {
      const ctx = audioContextRef.current;
      const audioBytes = b64ToUint8Array(audioData);
      
      // PCM decoding (24kHz, mono, 16-bit signed integer)
      const dataInt16 = new Int16Array(audioBytes.buffer);
      const audioBuffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      // Scheduling
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      
      responseQueueRef.current.push(source);
      source.onended = () => {
        const index = responseQueueRef.current.indexOf(source);
        if (index > -1) responseQueueRef.current.splice(index, 1);
      };
    }

    // Handle interruption
    if (message.serverContent?.interrupted) {
      nextStartTimeRef.current = 0;
      responseQueueRef.current.forEach(src => src.stop());
      responseQueueRef.current = [];
    }
  };

  const cleanup = () => {
    setIsActive(false);
    setStatus('idle');
    setVolume(0);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    responseQueueRef.current = [];
    sessionPromiseRef.current = null;
  };

  const toggleMute = () => setIsMuted(!isMuted);

  if (!isActive && minimized) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <button 
          onClick={startSession}
          className="flex items-center gap-2 px-4 py-3 bg-endecja-ink text-white rounded-full shadow-lg border-2 border-endecja-gold hover:bg-endecja-base transition-all hover:scale-105"
        >
          <Phone size={20} className="text-endecja-gold animate-pulse" />
          <span className="font-serif font-bold tracking-wide">Call Dmowski</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-72 bg-endecja-paper border-2 border-endecja-gold rounded-lg shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-endecja-ink p-3 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className="font-serif font-bold text-sm">Dmowski Live</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMinimized(true)} className="hover:text-endecja-gold"><X size={16} /></button>
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="h-32 bg-endecja-base relative flex items-center justify-center overflow-hidden">
        {/* Abstract Waveform */}
        <div className="absolute flex gap-1 items-center h-full w-full justify-center px-4 opacity-50">
           {Array.from({ length: 20 }).map((_, i) => (
             <div 
               key={i} 
               className="w-1 bg-endecja-gold rounded-full transition-all duration-75"
               style={{ 
                 height: `${Math.max(10, Math.random() * volume * 500)}%`,
                 opacity: 0.5 + (volume * 2)
               }} 
             />
           ))}
        </div>
        
        {/* Status Text */}
        <div className="z-10 text-endecja-paper text-xs uppercase tracking-widest font-bold bg-black/20 px-3 py-1 rounded backdrop-blur-sm">
          {status === 'connecting' ? 'Connecting...' : status === 'connected' ? 'Listening...' : 'Disconnected'}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 flex justify-center items-center gap-6 bg-gradient-to-t from-endecja-paper to-white">
        <button 
          onClick={toggleMute}
          className={`p-3 rounded-full border-2 transition-all ${isMuted ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-white text-endecja-ink border-endecja-gold/20 hover:border-endecja-gold'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
          onClick={cleanup}
          className="p-4 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-transform hover:scale-110 active:scale-95"
        >
          <PhoneOff size={24} />
        </button>

        <div className="w-10 flex justify-center">
           <Activity size={20} className={`text-endecja-gold ${volume > 0.01 ? 'animate-bounce' : 'opacity-50'}`} />
        </div>
      </div>
    </div>
  );
};
