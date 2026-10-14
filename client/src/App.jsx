import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { io } from 'socket.io-client';
import { Copy, Check, Users, Sparkles, Film, Building2, Clapperboard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ConferenceRoom, SEAT_POSITIONS } from './components/ConferenceRoom';
import { MovieTheatre, THEATRE_SEAT_POSITIONS } from './components/MovieTheatre';
import { LocalPlayer } from './components/LocalPlayer';
import { RemotePlayer } from './components/RemotePlayer';
import { AvatarCustomizer, AVATAR_PRESETS } from './components/AvatarCustomizer';
import { MeetingHUD } from './components/MeetingHUD';
import { SplatterOverlay } from './components/SplatterOverlay';
import { ProjectileSystem } from './components/ProjectileSystem';
import { WhiteboardModal } from './components/WhiteboardModal';
import { MoviePlayerModal } from './components/MoviePlayerModal';
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
  // Read Room ID & Map Type from URL query parameters
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'main-office';
  });

  const [mapType, setMapType] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const map = params.get('map');
    return map === 'theatre' ? 'theatre' : 'office';
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

  // Seat Crosshair Hovering
  const [hoveredSeatId, setHoveredSeatId] = useState(null);
  const [hoveredSeatOccupied, setHoveredSeatOccupied] = useState(false);

  // Projectiles & Puddles
  const [activeProjectiles, setActiveProjectiles] = useState([]);
  const [puddles, setPuddles] = useState([]);
  const projectileSystemRef = useRef(null);

  // Screen Splatter on Impact (2-4 seconds)
  const [splatterData, setSplatterData] = useState(null);

  // Local Emoji Bubble (2-3 seconds)
  const [localEmoji, setLocalEmoji] = useState(null);

  // Collaborative Whiteboard State (Office Map)
  const [whiteboardUser, setWhiteboardUser] = useState(null);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState([]);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  // Movie Theatre Map State
  const [theatreLightsOn, setTheatreLightsOn] = useState(true);
  const [theatrePlayback, setTheatrePlayback] = useState({
    videoUrl: '',
    isPlaying: false,
    currentTime: 0,
    lastUpdated: Date.now(),
    playbackRate: 1,
    updatedBy: ''
  });
  const [isMoviePlayerOpen, setIsMoviePlayerOpen] = useState(false);
  const theatreVideoRef = useRef(null);

  // Local player ref for podium / teleportation
  const localPlayerRef = useRef(null);

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
  const mapTypeRef = useRef(mapType);

  useEffect(() => { hasEnteredRef.current = hasEntered; }, [hasEntered]);
  useEffect(() => { avatarConfigRef.current = avatarConfig; }, [avatarConfig]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { mapTypeRef.current = mapType; }, [mapType]);
  useEffect(() => {
    if (viewMode === 'presentation') {
      setIsCursorFree(true);
    }
  }, [viewMode]);

  useEffect(() => {
    const s = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log(`[Socket Connected] Connected to server at ${SOCKET_SERVER_URL} (ID: ${s.id})`);
      if (hasEnteredRef.current) {
        const activeRoom = (roomIdRef.current && roomIdRef.current.trim()) ? roomIdRef.current.trim().toLowerCase() : 'main-office';
        const spawn = mapTypeRef.current === 'theatre' ? [0, 0, 8.2] : [0, 0, 5.0];
        s.emit('join-room', {
          roomId: activeRoom,
          mapType: mapTypeRef.current,
          user: {
            name: userNameRef.current,
            avatarConfig: avatarConfigRef.current,
            position: spawn,
            rotation: Math.PI
          }
        });
      }
    });

    // Received participant list for the current room
    s.on('room-users', ({ roomId: joinedRoomId, mapType: serverMapType, users, whiteboardUser: wbUser, whiteboardStrokes: wbStrokes, theatreLighting, theatrePlayback: syncPlayback }) => {
      const peers = {};
      users.forEach((u) => {
        if (u.id !== s.id) {
          peers[u.id] = u;
        }
      });
      setRemotePlayers(peers);
      // Only inherit server map type if there are other participants already in the room
      if (serverMapType && Object.keys(peers).length > 0) {
        setMapType(serverMapType);
      }
      if (wbUser !== undefined) setWhiteboardUser(wbUser);
      if (wbStrokes !== undefined) setWhiteboardStrokes(wbStrokes);
      if (theatreLighting?.lightsOn !== undefined) setTheatreLightsOn(theatreLighting.lightsOn);
      if (syncPlayback) setTheatrePlayback(syncPlayback);
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

    // Projectile Thrown by anyone in room (Tomato, Egg, Water Balloon)
    s.on('projectile-thrown', (data) => {
      setActiveProjectiles((prev) => [...prev, { ...data, startTime: Date.now() }]);
    });

    // Screen Splatter when hit directly by a projectile
    s.on('player-splattered', (data) => {
      setSplatterData({ ...data, timestamp: Date.now() });
    });

    // 3D Avatar Emoji Bubble
    s.on('player-emoji', (data) => {
      if (data.id === s.id) {
        setLocalEmoji(data.emoji);
        setTimeout(() => setLocalEmoji(null), 3000);
      } else {
        setRemotePlayers((prev) => {
          if (!prev[data.id]) return prev;
          return {
            ...prev,
            [data.id]: {
              ...prev[data.id],
              activeEmoji: data.emoji
            }
          };
        });
        setTimeout(() => {
          setRemotePlayers((prev) => {
            if (!prev[data.id]) return prev;
            return {
              ...prev,
              [data.id]: {
                ...prev[data.id],
                activeEmoji: null
              }
            };
          });
        }, 3000);
      }
    });

    // Seat exclusivity error
    s.on('seat-error', (data) => {
      alert(data.message || 'This seat is already occupied!');
    });

    // Screen share exclusivity error
    s.on('screen-share-error', (data) => {
      alert(data.message || 'Screen sharing is already in use by another participant.');
    });

    // Whiteboard claimed by participant
    s.on('whiteboard-claimed', (data) => {
      setWhiteboardUser(data.whiteboardUser);
    });

    // Whiteboard released
    s.on('whiteboard-released', () => {
      setWhiteboardUser(null);
    });

    // Whiteboard draw update
    s.on('whiteboard-draw', (stroke) => {
      if (stroke.clearAll) {
        setWhiteboardStrokes([]);
      } else {
        setWhiteboardStrokes((prev) => [...prev, stroke]);
      }
    });

    // Whiteboard exclusivity error
    s.on('whiteboard-error', (data) => {
      alert(data.message || 'Whiteboard is currently occupied.');
    });

    // Theatre lighting update
    s.on('theatre-lights-changed', ({ lightsOn }) => {
      setTheatreLightsOn(lightsOn);
    });

    // Theatre synchronized video playback update
    s.on('theatre-playback-updated', (playbackData) => {
      setTheatrePlayback(playbackData);
    });

    // Map changed broadcast from room
    s.on('map-changed', ({ mapType: newMapType }) => {
      setMapType(newMapType);
      setCurrentSeat(null);
      const spawn = newMapType === 'theatre' ? [0, 0, 8.2] : [0, 0, 5.0];
      localPlayerRef.current?.teleport(spawn, Math.PI);
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

  // Initialize background HTML5 <video> element for Theatre VideoTexture & audio
  useEffect(() => {
    let video = theatreVideoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '320px';
      video.style.height = '180px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
      theatreVideoRef.current = video;
    }

    return () => {
      if (video && video.parentNode) {
        video.pause();
        video.src = '';
        video.parentNode.removeChild(video);
      }
    };
  }, []);

  // Synchronize local HTML5 video element with authoritative theatre playback state
  useEffect(() => {
    const video = theatreVideoRef.current;
    if (!video) return;

    if (theatrePlayback.videoUrl && video.src !== theatrePlayback.videoUrl) {
      video.src = theatrePlayback.videoUrl;
      video.load();
    }

    let targetTime = theatrePlayback.currentTime || 0;
    if (theatrePlayback.isPlaying && theatrePlayback.lastUpdated) {
      const elapsed = (Date.now() - theatrePlayback.lastUpdated) / 1000;
      targetTime += elapsed * (theatrePlayback.playbackRate || 1);
    }

    if (Math.abs(video.currentTime - targetTime) > 1.2) {
      video.currentTime = targetTime;
    }

    if (theatrePlayback.isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [theatrePlayback]);

  // Join Room
  const handleJoinMeeting = (e) => {
    if (e) e.preventDefault();
    if (!socket) return;

    const sanitizedRoom = (roomId && roomId.trim()) ? roomId.trim().toLowerCase() : 'main-office';
    setRoomId(sanitizedRoom);

    // Update browser URL query param without full page reload
    const newUrl = `${window.location.pathname}?room=${encodeURIComponent(sanitizedRoom)}&map=${encodeURIComponent(mapType)}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    const spawn = mapType === 'theatre' ? [0, 0, 8.2] : [0, 0, 5.0];
    socket.emit('join-room', {
      roomId: sanitizedRoom,
      mapType,
      user: {
        name: userName,
        avatarConfig,
        position: spawn,
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

  // Map of occupied seats for exclusivity
  const occupiedSeatIds = useMemo(() => {
    const map = {};
    Object.values(remotePlayers).forEach((player) => {
      if (player.seatId && player.state === 'sitting') {
        map[player.seatId] = player.name || 'Occupied';
      }
    });
    return map;
  }, [remotePlayers]);

  // Chair selection handler (Exclusivity: no 2 people can sit on the same seat)
  const handleSeatSelect = (seat) => {
    if (currentSeat?.id === seat.id) {
      handleStandUp();
    } else {
      if (occupiedSeatIds[seat.id]) {
        alert(`This seat is already occupied by ${occupiedSeatIds[seat.id]}!`);
        return;
      }
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

  // Throw projectile (Tomato, Egg, Water Balloon) towards crosshair target
  const handleThrowProjectile = (type) => {
    if (!socket || !projectileSystemRef.current) return;
    const throwData = projectileSystemRef.current.throw(type);
    if (throwData) {
      socket.emit('throw-projectile', throwData);
    }
  };

  // Send Emoji Reaction (displayed in speech bubble for 2-3 seconds)
  const handleSendEmoji = (emoji) => {
    if (!socket) return;
    socket.emit('send-emoji', { emoji });
    setLocalEmoji(emoji);
    setTimeout(() => setLocalEmoji(null), 3000);
  };

  // Projectile impact handler: cleans up projectile and spawns ground/wall puddle
  const handleProjectileImpact = (projectile) => {
    setActiveProjectiles((prev) => prev.filter((p) => p.id !== projectile.id));

    if (projectile.hitType === 'environment' && (projectile.hitPoint || projectile.target)) {
      const puddle = {
        id: `puddle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: projectile.type,
        position: projectile.hitPoint || projectile.target,
        hitNormal: projectile.hitNormal || [0, 1, 0],
        createdAt: Date.now()
      };
      setPuddles((prev) => [...prev, puddle]);
    }
  };

  // Remove puddle when it expires
  const handleRemovePuddle = (puddleId) => {
    setPuddles((prev) => prev.filter((p) => p.id !== puddleId));
  };

  // Teleport to executive speaker podium when starting screen sharing
  const prevScreenSharingRef = useRef(false);
  useEffect(() => {
    if (isScreenSharing && !prevScreenSharingRef.current) {
      if (currentSeat) {
        handleStandUp();
      }
      const podiumPos = [5.0, 0, -10.2];
      const podiumRot = Math.PI - 0.22;
      localPlayerRef.current?.teleport(podiumPos, podiumRot);
      if (socket) {
        socket.emit('player-move', {
          position: podiumPos,
          rotation: podiumRot,
          state: 'idle'
        });
      }
    }
    prevScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing, currentSeat, socket]);

  // Hotkeys 1, 2, 3: Shoot Tomato, Egg, or Water Balloon
  useEffect(() => {
    const handleNumberKeys = (e) => {
      if (!hasEntered) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleThrowProjectile('tomato');
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleThrowProjectile('egg');
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        handleThrowProjectile('water_balloon');
      }
    };
    window.addEventListener('keydown', handleNumberKeys);
    return () => window.removeEventListener('keydown', handleNumberKeys);
  }, [hasEntered, socket]);

  // Collaborative Whiteboard handlers
  const handleOpenWhiteboard = () => {
    if (whiteboardUser && whiteboardUser.userId !== socket?.id) {
      alert(`Whiteboard is currently in use by ${whiteboardUser.userName}. Only one person can draw at a time.`);
      return;
    }
    if (socket) {
      socket.emit('whiteboard-claim');
    }
    setIsWhiteboardOpen(true);
    setIsCursorFree(true);
  };

  const handleCloseWhiteboard = () => {
    if (socket) {
      socket.emit('whiteboard-release');
    }
    setIsWhiteboardOpen(false);
  };

  const handleWhiteboardDraw = (stroke) => {
    if (stroke.clearAll) {
      setWhiteboardStrokes([]);
    } else {
      setWhiteboardStrokes((prev) => [...prev, stroke]);
    }
    if (socket) {
      socket.emit('whiteboard-draw', stroke);
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

  // Active map seats
  const currentMapSeats = mapType === 'theatre' ? THEATRE_SEAT_POSITIONS : SEAT_POSITIONS;

  // Toggle theatre lights
  const handleToggleTheatreLights = () => {
    setTheatreLightsOn((prev) => !prev);
    if (socket) {
      socket.emit('theatre-toggle-lights');
    }
  };

  // Synchronized theatre video controls
  const handleTheatreVideoControl = (controlData) => {
    if (socket) {
      socket.emit('theatre-video-control', controlData);
    }
  };

  // Switch map environment between Boardroom and Theatre
  const handleSwitchMap = () => {
    const nextMap = mapType === 'theatre' ? 'office' : 'theatre';
    setMapType(nextMap);
    handleStandUp();

    // Update URL query parameters
    const params = new URLSearchParams(window.location.search);
    params.set('map', nextMap);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    // Teleport local player to entrance of the new map
    const spawn = nextMap === 'theatre' ? [0, 0, 8.2] : [0, 0, 5.0];
    localPlayerRef.current?.teleport(spawn, Math.PI);

    if (socket) {
      socket.emit('change-map', { mapType: nextMap });
      socket.emit('player-move', {
        position: spawn,
        rotation: Math.PI,
        state: 'idle'
      });
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
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId || 'main-office')}&map=${encodeURIComponent(mapType)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLobbyLink(true);
    setTimeout(() => setCopiedLobbyLink(false), 2500);
  };

  // Generate random room code
  const handleGenerateRandomRoom = () => {
    const randId = `room-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomId(randId);
  };

  // Leave current meeting room and return cleanly to lobby
  const handleLeaveMeeting = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    handleStandUp();
    setHasEntered(false);
    setIsCursorFree(false);
    setViewMode('fpp');
    setIsMoviePlayerOpen(false);
    setIsWhiteboardOpen(false);
    setIsCustomizerOpen(false);
    setRemotePlayers({});

    // Keep URL parameter synced to chosen map
    const params = new URLSearchParams(window.location.search);
    params.set('map', mapType);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  // Select map in lobby and update URL query param
  const handleSelectLobbyMap = (chosenMap) => {
    setMapType(chosenMap);
    const params = new URLSearchParams(window.location.search);
    params.set('map', chosenMap);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  // Join Lobby Screen
  if (!hasEntered) {
    return (
      <div className="relative w-screen h-screen bg-slate-950 flex items-center justify-center font-sans overflow-hidden">
        {/* Subtle Ambient Color Spheres */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl p-7 shadow-2xl text-white">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2.5">
              Phase 2 • Real-Time 3D Virtual Workspace
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Virtual 3D Conference</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Join with teammates on the same Wi-Fi, hotspot, or local network.
            </p>
          </div>

          <form onSubmit={handleJoinMeeting} className="space-y-4">
            {/* Room ID Input & Generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Room Name or Unique ID
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomRoom}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline"
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  placeholder="e.g. design-sprint, movie-night"
                />
                <button
                  type="button"
                  onClick={handleCopyLobbyInvite}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Copy shareable room invite link"
                >
                  {copiedLobbyLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                placeholder="e.g. Sarah Jenkins"
              />
            </div>

            {/* Outfit Preset Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
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
                        ? 'bg-blue-950 border-2 border-blue-500 text-blue-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-slate-600 shrink-0"
                      style={{ backgroundColor: preset.suitColor }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Environment Map Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Select 3D Environment
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Executive Boardroom Option */}
                <button
                  type="button"
                  onClick={() => handleSelectLobbyMap('office')}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                    mapType === 'office'
                      ? 'bg-blue-950/80 border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className={`w-4 h-4 ${mapType === 'office' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="font-extrabold text-xs text-white">Executive Boardroom</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Meeting table, 8 swivel chairs, presentation TV & interactive whiteboard.
                  </p>
                </button>

                {/* Movie Theatre Option */}
                <button
                  type="button"
                  onClick={() => handleSelectLobbyMap('theatre')}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                    mapType === 'theatre'
                      ? 'bg-red-950/80 border-2 border-red-500 shadow-md ring-2 ring-red-500/20'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Film className={`w-4 h-4 ${mapType === 'theatre' ? 'text-red-400' : 'text-slate-400'}`} />
                    <span className="font-extrabold text-xs text-white">Movie Theatre</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Private cinema with elevated tiered velvet seats, cinema screen & media player.
                  </p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm shadow-xl transition-all transform active:scale-98 mt-2 ${
                mapType === 'theatre'
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              }`}
            >
              {mapType === 'theatre' ? 'Enter Movie Theatre' : 'Enter Executive Boardroom'}
            </button>
          </form>

          <div className="mt-4 pt-3.5 border-t border-slate-800 text-center text-xs font-medium text-slate-500">
            Share your invite link with others on your hotspot/Wi-Fi to join together!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-screen h-screen bg-slate-950 overflow-hidden font-sans ${
        !isCursorFree && viewMode === 'fpp' ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* 3D Scene Viewport */}
      <Canvas
        shadows
        camera={{ position: [0, 1.62, 5.0], fov: 60 }}
        className="w-full h-full"
      >
        <color attach="background" args={[mapType === 'theatre' ? '#07070a' : '#0b1329']} />

        {mapType === 'theatre' ? (
          <MovieTheatre
            videoRef={theatreVideoRef}
            videoUrl={theatrePlayback.videoUrl}
            isPlaying={theatrePlayback.isPlaying}
            currentTime={theatrePlayback.currentTime}
            onOpenPlayer={() => {
              setIsCursorFree(true);
              setIsMoviePlayerOpen(true);
            }}
            lightsOn={theatreLightsOn}
            onToggleLights={handleToggleTheatreLights}
            onSeatSelect={handleSeatSelect}
            currentSeatId={currentSeat?.id}
            occupiedSeatIds={occupiedSeatIds}
            hoveredSeatId={hoveredSeatId}
            isCursorFree={isCursorFree}
            screenStream={screenStream || screenPresenter?.stream}
          />
        ) : (
          <>
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
              hoveredSeatId={hoveredSeatId}
              occupiedSeatIds={occupiedSeatIds}
              whiteboardStrokes={whiteboardStrokes}
              whiteboardUser={whiteboardUser}
              currentSocketId={socket?.id}
              onOpenWhiteboard={handleOpenWhiteboard}
            />
          </>
        )}

        <ProjectileSystem
          ref={projectileSystemRef}
          activeProjectiles={activeProjectiles}
          onProjectileImpact={handleProjectileImpact}
          puddles={puddles}
          onRemovePuddle={handleRemovePuddle}
          isCursorFree={isCursorFree}
          viewMode={viewMode}
          isSitting={!!currentSeat}
          onHoverSeat={(id, occupied) => {
            setHoveredSeatId(id);
            setHoveredSeatOccupied(occupied);
          }}
        />

        <LocalPlayer
          ref={localPlayerRef}
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
          activeEmoji={localEmoji}
          mapType={mapType}
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

      {/* Center Reticle Crosshair in FPP Aim Mode (with dynamic Seat Hover Prompt) */}
      {viewMode === 'fpp' && !isCursorFree && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-50">
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-md transition-all ${
                  hoveredSeatId
                    ? hoveredSeatOccupied
                      ? 'bg-red-500 scale-125'
                      : 'bg-emerald-400 scale-125'
                    : 'bg-blue-600'
                }`}
              />
              <div
                className={`absolute rounded-full border transition-all ${
                  hoveredSeatId
                    ? 'w-8 h-8 border-cyan-400 animate-ping'
                    : 'w-6 h-6 border-blue-500/80'
                }`}
              />
              <div className="absolute w-9 h-9 rounded-full border border-white/60" />
            </div>

            {/* Hover seat visual prompt */}
            {hoveredSeatId && (
              <div className="absolute top-7 flex items-center gap-1.5 text-xs font-extrabold shadow-2xl backdrop-blur-md animate-fadeIn whitespace-nowrap">
                {hoveredSeatOccupied ? (
                  <span className="bg-red-600/95 text-white px-3 py-1 rounded-full border border-red-400 shadow">
                    Seat Occupied ({occupiedSeatIds[hoveredSeatId] || 'Participant'})
                  </span>
                ) : (
                  <span className="bg-blue-600/95 text-white px-3 py-1 rounded-full border border-blue-400 shadow animate-pulse">
                    Click to Sit
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating HUD & Conference Controls */}
      <MeetingHUD
        roomId={roomId}
        mapType={mapType}
        onSwitchMap={handleSwitchMap}
        participantCount={Object.keys(remotePlayers).length + 1}
        userName={userName}
        currentSocketId={socket?.id}
        isSitting={!!currentSeat}
        currentSeatName={currentSeat?.label}
        onToggleSit={() => {
          if (currentSeat) {
            handleStandUp();
          } else {
            handleSeatSelect(currentMapSeats[0]);
          }
        }}
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
          if (mode === 'presentation') {
            setIsCursorFree(true);
          }
        }}
        onOpenCustomizer={() => {
          setIsCursorFree(true);
          setIsCustomizerOpen(true);
        }}
        onReaction={handleReaction}
        onLeaveMeeting={handleLeaveMeeting}
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
        onThrowProjectile={handleThrowProjectile}
        onSendEmoji={handleSendEmoji}
        hoveredSeatInfo={
          hoveredSeatId
            ? {
                seatId: hoveredSeatId,
                isOccupied: hoveredSeatOccupied,
                occupantName: occupiedSeatIds[hoveredSeatId]
              }
            : null
        }
        whiteboardUser={whiteboardUser}
        onOpenWhiteboard={handleOpenWhiteboard}
        theatreLightsOn={theatreLightsOn}
        onToggleTheatreLights={handleToggleTheatreLights}
        onOpenMoviePlayer={() => {
          setIsCursorFree(true);
          setIsMoviePlayerOpen(true);
        }}
        isModalOpen={isMoviePlayerOpen || isWhiteboardOpen || isCustomizerOpen}
      />

      {/* Fullscreen Hit Splatter Overlay (Tomato, Egg, Water Balloon) */}
      <SplatterOverlay splatterData={splatterData} />

      {/* Avatar Customization Modal */}
      <AvatarCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        currentConfig={avatarConfig}
        onChange={handleAvatarChange}
      />

      {/* Collaborative Interactive Whiteboard Studio Modal (Office Map) */}
      {mapType === 'office' && (
        <WhiteboardModal
          isOpen={isWhiteboardOpen}
          onClose={handleCloseWhiteboard}
          onDraw={handleWhiteboardDraw}
          strokes={whiteboardStrokes}
        />
      )}

      {/* Synchronized Watch-Together Movie Player Panel (Movie Theatre Map) */}
      <MoviePlayerModal
        isOpen={isMoviePlayerOpen}
        onClose={() => setIsMoviePlayerOpen(false)}
        playbackState={theatrePlayback}
        onControl={handleTheatreVideoControl}
        videoElement={theatreVideoRef.current}
        isCinemaView={viewMode === 'presentation'}
        onToggleCinemaView={() => setViewMode(viewMode === 'presentation' ? 'fpp' : 'presentation')}
        isScreenSharing={isScreenSharing}
        screenPresenter={screenPresenter}
        onToggleScreenShare={toggleScreenShare}
        currentSocketId={socket?.id}
      />
    </div>
  );
}
