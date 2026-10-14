import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Tv,
  Upload,
  MonitorUp,
  Link,
  Check,
  AlertCircle,
  FileVideo
} from 'lucide-react';

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
  isCinemaView = false,
  isScreenSharing = false,
  screenPresenter = null,
  onToggleScreenShare = () => {},
  currentSocketId = ''
}) {
  const [customUrl, setCustomUrl] = useState('');
  const [localVolume, setLocalVolume] = useState(() => (videoElement ? videoElement.volume : 0.8));
  const [isMuted, setIsMuted] = useState(() => (videoElement ? videoElement.muted : false));
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [localFileName, setLocalFileName] = useState('');
  const fileInputRef = useRef(null);

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

  // Local Video File Upload handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHasError(false);
    setLocalFileName(file.name);
    const objectUrl = URL.createObjectURL(file);

    onControl({
      action: 'change-source',
      videoUrl: objectUrl,
      currentTime: 0,
      isPlaying: true
    });
  };

  // Custom URL loader
  const handleLoadCustomUrl = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setHasError(false);
    setLocalFileName('');
    onControl({
      action: 'change-source',
      videoUrl: customUrl.trim(),
      currentTime: 0,
      isPlaying: true
    });
    setCustomUrl('');
  };

  if (!isOpen) return null;

  const isAnotherPresenter = screenPresenter && screenPresenter.presenterId !== currentSocketId;
  const isSomeoneScreenSharing = isScreenSharing || !!screenPresenter;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Cinema Screen Controller
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900 text-red-200 border border-red-700">
                  Movie Theatre
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Play a local video file from your device or project your screen directly onto the 3D cinema screen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm bg-slate-900">
          {/* Active Screen Status Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Screen Source:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isSomeoneScreenSharing || isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-xs font-bold text-slate-200">
                  {isSomeoneScreenSharing
                    ? 'Live Screen Share Active'
                    : isPlaying
                    ? 'Local Video Playing'
                    : videoUrl
                    ? 'Video Paused'
                    : 'Cinema Screen Idle'}
                </span>
              </div>
            </div>

            {/* Source Details Badge */}
            <div className="truncate font-mono text-xs text-blue-300 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800">
              {isSomeoneScreenSharing ? (
                <span>
                  🖥️ Presenting: <strong>{screenPresenter?.presenterName || 'You (Screen Share)'}</strong>
                </span>
              ) : localFileName ? (
                <span>
                  📁 Local File: <strong>{localFileName}</strong>
                </span>
              ) : videoUrl ? (
                <span>🔗 Stream: {videoUrl}</span>
              ) : (
                <span className="text-slate-500">No media loaded. Choose a local video file below or start screen sharing.</span>
              )}
            </div>

            {updatedBy && !isSomeoneScreenSharing && (
              <span className="text-[11px] text-slate-500">
                Last updated by: <strong className="text-slate-300">{updatedBy}</strong>
              </span>
            )}

            {hasError && (
              <div className="flex items-center gap-2 p-3 bg-red-950 border border-red-800 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>
                  The video could not be decoded. Please ensure your video file is an MP4, WebM, or H.264 video.
                </span>
              </div>
            )}

            {/* Timeline Progress Slider (for loaded video files) */}
            {videoUrl && !isSomeoneScreenSharing && (
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
            )}

            {/* Main Playback Bar (Play/Pause, Seek, Volume, Focus View) */}
            <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {videoUrl && !isSomeoneScreenSharing && (
                  <button
                    onClick={handlePlayPause}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                      isPlaying
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                )}

                {/* Local Audio Volume Control */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <button
                    onClick={handleToggleMute}
                    className="text-slate-400 hover:text-white transition-colors"
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
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
                    title="Your Local Cinema Volume"
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
                title="Glide camera into prime cinema viewing position"
              >
                <Tv className="w-4 h-4 text-blue-400" />
                <span>{isCinemaView ? 'Exit Cinema View' : 'Cinema Focus View'}</span>
              </button>
            </div>
          </div>

          {/* TWO PRIMARY PLAYBACK MODES (Local Video & Screen Sharing) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OPTION 1: Play Local Video File */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-white text-xs uppercase tracking-wide">
                    Play Local Video File
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select any MP4, WebM, MKV, or MOV video file directly from your computer to play on the big cinema screen.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Video File</span>
              </button>
            </div>

            {/* OPTION 2: Project Screen Share */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400">
                    <MonitorUp className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-white text-xs uppercase tracking-wide">
                    Project Screen Share
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Broadcast your entire desktop, browser tab, or app directly onto the massive 16:9 cinema screen with audio.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isAnotherPresenter) {
                    alert(`Screen sharing is currently in use by ${screenPresenter?.presenterName}. Only one person can share at a time.`);
                    return;
                  }
                  onToggleScreenShare();
                  onClose();
                }}
                disabled={isAnotherPresenter && !isScreenSharing}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                  isScreenSharing
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : isAnotherPresenter
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25'
                }`}
              >
                <MonitorUp className="w-4 h-4" />
                <span>
                  {isScreenSharing
                    ? 'Stop Screen Sharing'
                    : isAnotherPresenter
                    ? `In Use (${screenPresenter?.presenterName})`
                    : 'Share Screen to Cinema'}
                </span>
              </button>
            </div>
          </div>

          {/* OPTIONAL: Direct Video Link (URL) */}
          <form onSubmit={handleLoadCustomUrl} className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Or Load Direct Video URL (.mp4 / .webm)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/movie.mp4"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 border border-slate-700"
              >
                Load URL
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Click outside or press <strong>ESC</strong> to return to avatar.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
