"use client";

import { useState, useEffect } from "react";

interface SplashScreenProps {
  children: React.ReactNode;
}

export default function SplashScreen({ children }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen for 1.5 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => clearTimeout(splashTimer);
  }, []);

  // Show splash screen
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-brand-800 to-brand-950 flex items-center justify-center z-50">
        <div className="text-center text-white">
          {/* App Logo */}
          <div className="mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg">
            <img 
              src="/images/logo/logo-icon.svg" 
              alt="Better Planner Logo" 
              className="w-32 h-32"
            />
          </div>
          
          {/* App Name */}
          <h1 className="text-2xl font-bold mb-2">Better Planner</h1>
          <p className="text-gray-400 text-lg">Your productivity companion</p>

          {/* Loading indicator */}
          <div className="mt-6 transition-all duration-1000 delay-700">
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-white/90 rounded-full animate-bounce"/>
              <div className="w-3 h-3 bg-white/90 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}/>
              <div className="w-3 h-3 bg-white/90 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}/>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // App is ready
  return <>{children}</>;
}

