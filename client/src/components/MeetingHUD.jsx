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
  ZoomOut,
  Smile,
  PenTool,
  Lightbulb,
  Film,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function MeetingHUD({
  roomId = 'main-office',
  mapType = 'office',
  onSwitchMap = () => {},
  participantCount = 1,
  userName = '',
  currentSocketId = null,
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
  activeSpeakerCount = 0,
  iceConnectionStatus = 'new',
  onThrowProjectile = () => {},
  onSendEmoji = () => {},
  hoveredSeatInfo = null,
  whiteboardUser = null,
  onOpenWhiteboard = () => {},
  theatreLightsOn = true,
  onToggleTheatreLights = () => {},
  onOpenMoviePlayer = () => {},
  isModalOpen = false
}) {
  const [showControlsHint, setShowControlsHint] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const previewVideoRef = useRef(null);

  // Close popup menus when a modal opens
  useEffect(() => {
    if (isModalOpen) {
      setShowEmojiPicker(false);
      setShowControlsHint(false);
    }
  }, [isModalOpen]);

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

  // Press E to exit seat; Press V to toggle cursor mode; Press L for theatre lights
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'KeyE') {
        if (isSitting) {
          e.preventDefault();
          onToggleSit();
        }
      }
      if (e.code === 'KeyV') {
        e.preventDefault();
        onToggleCursorFree();
      }
      if (e.code === 'KeyL' && mapType === 'theatre') {
        e.preventDefault();
        onToggleTheatreLights && onToggleTheatreLights();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSitting, onToggleSit, onToggleCursorFree, mapType, onToggleTheatreLights]);

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}&map=${encodeURIComponent(mapType)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.7 }
    });
    onReaction('confetti');
  };

  // When in Presentation / Cinema View: clean focus view with single exit button
  if (viewMode === 'presentation') {
    return (
      <div className="pointer-events-none select-none absolute inset-0 flex flex-col justify-start items-center p-6 z-40">
        <div className="pointer-events-auto mt-2">
          <button
            onClick={() => onChangeViewMode('fpp')}
            className={`flex items-center gap-2.5 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl shadow-2xl transition-all active:scale-95 cursor-pointer ${
              mapType === 'theatre'
                ? 'border-2 border-red-500 ring-4 ring-red-500/25'
                : 'border-2 border-blue-500 ring-4 ring-blue-500/25'
            }`}
            title="Exit Viewing Mode (Return to Character)"
          >
            {mapType === 'theatre' ? (
              <Film className="w-5 h-5 text-red-400" />
            ) : (
              <Tv className="w-5 h-5 text-blue-400" />
            )}
            <span className="text-white">
              {mapType === 'theatre' ? 'Exit Cinema View' : 'Exit Presentation View'}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ml-1 ${
              mapType === 'theatre'
                ? 'bg-red-950 text-red-200 border border-red-700'
                : 'bg-blue-950 text-blue-200 border border-blue-700'
            }`}>
              Return to Avatar
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none select-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6 z-40 overflow-hidden">
      {/* TOP HEADER BAR */}
      <div className="flex items-center justify-between w-full pointer-events-auto flex-wrap gap-3">
        <div className="flex items-center gap-3 bg-slate-900 border-2 border-slate-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl">
          <div className={`w-3.5 h-3.5 rounded-full animate-pulse ${
            mapType === 'theatre' ? 'bg-red-500' : 'bg-emerald-500'
          }`} />
          <div>
            <div className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2 flex-wrap">
              <span>{mapType === 'theatre' ? 'Movie Theatre' : 'Virtual Office'}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                Room: {roomId}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                mapType === 'theatre'
                  ? 'bg-red-950 text-red-300 border-red-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {mapType === 'theatre' ? '🎬 Cinema' : '🏢 Boardroom'}
              </span>

              {/* Map Switcher Button */}
              <button
                onClick={onSwitchMap}
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all active:scale-95"
                title={mapType === 'theatre' ? 'Switch to Executive Boardroom' : 'Switch to Movie Theatre'}
              >
                {mapType === 'theatre' ? (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Go to Boardroom</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5 text-red-400" />
                    <span>Go to Cinema</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyInvite}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-all active:scale-95"
                title="Copy Invite Link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{participantCount} {participantCount === 1 ? 'person' : 'people'} in room</span>
              <span className="text-slate-600">•</span>
              <span>You: <strong className="text-blue-400">{userName}</strong></span>
              {participantCount > 1 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                    iceConnectionStatus === 'connected' || iceConnectionStatus === 'completed'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : iceConnectionStatus === 'failed'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                  }`}
                >
                  {iceConnectionStatus === 'connected' || iceConnectionStatus === 'completed'
                    ? '● P2P Live'
                    : iceConnectionStatus === 'failed'
                    ? '▲ P2P Blocked'
                    : '○ Connecting...'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* MOUSE MODE TOGGLE BUTTON ('V' key) */}
          <button
            onClick={onToggleCursorFree}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg border-2 ${
              isCursorFree
                ? 'bg-amber-500 text-black border-amber-400 ring-2 ring-amber-400/30'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
            }`}
            title="Press 'V' to release mouse or lock back into crosshair"
          >
            {isCursorFree ? (
              <>
                <MousePointer className="w-4 h-4 text-black" />
                <span>Mouse Free (V to Aim)</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4 text-blue-400" />
                <span>Aim Active (V for Mouse)</span>
              </>
            )}
          </button>

          {/* FPP / TPP View Switcher */}
          <div className="flex bg-slate-900 border-2 border-slate-700 rounded-xl p-1 shadow-lg text-white">
            <button
              onClick={() => onChangeViewMode('fpp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'fpp'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>FPP</span>
            </button>
            <button
              onClick={() => onChangeViewMode('tpp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'tpp'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>3rd Person</span>
            </button>
          </div>

          <button
            onClick={() => setShowControlsHint(!showControlsHint)}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border-2 border-slate-700 shadow-lg transition-all"
            title="Toggle Controls Guide"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCustomizer}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all active:scale-95 border border-blue-500"
          >
            <Palette className="w-4 h-4" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Movement Controls Help Drawer */}
      {showControlsHint && !isModalOpen && (
        <div className="pointer-events-auto self-start bg-slate-900 border-2 border-slate-700 text-white rounded-2xl p-4 shadow-2xl text-xs max-w-xs space-y-2 mt-2">
          <div className="flex items-center justify-between font-bold text-white text-sm">
            <span>Room Controls</span>
            <button
              onClick={() => setShowControlsHint(false)}
              className="text-slate-400 hover:text-white text-xs px-1 font-bold"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-medium text-slate-300">
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <strong className="text-blue-400 font-mono">W / S</strong> : Forward / Back
            </div>
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <strong className="text-blue-400 font-mono">A / D</strong> : Strafe Left / Right
            </div>
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <strong className="text-blue-400 font-mono">Shift</strong> : Sprint Run
            </div>
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <strong className="text-blue-400 font-mono">Space</strong> : Jump
            </div>
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 col-span-2">
              <strong className="text-blue-400 font-mono">1 / 2 / 3</strong> : Throw Tomato / Egg / Balloon
            </div>
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 col-span-2">
              <strong className="text-blue-400 font-mono">V Key</strong> : Toggle Free Mouse Cursor
            </div>
            {mapType === 'theatre' && (
              <div className="bg-red-950 px-2.5 py-1.5 rounded-lg border border-red-800 col-span-2 text-red-300">
                <strong className="text-red-400 font-mono">L Key</strong> : Toggle Cinema Lights
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM SECTION: Sitting Banner & Main Toolbar */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Seated Banner */}
        {isSitting && !isModalOpen && (
          <div className="pointer-events-auto bg-blue-900 border-2 border-blue-500 text-white px-5 py-2 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              <Armchair className="w-4 h-4 text-white" />
              <span>You are seated in {currentSeatName || (mapType === 'theatre' ? 'a cinema seat' : 'a conference chair')}</span>
            </div>
            <button
              onClick={onToggleSit}
              className="bg-white text-blue-900 font-extrabold px-3 py-1 rounded-xl text-xs hover:bg-blue-100 transition-all shadow-md active:scale-95"
            >
              Exit Seat (E)
            </button>
          </div>
        )}

        {/* Bottom Main Action Bar */}
        <div className="self-center pointer-events-auto flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 bg-slate-900 border-2 border-slate-700 px-4 py-2.5 rounded-2xl shadow-2xl max-w-5xl">
          {/* Microphone */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-semibold ${
              isMicActive
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-md shadow-emerald-500/30 border-2 border-emerald-500 font-extrabold'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone & Speak'}
          >
            {isMicActive ? <Mic className="w-4 h-4 text-black" /> : <MicOff className="w-4 h-4" />}
            <span className={`text-xs ${isMicActive ? 'text-black font-extrabold' : 'font-semibold'}`}>
              {isMicActive ? 'Unmuted' : 'Muted'}
            </span>
          </button>

          {/* Camera */}
          <button
            onClick={onToggleCam}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-semibold ${
              isCamActive
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-md shadow-emerald-500/30 border-2 border-emerald-500 font-extrabold'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700'
            }`}
            title={isCamActive ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isCamActive ? <Video className="w-4 h-4 text-black" /> : <VideoOff className="w-4 h-4" />}
            <span className={`text-xs ${isCamActive ? 'text-black font-extrabold' : 'font-semibold'}`}>
              {isCamActive ? 'Camera On' : 'Camera Off'}
            </span>
          </button>

          {/* Screen Share */}
          {(() => {
            const isAnotherPresenter = screenPresenter && screenPresenter.presenterId !== currentSocketId;
            return (
              <button
                onClick={() => {
                  if (isAnotherPresenter) {
                    alert(`Screen sharing is currently in use by ${screenPresenter.presenterName}. Only one person can share at a time.`);
                    return;
                  }
                  onToggleScreenShare();
                }}
                disabled={isAnotherPresenter && !isScreenSharing}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-semibold ${
                  isScreenSharing
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 font-bold'
                    : isAnotherPresenter
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700'
                }`}
                title={
                  isScreenSharing
                    ? 'Stop Screen Sharing'
                    : isAnotherPresenter
                    ? `Screen share in use by ${screenPresenter.presenterName}`
                    : 'Share Screen'
                }
              >
                <MonitorUp className="w-4 h-4" />
                <span className="text-xs font-bold">
                  {isScreenSharing
                    ? 'Sharing'
                    : isAnotherPresenter
                    ? `In Use (${screenPresenter.presenterName})`
                    : 'Share Screen'}
                </span>
              </button>
            );
          })()}

          <div className="w-[1px] h-6 bg-slate-700 mx-0.5 hidden sm:block" />

          {/* MAP-SPECIFIC CONTROLS */}
          {mapType === 'theatre' ? (
            <>
              {/* Cinema Focus View */}
              <button
                onClick={() => onChangeViewMode(viewMode === 'presentation' ? 'fpp' : 'presentation')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'presentation'
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-red-300 border border-slate-700'
                }`}
              >
                <Tv className="w-4 h-4 text-red-400" />
                <span>{viewMode === 'presentation' ? 'Exit Cinema View' : 'Cinema View'}</span>
              </button>

              {/* Movie Player & Screen Share Projector */}
              <button
                onClick={onOpenMoviePlayer}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-950 hover:bg-red-900 text-red-200 border border-red-700 shadow-sm transition-all active:scale-95"
                title="Open Cinema Video Player & Projector"
              >
                <Film className="w-4 h-4 text-red-400" />
                <span>Screen Media</span>
              </button>

              {/* Theatre Lights */}
              <button
                onClick={onToggleTheatreLights}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  theatreLightsOn
                    ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border-amber-700'
                    : 'bg-slate-950 hover:bg-slate-800 text-yellow-300 border-yellow-600 ring-2 ring-yellow-400/30'
                }`}
                title="Toggle Cinema Lighting (L key)"
              >
                <Lightbulb className={`w-4 h-4 ${theatreLightsOn ? 'text-amber-400' : 'text-yellow-300'}`} />
                <span>{theatreLightsOn ? 'Lights: ON' : 'Cinema Mode'}</span>
              </button>
            </>
          ) : (
            <>
              {/* Office TV Focus */}
              <button
                onClick={() => onChangeViewMode(viewMode === 'presentation' ? 'fpp' : 'presentation')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'presentation'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : screenPresenter
                    ? 'bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-600'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Tv className="w-4 h-4 text-blue-400" />
                <span>
                  {viewMode === 'presentation'
                    ? 'Return'
                    : screenPresenter
                    ? `View TV (${screenPresenter.presenterName})`
                    : 'Focus TV'}
                </span>
              </button>

              {/* Whiteboard */}
              {(() => {
                const isAnotherWhiteboardUser = whiteboardUser && whiteboardUser.userId !== currentSocketId;
                return (
                  <button
                    onClick={() => {
                      if (isAnotherWhiteboardUser) {
                        alert(`Whiteboard is in use by ${whiteboardUser.userName}.`);
                        return;
                      }
                      onOpenWhiteboard();
                    }}
                    disabled={isAnotherWhiteboardUser}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isAnotherWhiteboardUser
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        : 'bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 shadow-sm'
                    }`}
                  >
                    <PenTool className="w-4 h-4 text-blue-400" />
                    <span>
                      {isAnotherWhiteboardUser
                        ? `Board (${whiteboardUser.userName})`
                        : 'Whiteboard'}
                    </span>
                  </button>
                );
              })()}
            </>
          )}

          <div className="w-[1px] h-6 bg-slate-700 mx-0.5 hidden sm:block" />

          {/* Confetti */}
          <button
            onClick={triggerConfetti}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl transition-all active:scale-90"
            title="Send Confetti Reaction"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Projectiles (Tomato [1], Egg [2], Balloon [3]) */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => onThrowProjectile('tomato')}
              className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-red-950 text-red-400 border border-slate-800 rounded-lg text-xs font-bold"
              title="Throw Tomato (Key 1)"
            >
              <span>🍅</span>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-red-950 text-red-300 border border-red-800">1</span>
            </button>
            <button
              onClick={() => onThrowProjectile('egg')}
              className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-yellow-950 text-yellow-400 border border-slate-800 rounded-lg text-xs font-bold"
              title="Throw Egg (Key 2)"
            >
              <span>🥚</span>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-yellow-950 text-yellow-300 border border-yellow-800">2</span>
            </button>
            <button
              onClick={() => onThrowProjectile('water_balloon')}
              className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-sky-950 text-sky-400 border border-slate-800 rounded-lg text-xs font-bold"
              title="Throw Balloon (Key 3)"
            >
              <span>💧</span>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-sky-950 text-sky-300 border border-sky-800">3</span>
            </button>
          </div>

          {/* Emoji Reaction Tray */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all active:scale-90 ${
                showEmojiPicker
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
              }`}
              title="Emoji Bubble"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Floating Emoji Shelf */}
            {showEmojiPicker && !isModalOpen && (
              <div className="absolute bottom-14 right-0 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl p-2 flex items-center gap-1.5 z-50 select-none animate-fadeIn">
                {['😀', '😂', '🔥', '❤️', '👍', '🎉', '👏', '😮', '🚀', '💯'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl p-1.5 hover:bg-slate-800 rounded-xl transition-transform hover:scale-125 active:scale-95"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-6 bg-slate-700 mx-0.5 hidden sm:block" />

          {/* Leave Room Button */}
          <button
            onClick={onLeaveMeeting}
            className="p-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl transition-all font-semibold"
            title="Leave Meeting Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Live Camera Selfie Preview (PIP) - hidden when in viewing mode or modal open */}
      {isCamActive && localStream && !isModalOpen && viewMode !== 'presentation' && (
        <div className="pointer-events-auto fixed bottom-24 right-6 z-40 flex flex-col items-center select-none bg-slate-900 border-2 border-slate-700 p-2.5 rounded-3xl shadow-2xl space-y-2">
          {/* Circular Camera Viewport */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl bg-black ring-4 ring-blue-500/20">
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
          </div>

          {/* Camera Zoom Control Slider */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2 py-1 rounded-full shadow-inner">
            <button
              onClick={() => onChangeCamZoom(camZoom - 0.15)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Zoom Out Face"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={camZoom}
              onChange={(e) => onChangeCamZoom(parseFloat(e.target.value))}
              className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title="Camera Zoom Level"
            />
            <button
              onClick={() => onChangeCamZoom(camZoom + 0.15)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Zoom In Face"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-blue-400 font-bold ml-0.5">
              {camZoom.toFixed(1)}x
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
