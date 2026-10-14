import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Film,
  Upload,
  MonitorUp,
  Link,
  AlertCircle,
  FileVideo
} from 'lucide-react';

export function MoviePlayerModal({
  isOpen = false,
  onClose = () => {},
  playbackState = {},
  onControl = () => {},
  videoElement = null,
  isScreenSharing = false,
  screenPresenter = null,
  onToggleScreenShare = () => {},
  currentSocketId = ''
}) {
  const [customUrl, setCustomUrl] = useState('');
  const [hasError, setHasError] = useState(false);
  const [localFileName, setLocalFileName] = useState('');
  const fileInputRef = useRef(null);

  const {
    videoUrl = '',
    isPlaying = false,
    updatedBy = ''
  } = playbackState;

  useEffect(() => {
    if (!videoElement) return;
    const handleError = () => {
      setHasError(true);
    };
    videoElement.addEventListener('error', handleError);
    return () => {
      videoElement.removeEventListener('error', handleError);
    };
  }, [videoElement]);

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

  const handlePlayPause = () => {
    onControl({
      action: isPlaying ? 'pause' : 'play',
      currentTime: videoElement ? videoElement.currentTime : 0
    });
  };

  if (!isOpen) return null;

  const isAnotherPresenter = screenPresenter && screenPresenter.presenterId !== currentSocketId;
  const isSomeoneScreenSharing = isScreenSharing || !!screenPresenter;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 animate-fadeIn select-none">
      <div className="relative w-full max-w-xl bg-white border-2 border-gray-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Vibrant Red/Cinema Coloured Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-600 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-wide">
                  Cinema Screen Projector
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/40 text-red-100 border border-red-400">
                  Movie Theatre
                </span>
              </div>
              <p className="text-xs text-red-100">
                Choose media to display on the main 3D cinema screen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Solid White Background with 3 Clean Colored Option Cards */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm bg-white">
          {/* Active Status Banner */}
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-3 h-3 rounded-full shrink-0 ${isSomeoneScreenSharing || isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div className="truncate">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {isSomeoneScreenSharing ? (
                    <span>🖥️ Presenting: <strong>{screenPresenter?.presenterName || 'You (Screen Share)'}</strong></span>
                  ) : localFileName ? (
                    <span>📁 Playing File: <strong>{localFileName}</strong></span>
                  ) : videoUrl ? (
                    <span>🔗 Streaming: <strong>{videoUrl}</strong></span>
                  ) : (
                    <span className="text-gray-600">Cinema Screen Idle</span>
                  )}
                </div>
                {updatedBy && !isSomeoneScreenSharing && (
                  <div className="text-[10px] text-gray-500">Updated by: {updatedBy}</div>
                )}
              </div>
            </div>

            {/* If video file/URL is active, show simple Play/Pause button */}
            {videoUrl && !isSomeoneScreenSharing && (
              <button
                onClick={handlePlayPause}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-all shadow-sm ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            )}
          </div>

          {hasError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>The video could not be played. Please verify the URL or select an MP4 / WebM file.</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* THE 3 OPTIONS: Video URL, Local Video, Screen Share             */}
          {/* ============================================================== */}

          {/* 1. VIDEO URL */}
          <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Link className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wide">
                1. Video URL
              </h3>
            </div>
            <p className="text-xs text-indigo-900 leading-snug">
              Enter any direct video stream or MP4 / WebM link to stream to the cinema screen.
            </p>
            <form onSubmit={handleLoadCustomUrl} className="flex gap-2 pt-1">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/movie.mp4"
                className="flex-1 px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-gray-900 placeholder-gray-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm active:scale-95"
              >
                Load URL
              </button>
            </form>
          </div>

          {/* 2. LOCAL VIDEO */}
          <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <FileVideo className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wide">
                2. Local Video
              </h3>
            </div>
            <p className="text-xs text-emerald-900 leading-snug">
              Select an MP4, WebM, MKV, or MOV video file directly from your computer to watch together.
            </p>

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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Choose Video File</span>
            </button>
          </div>

          {/* 3. SCREEN SHARE */}
          <div className="bg-red-50/70 border-2 border-red-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-600 text-white">
                <MonitorUp className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-red-950 text-xs uppercase tracking-wide">
                3. Screen Share
              </h3>
            </div>
            <p className="text-xs text-red-900 leading-snug">
              Stream your desktop, Chrome tab, YouTube, or application with audio onto the cinema screen.
            </p>

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
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm ${
                isScreenSharing
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : isAnotherPresenter
                  ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
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

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-100 border-t border-gray-300 flex items-center justify-between text-xs text-gray-600">
          <span>Press <strong>ESC</strong> or click Close to return to room.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
