import React, { useEffect, useState } from 'react';

/**
 * SplatterOverlay:
 * Fullscreen visual effect triggered when another player hits the user with a projectile.
 * Colors screen based on the thrown object for 2-4 seconds:
 * - Tomato: Red splatter with runny drip marks
 * - Egg: Light grey / egg-white wash with dripping yolk blotch
 * - Water balloon: Vibrant translucent blue water splash
 */
export function SplatterOverlay({ splatterData }) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (splatterData) {
      setData(splatterData);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 3200); // 3.2 seconds duration

      return () => clearTimeout(timer);
    }
  }, [splatterData]);

  if (!visible || !data) return null;

  const isTomato = data.type === 'tomato';
  const isEgg = data.type === 'egg';
  const isWaterBalloon = data.type === 'water_balloon';

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none transition-opacity duration-700 animate-fadeIn">
      {/* 1. Tomato Splatter (Red) */}
      {isTomato && (
        <div className="absolute inset-0 bg-red-600/35 backdrop-blur-[1px]">
          {/* Main Splat Center */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-700/60 blur-xl animate-pulse" />
          
          {/* Dripping Splatter Blobs */}
          <svg className="w-full h-full text-red-600/80 drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="20" cy="18" r="8" fill="currentColor" />
            <circle cx="23" cy="28" r="4" fill="currentColor" />
            <circle cx="24" cy="38" r="2.5" fill="currentColor" />
            
            <circle cx="50" cy="35" r="14" fill="#b91c1c" fillOpacity="0.85" />
            <circle cx="48" cy="50" r="7" fill="#b91c1c" fillOpacity="0.8" />
            <circle cx="49" cy="62" r="4.5" fill="#b91c1c" fillOpacity="0.75" />
            <circle cx="50" cy="74" r="2" fill="#b91c1c" fillOpacity="0.7" />

            <circle cx="82" cy="22" r="10" fill="currentColor" />
            <circle cx="80" cy="34" r="5" fill="currentColor" />
            <circle cx="79" cy="45" r="3" fill="currentColor" />

            <circle cx="35" cy="70" r="6" fill="currentColor" />
            <circle cx="68" cy="68" r="7" fill="currentColor" />
          </svg>

          {/* Hit Notification Badge */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-red-700/90 text-white rounded-2xl shadow-2xl border-2 border-red-400 font-extrabold text-sm flex items-center gap-2 animate-bounce">
            <span className="text-xl">🍅</span>
            <span>You got splattered with a Tomato!</span>
            {data.throwerName && <span className="text-xs text-red-200">({data.throwerName})</span>}
          </div>
        </div>
      )}

      {/* 2. Egg Splatter (Light Grey / Creamy Egg White with Yolk) */}
      {isEgg && (
        <div className="absolute inset-0 bg-slate-200/45 backdrop-blur-[2px]">
          {/* Egg White Center Blotch */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-80 rounded-full bg-slate-100/70 blur-2xl" />

          {/* Yolk Blotch */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-amber-400/85 blur-md border-4 border-amber-300/60 shadow-inner" />

          {/* Dripping Egg SVG */}
          <svg className="w-full h-full text-slate-100/75 drop-shadow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="50" cy="35" r="16" fill="#f8fafc" fillOpacity="0.85" />
            <circle cx="49" cy="52" r="7.5" fill="#f1f5f9" fillOpacity="0.8" />
            <circle cx="48" cy="65" r="5" fill="#f1f5f9" fillOpacity="0.75" />
            <circle cx="49" cy="78" r="2.5" fill="#e2e8f0" fillOpacity="0.7" />

            <circle cx="25" cy="30" r="8" fill="#f8fafc" fillOpacity="0.75" />
            <circle cx="26" cy="42" r="4" fill="#f1f5f9" fillOpacity="0.7" />
            
            <circle cx="75" cy="28" r="9" fill="#f8fafc" fillOpacity="0.75" />
            <circle cx="74" cy="40" r="4.5" fill="#f1f5f9" fillOpacity="0.7" />
          </svg>

          {/* Hit Notification Badge */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-slate-800/90 text-white rounded-2xl shadow-2xl border-2 border-amber-400 font-extrabold text-sm flex items-center gap-2 animate-bounce">
            <span className="text-xl">🥚</span>
            <span>You got egged!</span>
            {data.throwerName && <span className="text-xs text-amber-300">({data.throwerName})</span>}
          </div>
        </div>
      )}

      {/* 3. Water Balloon Splash (Translucent Blue) */}
      {isWaterBalloon && (
        <div className="absolute inset-0 bg-sky-500/35 backdrop-blur-[1px]">
          {/* Water Splash Ring */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-400/50 blur-xl animate-pulse" />

          {/* Water Splash SVG Droplets */}
          <svg className="w-full h-full text-sky-400/80 drop-shadow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="50" cy="35" r="18" fill="#38bdf8" fillOpacity="0.6" />
            <circle cx="50" cy="52" r="8" fill="#0284c7" fillOpacity="0.5" />
            <circle cx="51" cy="66" r="5" fill="#0284c7" fillOpacity="0.45" />
            <circle cx="50" cy="80" r="3" fill="#0284c7" fillOpacity="0.4" />

            <circle cx="22" cy="22" r="7" fill="#38bdf8" fillOpacity="0.6" />
            <circle cx="21" cy="34" r="4" fill="#38bdf8" fillOpacity="0.5" />
            <circle cx="78" cy="25" r="8" fill="#38bdf8" fillOpacity="0.6" />
            <circle cx="79" cy="38" r="4.5" fill="#38bdf8" fillOpacity="0.5" />

            <circle cx="35" cy="72" r="5" fill="#38bdf8" fillOpacity="0.5" />
            <circle cx="65" cy="70" r="5" fill="#38bdf8" fillOpacity="0.5" />
          </svg>

          {/* Hit Notification Badge */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-blue-700/90 text-white rounded-2xl shadow-2xl border-2 border-sky-300 font-extrabold text-sm flex items-center gap-2 animate-bounce">
            <span className="text-xl">💧</span>
            <span>You got hit with a Water Balloon!</span>
            {data.throwerName && <span className="text-xs text-sky-200">({data.throwerName})</span>}
          </div>
        </div>
      )}
    </div>
  );
}
