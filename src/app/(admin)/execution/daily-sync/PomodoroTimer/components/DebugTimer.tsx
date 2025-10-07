"use client";

import { useState, useEffect, useRef } from 'react';
import { useTimer } from '@/stores/timerStore';

/**
 * Debug Timer Component
 * Simple timer that counts from 1 to test accuracy when tab is inactive
 * Does NOT sync to database - purely for debugging
 */
export default function DebugTimer() {
  const { timerState, secondsElapsed } = useTimer();
  const [debugSeconds, setDebugSeconds] = useState(0);
  const [isDebugRunning, setIsDebugRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Start debug timer when main timer starts
  useEffect(() => {
    if (timerState === 'FOCUSING' && !isDebugRunning) {
      startDebugTimer();
    } else if (timerState !== 'FOCUSING' && isDebugRunning) {
      stopDebugTimer();
    }
  }, [timerState, isDebugRunning]);

  const startDebugTimer = () => {
    console.log('🐛 Debug Timer: Starting...');
    setIsDebugRunning(true);
    setDebugSeconds(0);
    startTimeRef.current = Date.now();
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start new interval
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDebugSeconds(elapsed);
      }
    }, 100); // 100ms precision for better accuracy
  };

  const stopDebugTimer = () => {
    console.log('🐛 Debug Timer: Stopping...');
    setIsDebugRunning(false);
    setDebugSeconds(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4 p-3 w-full bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-yellow-800">🐛 Debug Timer</h4>
          <p className="text-xs text-yellow-600">
            {isDebugRunning ? 'Running (not synced to DB)' : 'Stopped'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-yellow-800">
            {formatTime(debugSeconds)}
          </div>
          <div className="text-xs text-yellow-600">
            {debugSeconds} seconds
          </div>
        </div>
      </div>
      
      {/* Status indicators */}
      {/* <div className="mt-2 flex items-center space-x-4 text-xs">
        <div className={`px-2 py-1 rounded ${
          isDebugRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          Debug: {isDebugRunning ? 'ON' : 'OFF'}
        </div>
        <div className={`px-2 py-1 rounded ${
          timerState === 'FOCUSING' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
        }`}>
          Main: {timerState}
        </div>
        <div className="px-2 py-1 rounded bg-gray-100 text-gray-600">
          Tab: {document.visibilityState}
        </div>
      </div> */}
      
      {/* Timer accuracy check */}
      {isDebugRunning && (
        <div className="mt-2 text-xs">
          <div className="font-medium text-yellow-800 mb-1">Timer Accuracy Check:</div>
          <div className="text-yellow-700">
            Debug timer: {debugSeconds}s | Main timer: {secondsElapsed}s
            {Math.abs(debugSeconds - secondsElapsed) > 2 && (
              <span className="text-red-600 font-bold ml-2">
                ⚠️ DRIFT DETECTED! ({Math.abs(debugSeconds - secondsElapsed)}s difference)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
