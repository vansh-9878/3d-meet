import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { io } from 'socket.io-client';
import { Copy, Check, Users, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ConferenceRoom, SEAT_POSITIONS } from './components/ConferenceRoom';
import { LocalPlayer } from './components/LocalPlayer';
import { RemotePlayer } from './components/RemotePlayer';
import { AvatarCustomizer, AVATAR_PRESETS } from './components/AvatarCustomizer';
import { MeetingHUD } from './components/MeetingHUD';
import { useWebRTC } from './hooks/useWebRTC';

// Dynamically determine the socket URL:
// 1. If VITE_SOCKET_URL is set (e.g. on Vercel connecting to Render: https://your-backend.onrender.com), use it.
// 2. Otherwise in local development, connect to hostname:4000 so hotspot/LAN connects seamlessly.
const SERVER_PORT = 4000;
const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`
    : 'http://localhost:4000');

export default function App() {
  // Read Room ID from URL query parameters (e.g. ?room=design-sprint), or default to 'main-office'
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'main-office';
  });

  const [userName, setUserName] = useState(() => `Participant ${Math.floor(100 + Math.random() * 900)}`);
  const [hasEntered, setHasEntered] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState(AVATAR_PRESETS[0]);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('fpp'); // 'fpp' | 'tpp' | 'presentation'

  // Cursor Mode
  const [isCursorFree, setIsCursorFree] = useState(false);

  // Camera video zoom level (1.0x to 2.5x)
  const [camZoom, setCamZoom] = useState(1.2);

  // Seating state
  const [currentSeat, setCurrentSeat] = useState(null);

  // Network state
  const [socket, setSocket] = useState(null);
  const [remotePlayers, setRemotePlayers] = useState({});
  const [copiedLobbyLink, setCopiedLobbyLink] = useState(false);

  // WebRTC Audio, Video & Screen Sharing
  const {
    localStream,
    screenStream,
    remoteStreams,
    peerMediaStates,
    isCamActive,
    isMicActive,
    isScreenSharing,
    screenPresenter,
    iceConnectionStatus,
    toggleCamera,
    toggleMic,
    toggleScreenShare
  } = useWebRTC(socket, roomId, userName);

  const hasEnteredRef = useRef(false);
  const avatarConfigRef = useRef(avatarConfig);
  const userNameRef = useRef(userName);
  const roomIdRef = useRef(roomId);

  useEffect(() => { hasEnteredRef.current = hasEntered; }, [hasEntered]);
  useEffect(() => { avatarConfigRef.current = avatarConfig; }, [avatarConfig]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  useEffect(() => {
    const s = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log(`[Socket Connected] Connected to server at ${SOCKET_SERVER_URL} (ID: ${s.id})`);
      if (hasEnteredRef.current) {
        const activeRoom = (roomIdRef.current && roomIdRef.current.trim()) ? roomIdRef.current.trim().toLowerCase() : 'main-office';
        s.emit('join-room', {
          roomId: activeRoom,
          user: {
            name: userNameRef.current,
            avatarConfig: avatarConfigRef.current,
            position: [0, 0, 5.0],
            rotation: Math.PI
          }
        });
      }
    });

    // Received participant list for the current room
    s.on('room-users', ({ roomId: joinedRoomId, users }) => {
      const peers = {};
      users.forEach((u) => {
        if (u.id !== s.id) {
          peers[u.id] = u;
        }
      });
      setRemotePlayers(peers);
    });

    // Remote teammate joined
    s.on('user-joined', (userData) => {
      setRemotePlayers((prev) => ({
        ...prev,
        [userData.id]: userData
      }));
    });

    // Remote teammate moved
    s.on('player-moved', (data) => {
      setRemotePlayers((prev) => {
        if (!prev[data.id]) return prev;
        return {
          ...prev,
          [data.id]: {
            ...prev[data.id],
            position: data.position,
            rotation: data.rotation,
            state: data.state
          }
        };
      });
    });

    // Remote teammate sat down / stood up
    s.on('player-sat', (data) => {
      setRemotePlayers((prev) => {
        if (!prev[data.id]) return prev;
        return {
          ...prev,
          [data.id]: {
            ...prev[data.id],
            state: data.isSitting ? 'sitting' : 'idle',
            seatId: data.seatId,
            position: data.position,
            rotation: data.rotation
          }
        };
      });
    });

    // Remote avatar appearance updated
    s.on('avatar-updated', (data) => {
      setRemotePlayers((prev) => {
        if (!prev[data.id]) return prev;
        return {
          ...prev,
          [data.id]: {
            ...prev[data.id],
            avatarConfig: data.avatarConfig
          }
        };
      });
    });

    // Speaking state changed
    s.on('player-speaking-changed', (data) => {
      setRemotePlayers((prev) => {
        if (!prev[data.id]) return prev;
        return {
          ...prev,
          [data.id]: {
            ...prev[data.id],
            isSpeaking: data.isSpeaking
          }
        };
      });
    });

    // Reactions & confetti
    s.on('player-reaction', (data) => {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.8 }
      });
    });

    // Teammate left room
    s.on('user-left', (socketId) => {
      setRemotePlayers((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Join Room
  const handleJoinMeeting = (e) => {
    if (e) e.preventDefault();
    if (!socket) return;

    const sanitizedRoom = (roomId && roomId.trim()) ? roomId.trim().toLowerCase() : 'main-office';
    setRoomId(sanitizedRoom);

    // Update browser URL query param without full page reload
    const newUrl = `${window.location.pathname}?room=${encodeURIComponent(sanitizedRoom)}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    socket.emit('join-room', {
      roomId: sanitizedRoom,
      user: {
        name: userName,
        avatarConfig,
        position: [0, 0, 5.0],
        rotation: Math.PI
      }
    });

    setHasEntered(true);
    setIsCursorFree(false);
  };

  // Avatar config change
  const handleAvatarChange = (newConfig) => {
    setAvatarConfig(newConfig);
    if (socket) {
      socket.emit('update-avatar', newConfig);
    }
  };

  // Chair selection handler
  const handleSeatSelect = (seat) => {
    if (currentSeat?.id === seat.id) {
      handleStandUp();
    } else {
      setCurrentSeat(seat);
      if (socket) {
        socket.emit('player-sit', {
          isSitting: true,
          seatId: seat.id,
          position: seat.position,
          rotation: seat.rotation
        });
      }
    }
  };

  // Exit seat handler
  const handleStandUp = () => {
    setCurrentSeat(null);
    if (socket) {
      socket.emit('player-sit', {
        isSitting: false,
        seatId: null
      });
    }
  };

  // Position updates from local player
  const handleLocalMove = (moveData) => {
    if (socket && !currentSeat) {
      socket.emit('player-move', moveData);
    }
  };

  // Toggle cursor freedom
  const handleToggleCursor = () => {
    setIsCursorFree((prev) => !prev);
  };

  // Toggle speaking microphone
  const handleToggleMic = () => {
    toggleMic();
  };

  // Adjust camera video zoom
  const handleCamZoomChange = (z) => {
    const clamped = Math.max(1.0, Math.min(2.5, z));
    setCamZoom(clamped);
    if (socket) {
      socket.emit('media-state-changed', { camZoom: clamped });
    }
  };

  // Send reaction to entire room
  const handleReaction = (reaction) => {
    if (socket) {
      socket.emit('send-reaction', reaction);
    }
  };

  // Copy shareable link from lobby
  const handleCopyLobbyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId || 'main-office')}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLobbyLink(true);
    setTimeout(() => setCopiedLobbyLink(false), 2500);
  };

  // Generate random room code
  const handleGenerateRandomRoom = () => {
    const randId = `room-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomId(randId);
  };

  // Join Lobby Screen
  if (!hasEntered) {
    return (
      <div className="relative w-screen h-screen bg-slate-900 flex items-center justify-center font-sans overflow-hidden">
        <div className="relative z-10 w-full max-w-lg bg-white border border-gray-300 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
              Phase 2 • Real-Time Multiplayer Office
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Virtual 3D Conference</h1>
            <p className="text-xs text-gray-600 font-medium mt-1">
              Join with teammates on the same Wi-Fi, hotspot, or local network.
            </p>
          </div>

          <form onSubmit={handleJoinMeeting} className="space-y-4">
            {/* Room ID Input & Generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Room Name or Unique ID
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomRoom}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Generate Random
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm font-semibold"
                  placeholder="e.g. design-sprint, team-standup"
                />
                <button
                  type="button"
                  onClick={handleCopyLobbyInvite}
                  className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Copy shareable room invite link"
                >
                  {copiedLobbyLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-600" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Anyone opening this link or joining this Room ID will enter the same 3D room with you.
              </p>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm font-semibold"
                placeholder="e.g. Sarah Jenkins"
              />
            </div>

            {/* Outfit Preset Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Outfit Preset
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatarConfig(preset)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      avatarConfig.suitColor === preset.suitColor
                        ? 'bg-blue-50 border-2 border-blue-600 text-blue-900 shadow-sm'
                        : 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                      style={{ backgroundColor: preset.suitColor }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 transition-all transform active:scale-98 mt-2"
            >
              Enter Virtual Office Room
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-200 text-center text-xs font-medium text-gray-500">
            Share your invite link with others on your hotspot/Wi-Fi to join together!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-screen h-screen bg-slate-100 overflow-hidden font-sans ${
        !isCursorFree && viewMode === 'fpp' ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* 3D Scene Viewport */}
      <Canvas
        shadows
        camera={{ position: [0, 1.62, 5.0], fov: 60 }}
        className="w-full h-full"
      >
        <ambientLight intensity={1.5} />
        
        <directionalLight
          position={[10, 15, 6]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={35}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          color="#fffbf0"
        />

        <directionalLight
          position={[-10, 10, -6]}
          intensity={0.9}
          color="#e0f2fe"
        />

        <pointLight position={[0, 4.5, 0]} intensity={1.2} color="#fef3c7" distance={16} />

        <ConferenceRoom
          onSeatSelect={handleSeatSelect}
          currentSeatId={currentSeat?.id}
          isCursorFree={isCursorFree}
          screenStream={screenStream || screenPresenter?.stream}
          presenterName={screenPresenter?.presenterName}
        />

        <LocalPlayer
          avatarConfig={avatarConfig}
          name={userName}
          isSitting={!!currentSeat}
          seatData={currentSeat}
          onPositionChange={handleLocalMove}
          viewMode={viewMode}
          onStandUp={handleStandUp}
          isCursorFree={isCursorFree}
          videoStream={localStream}
          isCamActive={isCamActive}
          camZoom={camZoom}
        />

        {/* Real-time Multiplayer Remote Participants */}
        {Object.values(remotePlayers).map((player) => (
          <RemotePlayer
            key={player.id}
            player={player}
            videoStream={remoteStreams[player.id]}
            isCamActive={peerMediaStates[player.id]?.isCamActive ?? player.mediaState?.isCamActive ?? false}
            camZoom={peerMediaStates[player.id]?.camZoom || 1.2}
          />
        ))}

        <ContactShadows position={[0, 0.005, 0]} opacity={0.45} scale={26} blur={1.4} far={5} />
      </Canvas>

      {/* Center Reticle Crosshair in FPP Aim Mode */}
      {viewMode === 'fpp' && !isCursorFree && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-50">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-md" />
            <div className="absolute w-6 h-6 rounded-full border border-blue-500/80" />
            <div className="absolute w-9 h-9 rounded-full border border-white/60" />
          </div>
        </div>
      )}

      {/* Floating HUD & Conference Controls */}
      <MeetingHUD
        roomId={roomId}
        participantCount={Object.keys(remotePlayers).length + 1}
        userName={userName}
        isSitting={!!currentSeat}
        currentSeatName={currentSeat?.label}
        onToggleSit={() => {
          if (currentSeat) {
            handleStandUp();
          } else {
            handleSeatSelect(SEAT_POSITIONS[0]);
          }
        }}
        viewMode={viewMode}
        onChangeViewMode={(mode) => setViewMode(mode)}
        onOpenCustomizer={() => {
          setIsCursorFree(true);
          setIsCustomizerOpen(true);
        }}
        onReaction={handleReaction}
        onLeaveMeeting={() => setHasEntered(false)}
        isCursorFree={isCursorFree}
        onToggleCursorFree={handleToggleCursor}
        isMicActive={isMicActive}
        onToggleMic={handleToggleMic}
        isCamActive={isCamActive}
        onToggleCam={toggleCamera}
        localStream={localStream}
        camZoom={camZoom}
        onChangeCamZoom={handleCamZoomChange}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={toggleScreenShare}
        screenPresenter={screenPresenter}
        iceConnectionStatus={iceConnectionStatus}
      />

      {/* Avatar Customization Modal */}
      <AvatarCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        currentConfig={avatarConfig}
        onChange={handleAvatarChange}
      />
    </div>
  );
}
