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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/65 select-none pointer-events-auto">
      {/* Fixed Centered Compact Card */}
      <div className="relative w-full max-w-sm bg-white border-2 border-gray-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-fadeIn">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-600 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-white" />
            <span className="text-sm font-extrabold tracking-wide">
              Cinema Projector
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/40 text-red-100 border border-red-400">
              Theatre
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Compact 3 Options */}
        <div className="p-3.5 space-y-2.5 text-xs bg-white overflow-y-auto max-h-[75vh]">
          {/* Active Status Badge */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSomeoneScreenSharing || isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div className="truncate text-[11px] font-bold text-gray-800">
                {isSomeoneScreenSharing ? (
                  <span>🖥️ {screenPresenter?.presenterName || 'You (Sharing)'}</span>
                ) : localFileName ? (
                  <span>📁 {localFileName}</span>
                ) : videoUrl ? (
                  <span className="truncate">🔗 Stream Active</span>
                ) : (
                  <span className="text-gray-500">Screen Idle</span>
                )}
              </div>
            </div>

            {videoUrl && !isSomeoneScreenSharing && (
              <button
                onClick={handlePlayPause}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[10px] shrink-0 transition-all ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            )}
          </div>

          {hasError && (
            <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
              <span>Could not play video. Use MP4/WebM.</span>
            </div>
          )}

          {/* 1. Video URL */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-950">
              <Link className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Video URL</span>
            </div>
            <form onSubmit={handleLoadCustomUrl} className="flex gap-1.5">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://.../video.mp4"
                className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-gray-900 placeholder-gray-400 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm"
              >
                Load
              </button>
            </form>
          </div>

          {/* 2. Local Video */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-950">
              <FileVideo className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Local Video File</span>
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
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Video File</span>
            </button>
          </div>

          {/* 3. Screen Share */}
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-red-950">
              <MonitorUp className="w-3.5 h-3.5 text-red-600" />
              <span>3. Project Screen Share</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isAnotherPresenter) {
                  alert(`Screen sharing in use by ${screenPresenter?.presenterName}.`);
                  return;
                }
                onToggleScreenShare();
                onClose();
              }}
              disabled={isAnotherPresenter && !isScreenSharing}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm ${
                isScreenSharing
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : isAnotherPresenter
                  ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <MonitorUp className="w-3.5 h-3.5" />
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

        {/* Compact Footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <span>Press <strong>ESC</strong> to close</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
