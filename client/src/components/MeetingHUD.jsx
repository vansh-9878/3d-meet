import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Tv,
  Users,
  Palette,
  Armchair,
  LogOut,
  Sparkles,
  Info,
  Eye,
  UserCheck,
  MousePointer,
  Crosshair,
  Copy,
  Check,
  MonitorUp,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function MeetingHUD({
  roomId = 'main-office',
  participantCount = 1,
  userName = '',
  isSitting = false,
  currentSeatName = '',
  onToggleSit = () => {},
  viewMode = 'fpp',
  onChangeViewMode = () => {},
  onOpenCustomizer = () => {},
  onReaction = () => {},
  onLeaveMeeting = () => {},
  isCursorFree = false,
  onToggleCursorFree = () => {},
  isMicActive = false,
  onToggleMic = () => {},
  isCamActive = false,
  onToggleCam = () => {},
  localStream = null,
  camZoom = 1.2,
  onChangeCamZoom = () => {},
  isScreenSharing = false,
  onToggleScreenShare = () => {},
  screenPresenter = null,
  activeSpeakerCount = 0
}) {
  const [showControlsHint, setShowControlsHint] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const previewVideoRef = useRef(null);

  useEffect(() => {
    if (previewVideoRef.current) {
      if (isCamActive && localStream) {
        previewVideoRef.current.srcObject = localStream;
        previewVideoRef.current.play().catch(() => {});
      } else {
        previewVideoRef.current.srcObject = null;
      }
    }
  }, [isCamActive, localStream]);

  // Press E or Spacebar to exit seat; Press V to toggle cursor mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'KeyE') {
        if (isSitting) {
          e.preventDefault();
          onToggleSit();
        }
      }
      // 'V' key toggles cursor mode (Aim Active vs Mouse Free)
      if (e.code === 'KeyV') {
        e.preventDefault();
        onToggleCursorFree();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSitting, onToggleSit, onToggleCursorFree]);

  const handleCopyInvite = () => {
    // Generate shareable link containing the room query param
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.85 }
    });
    onReaction('confetti');
  };

  return (
    <div className="pointer-events-none select-none absolute inset-0 flex flex-col justify-between p-6 z-40">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-2xl border border-gray-300 shadow-xl">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-sm font-extrabold text-gray-900 tracking-wide flex items-center gap-2">
              Virtual Office
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                Room: {roomId}
              </span>
              <button
                onClick={handleCopyInvite}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all active:scale-95"
                title="Copy Invite Link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-gray-500" />
                    <span>Copy Invite</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-xs font-semibold text-gray-600 flex items-center gap-2 mt-0.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{participantCount} {participantCount === 1 ? 'person' : 'people'} in room</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-800">You: <strong className="text-blue-700">{userName}</strong></span>
              {isMicActive && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300">
                  Speaking
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* MOUSE MODE TOGGLE BUTTON ('V' key shortcut) */}
          <button
            onClick={onToggleCursorFree}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg border ${
              isCursorFree
                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
            }`}
            title="Press 'V' to release mouse or lock back into crosshair"
          >
            {isCursorFree ? (
              <>
                <MousePointer className="w-4 h-4 text-white" />
                <span>Mouse Free (Press V to Aim)</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4 text-blue-600" />
                <span>Aim Active (Press V for Mouse)</span>
              </>
            )}
          </button>

          {/* FPP / TPP View Switcher */}
          <div className="flex bg-white border border-gray-300 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => onChangeViewMode('fpp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'fpp'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="First Person Perspective"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>FPP</span>
            </button>
            <button
              onClick={() => onChangeViewMode('tpp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'tpp'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Third Person Perspective"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>3rd Person</span>
            </button>
          </div>

          <button
            onClick={() => setShowControlsHint(!showControlsHint)}
            className="p-2.5 bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl border border-gray-300 shadow-lg transition-all"
            title="Toggle Controls Guide"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCustomizer}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all active:scale-95 border border-blue-500"
          >
            <Palette className="w-4 h-4" />
            <span>Customize Avatar</span>
          </button>
        </div>
      </div>

      {/* Movement & Navigation Help Overlay */}
      {showControlsHint && (
        <div className="pointer-events-auto self-start bg-white text-gray-800 border border-gray-300 rounded-2xl p-4 shadow-2xl text-xs max-w-xs space-y-2 mt-2">
          <div className="flex items-center justify-between font-bold text-gray-900 text-sm">
            <span>Room Controls</span>
            <button
              onClick={() => setShowControlsHint(false)}
              className="text-gray-400 hover:text-gray-700 text-xs px-1 font-bold"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-medium text-gray-700">
            <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
              <strong className="text-blue-700 font-mono">W / S</strong> : Forward / Back
            </div>
            <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
              <strong className="text-blue-700 font-mono">A / D</strong> : Strafe Left / Right
            </div>
            <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
              <strong className="text-blue-700 font-mono">Shift</strong> : Sprint Run
            </div>
            <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
              <strong className="text-blue-700 font-mono">Space</strong> : Jump (on table)
            </div>
            <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 col-span-2">
              <strong className="text-blue-700 font-mono">V Key</strong> : Toggle Free Mouse Cursor
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SECTION: Sitting Popup Banner & Main Toolbar */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Seated Banner */}
        {isSitting && (
          <div className="pointer-events-auto bg-blue-600 text-white px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-blue-300 animate-pulse">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Armchair className="w-5 h-5 text-white" />
              <span>You are seated in {currentSeatName || 'a conference chair'}</span>
            </div>
            <button
              onClick={onToggleSit}
              className="bg-white text-blue-700 font-extrabold px-3.5 py-1.5 rounded-xl text-xs hover:bg-blue-50 transition-all shadow-md active:scale-95"
            >
              Exit Seat (Press E)
            </button>
          </div>
        )}

        {/* Bottom Main Action Bar */}
        <div className="self-center pointer-events-auto flex items-center gap-3 bg-white border border-gray-300 px-6 py-3.5 rounded-2xl shadow-2xl">
          {/* Microphone & Speaking indicator */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-3.5 py-3 rounded-xl transition-all font-semibold ${
              isMicActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone & Speak'}
          >
            {isMicActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-xs font-bold">{isMicActive ? 'Speaking' : 'Muted'}</span>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={onToggleCam}
            className={`flex items-center gap-2 px-3.5 py-3 rounded-xl transition-all font-semibold ${
              isCamActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
            }`}
            title={isCamActive ? 'Turn Off Camera' : 'Turn On Camera (Live Head Viewport)'}
          >
            {isCamActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-xs font-bold">{isCamActive ? 'Camera On' : 'Camera Off'}</span>
          </button>

          {/* Screen Share Button */}
          <button
            onClick={onToggleScreenShare}
            className={`flex items-center gap-2 px-3.5 py-3 rounded-xl transition-all font-semibold ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 animate-pulse'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen (Cast to Presentation TV)'}
          >
            <MonitorUp className="w-5 h-5" />
            <span className="text-xs font-bold">{isScreenSharing ? 'Sharing Screen' : 'Share Screen'}</span>
          </button>

          <div className="w-[1px] h-7 bg-gray-200 mx-1" />

          {/* Presentation TV Direct View Mode */}
          <button
            onClick={() => onChangeViewMode(viewMode === 'presentation' ? 'fpp' : 'presentation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'presentation'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-400 shadow-md shadow-indigo-600/20'
                : screenPresenter
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 animate-pulse'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
            title="Direct camera focus onto the Presentation Screen"
          >
            <Tv className="w-4 h-4 text-indigo-600" />
            <span>
              {viewMode === 'presentation'
                ? 'Return to Character'
                : screenPresenter
                ? `View TV (${screenPresenter.presenterName})`
                : 'Focus Presentation TV'}
            </span>
          </button>

          {/* Confetti / Celebration */}
          <button
            onClick={triggerConfetti}
            className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl transition-all active:scale-90"
            title="Send Confetti Reaction to Room"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-7 bg-gray-200 mx-1" />

          {/* Leave Room Button */}
          <button
            onClick={onLeaveMeeting}
            className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition-all font-semibold"
            title="Leave Meeting Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Live Camera Selfie Preview (PIP) with Interactive Zoom Controls */}
      {isCamActive && localStream && (
        <div className="pointer-events-auto fixed bottom-28 right-6 z-50 flex flex-col items-center select-none bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-3xl shadow-2xl space-y-2.5">
          {/* Circular Camera Viewport */}
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl bg-black ring-4 ring-blue-500/20">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover origin-center transition-transform duration-75"
              style={{
                transform: `scale(${camZoom}) scaleX(-1)`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none flex items-end justify-center pb-2">
              <span className="text-[10px] font-extrabold text-white uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/90 shadow">
                You ({camZoom.toFixed(1)}x)
              </span>
            </div>
          </div>

          {/* Interactive Zoom Adjustment Slider & Presets */}
          <div className="w-full flex flex-col items-center gap-1.5 px-0.5">
            <div className="flex items-center justify-between w-full text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                Video Zoom
              </span>
              <span className="text-blue-400 font-mono text-xs">{camZoom.toFixed(1)}x</span>
            </div>

            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={camZoom}
              onChange={(e) => onChangeCamZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title="Drag to zoom video in or out"
            />

            {/* Quick 1x / 1.2x / 1.5x / 2x Buttons */}
            <div className="grid grid-cols-4 gap-1 w-full pt-0.5">
              {[1.0, 1.2, 1.5, 2.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeCamZoom(preset)}
                  className={`py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    Math.abs(camZoom - preset) < 0.05
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
