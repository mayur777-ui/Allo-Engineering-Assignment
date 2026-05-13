import { useState, useEffect } from 'react';

export interface CountdownState {
  remaining: number;
  isExpired: boolean;
  timeString: string;
}

export function useCountdown(expiresAt: string): CountdownState {
  const [remaining, setRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      setIsExpired(true);
      return;
    }
    const calculateRemaining = () => {
      const expiryDate = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const diff = expiryDate - now;

      if (diff <= 0) {
        setRemaining(0);
        setIsExpired(true);
        return true;
      }
      setRemaining(diff);
      setIsExpired(false);
      return false;
    };
    calculateRemaining();
    const interval = setInterval(() => {
      const expired = calculateRemaining();
      if (expired) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  return { remaining, isExpired, timeString: formatTime(remaining),
  };
}
