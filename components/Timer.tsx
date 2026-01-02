
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';

interface TimerProps {
  initialTime: number; // seconds
  onComplete: (duration: number) => void;
  title: string;
}

const Timer: React.FC<TimerProps> = ({ initialTime, onComplete, title }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      setIsActive(false);
      setIsFinished(true);
      onComplete(initialTime);
      if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete, initialTime, isFinished]);

  const toggleTimer = () => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
    setIsFinished(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#262626] flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-tighter text-[#666] mb-2">{title}</div>
      <div className={`text-4xl font-bold font-mono transition-colors ${isActive ? 'text-[#D4FF00]' : 'text-white'}`}>
        {formatTime(timeLeft)}
      </div>
      
      <div className="w-full h-1 bg-[#000] mt-4 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#D4FF00] transition-all duration-300" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex space-x-4 mt-6">
        <button 
          onClick={toggleTimer}
          className={`p-3 rounded-full border ${isActive ? 'bg-[#D4FF00] border-[#D4FF00] text-black' : 'border-[#333] text-white hover:border-[#D4FF00]'}`}
        >
          {isActive ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
        </button>
        <button 
          onClick={resetTimer}
          className="p-3 rounded-full border border-[#333] text-white hover:bg-white/5"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      
      {isFinished && (
        <div className="mt-4 flex items-center space-x-2 text-[#D4FF00] animate-pulse">
          <CheckCircle size={16} />
          <span className="text-xs uppercase font-bold">Deep Work Concluído</span>
        </div>
      )}
    </div>
  );
};

export default Timer;
