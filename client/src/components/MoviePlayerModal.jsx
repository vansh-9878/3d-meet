import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Sparkles,
  Link,
  Tv,
  RotateCcw,
  Maximize2,
  Check,
  AlertCircle
} from 'lucide-react';

export const PRESET_MOVIES = [
  {
    title: 'Big Buck Bunny',
    genre: 'Animated Comedy',
    duration: '09:56',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    badge: 'Popular'
  },
  {
    title: 'Tears of Steel',
    genre: 'Sci-Fi Action',
    duration: '12:14',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    badge: 'Sci-Fi'
  },
  {
    title: 'Sintel',
    genre: 'Fantasy Adventure',
    duration: '14:48',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    badge: 'Fantasy'
  },
  {
    title: 'Elephants Dream',
    genre: 'Sci-Fi Surreal',
    duration: '10:53',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    badge: 'Classic'
  }
];

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function MoviePlayerModal({
  isOpen = false,
  onClose = () => {},
  playbackState = {},
  onControl = () => {},
  videoElement = null,
  onToggleCinemaView = () => {},
  isCinemaView = false
}) {
  const [customUrl, setCustomUrl] = useState('');
  const [localVolume, setLocalVolume] = useState(() => (videoElement ? videoElement.volume : 0.8));
  const [isMuted, setIsMuted] = useState(() => (videoElement ? videoElement.muted : false));
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const {
    videoUrl = '',
    isPlaying = false,
    updatedBy = ''
  } = playbackState;

  // Track time & duration from the shared video element
  useEffect(() => {
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      if (videoElement.duration && !isNaN(videoElement.duration)) {
        setDuration(videoElement.duration);
      }
    };

    const handleDurationChange = () => {
      if (videoElement.duration && !isNaN(videoElement.duration)) {
        setDuration(videoElement.duration);
      }
    };

    const handleError = () => {
      setHasError(true);
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('loadedmetadata', handleDurationChange);
    videoElement.addEventListener('error', handleError);

    if (videoElement.duration) {
      setDuration(videoElement.duration);
    }
    setCurrentTime(videoElement.currentTime);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('loadedmetadata', handleDurationChange);
      videoElement.removeEventListener('error', handleError);
    };
  }, [videoElement]);

  // Adjust volume
  const handleVolumeChange = (newVol) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setLocalVolume(clamped);
    if (videoElement) {
      videoElement.volume = clamped;
      if (clamped > 0 && videoElement.muted) {
        videoElement.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handleToggleMute = () => {
    if (videoElement) {
      const nextMuted = !videoElement.muted;
      videoElement.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handlePlayPause = () => {
    onControl({
      action: isPlaying ? 'pause' : 'play',
      currentTime: videoElement ? videoElement.currentTime : currentTime
    });
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    onControl({
      action: 'seek',
      currentTime: seekTime
    });
  };

  const handleLoadCustomUrl = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setHasError(false);
    onControl({
      action: 'change-source',
      videoUrl: customUrl.trim(),
      currentTime: 0,
      isPlaying: true
    });
    setCustomUrl('');
  };

  const handleSelectPreset = (preset) => {
    setHasError(false);
    onControl({
      action: 'change-source',
      videoUrl: preset.url,
      currentTime: 0,
      isPlaying: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Cinema Video Player
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  Synced Watch-Together
                </span>
              </div>
              <p className="text-xs text-slate-400">
                All changes sync in real-time on the big screen for everyone in the room.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Active Video Status Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Currently Playing:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-xs font-bold text-slate-300">
                  {isPlaying ? 'Playing on Cinema Screen' : 'Paused'}
                </span>
              </div>
            </div>

            <div className="truncate font-mono text-xs text-blue-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              {videoUrl || 'No video loaded yet. Select a movie below or paste a direct MP4 link.'}
            </div>

            {updatedBy && (
              <span className="text-[11px] text-slate-500">
                Last updated by: <strong className="text-slate-300">{updatedBy}</strong>
              </span>
            )}

            {hasError && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>
                  The video could not be loaded. Please ensure the URL is a direct, public MP4 / WebM video link.
                </span>
              </div>
            )}

            {/* Timeline Progress Slider */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Playback Bar (Play/Pause, Seek, Volume, Focus View) */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  disabled={!videoUrl}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause Movie' : 'Play Movie'}</span>
                </button>

                {/* Local Audio Volume Control */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <button
                    onClick={handleToggleMute}
                    className="text-slate-400 hover:text-white transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || localVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : localVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    title="Your Local Volume"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-7">
                    {isMuted ? '0%' : `${Math.round(localVolume * 100)}%`}
                  </span>
                </div>
              </div>

              {/* Cinema Focus View Toggle */}
              <button
                onClick={() => {
                  onToggleCinemaView();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                title="Glide camera into prime cinema viewing position"
              >
                <Tv className="w-4 h-4 text-blue-400" />
                <span>{isCinemaView ? 'Exit Cinema View' : 'Cinema Focus View'}</span>
              </button>
            </div>
          </div>

          {/* Quick 1-Click Preset Movies Library */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select a Featured Movie (Ready to Watch)
              </span>
              <span className="text-[11px] text-slate-500">Public Domain & Creative Commons</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_MOVIES.map((preset) => (
                <button
                  key={preset.title}
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col p-3 rounded-2xl border text-left transition-all ${
                    videoUrl === preset.url
                      ? 'bg-red-950/40 border-red-500/60 ring-2 ring-red-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-white text-xs">{preset.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {preset.duration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
                    <span>{preset.genre}</span>
                    <span className="text-[10px] font-semibold text-red-400">{preset.badge}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Video URL Input Form */}
          <form onSubmit={handleLoadCustomUrl} className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Or Load Direct Video URL (.mp4 / .webm)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
              >
                Load to Screen
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Press <strong>ESC</strong> or click outside to return to avatar.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
