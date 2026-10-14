const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Root health check endpoint for Render / monitoring
app.get('/', (req, res) => {
  res.send('Virtual Office Backend is running!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Room list endpoint
app.get('/api/rooms', (req, res) => {
  const roomSummaries = [];
  rooms.forEach((participants, roomId) => {
    roomSummaries.push({
      roomId,
      participantCount: participants.size
    });
  });
  res.json({ rooms: roomSummaries });
});

let cachedIceServers = null;
let lastIceFetchTime = 0;

async function getIceServers() {
  const now = Date.now();
  if (cachedIceServers && (now - lastIceFetchTime < 10 * 60 * 1000)) {
    return cachedIceServers;
  }

  const defaultIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.nextcloud.com:443' }
  ];

  const meteredApiKey = process.env.METERED_API_KEY || process.env.VITE_METERED_API_KEY;
  const meteredAppName = process.env.METERED_APP_NAME || process.env.VITE_METERED_APP_NAME;

  // Case 1: Metered App Name + API Key
  if (meteredApiKey && meteredAppName) {
    try {
      const url = `https://${meteredAppName}.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const iceServers = await response.json();
        console.log('[Server] Successfully fetched Metered TURN servers via API:', iceServers.length);
        cachedIceServers = iceServers;
        lastIceFetchTime = now;
        return iceServers;
      } else {
        console.warn(`[Server] Metered API returned ${response.status} for app "${meteredAppName}"`);
      }
    } catch (err) {
      console.warn('[Server] Error fetching Metered TURN credentials:', err.message);
    }
  }

  // Case 2: Static TURN credentials from Metered dashboard
  const turnUsername = process.env.TURN_USERNAME || process.env.METERED_USERNAME || process.env.VITE_TURN_USERNAME;
  const turnPassword = process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || process.env.METERED_CREDENTIAL || process.env.METERED_PASSWORD || process.env.VITE_TURN_CREDENTIAL;

  if (turnUsername && turnPassword) {
    const turnServers = [
      ...defaultIceServers,
      {
        urls: [
          'turn:global.relay.metered.ca:80',
          'turn:global.relay.metered.ca:443',
          'turns:global.relay.metered.ca:443?transport=tcp'
        ],
        username: turnUsername,
        credential: turnPassword
      }
    ];
    console.log('[Server] Loaded configured TURN credentials for global.relay.metered.ca');
    cachedIceServers = turnServers;
    lastIceFetchTime = now;
    return turnServers;
  }

  // Case 3: Custom TURN URL
  const customTurnUrl = process.env.TURN_URL || process.env.VITE_TURN_URL;
  if (customTurnUrl) {
    defaultIceServers.push({
      urls: customTurnUrl,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || ''
    });
  }

  cachedIceServers = defaultIceServers;
  lastIceFetchTime = now;
  return defaultIceServers;
}

// Provide dynamic ICE servers (STUN + optional TURN) to connecting clients
app.get('/api/ice-servers', async (req, res) => {
  const iceServers = await getIceServers();
  res.json({ iceServers });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory room state: roomId -> Map(socketId => participantData)
const rooms = new Map();
// Active map per room: roomId -> 'office' | 'theatre'
const roomMapTypes = new Map();
// Active screen presenter per room: roomId -> { presenterId, presenterName }
const roomScreenPresenters = new Map();
// Active whiteboard user per room: roomId -> { userId, userName } (Exclusivity: only 1 user at a time)
const roomWhiteboardUsers = new Map();
// Whiteboard stroke history per room: roomId -> Array of stroke objects
const roomWhiteboardStrokes = new Map();
// Movie Theatre lighting state: roomId -> { lightsOn: boolean }
const roomTheatreLighting = new Map();
// Movie Theatre synchronized video playback state:
// roomId -> { videoUrl: string, isPlaying: boolean, currentTime: number, lastUpdated: number, playbackRate: number, updatedBy: string }
const roomTheatrePlayback = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Join a specific room with unique roomId
  socket.on('join-room', async ({ roomId, mapType = 'office', user }) => {
    // Sanitize room ID
    const activeRoomId = (roomId && roomId.trim()) ? roomId.trim().toLowerCase() : 'main-office';
    socket.join(activeRoomId);

    if (!rooms.has(activeRoomId)) {
      rooms.set(activeRoomId, new Map());
      roomMapTypes.set(activeRoomId, mapType || 'office');
    }
    if (!roomTheatreLighting.has(activeRoomId)) {
      roomTheatreLighting.set(activeRoomId, { lightsOn: true });
    }
    if (!roomTheatrePlayback.has(activeRoomId)) {
      roomTheatrePlayback.set(activeRoomId, {
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        isPlaying: false,
        currentTime: 0,
        lastUpdated: Date.now(),
        playbackRate: 1,
        updatedBy: ''
      });
    }

    const room = rooms.get(activeRoomId);

    // Initial user character defaults
    const userData = {
      id: socket.id,
      name: user?.name || `Participant ${socket.id.slice(0, 4)}`,
      avatarConfig: user?.avatarConfig || {
        suitColor: '#1e3a8a',
        shirtColor: '#ffffff',
        tieColor: '#dc2626',
        pantsColor: '#172554',
        skinColor: '#fcd34d',
        hairColor: '#451a03',
      },
      position: user?.position || [0, 0, 5.0],
      rotation: user?.rotation !== undefined ? user.rotation : Math.PI,
      state: 'idle', // 'idle' | 'walking' | 'sitting'
      seatId: null,
      isSpeaking: false,
    };

    room.set(socket.id, userData);
    socket.data.roomId = activeRoomId;

    // Send current participants + ICE servers + active screen presenter + whiteboard state + theatre state
    const participantsList = Array.from(room.values());
    const iceServers = await getIceServers();
    const activeScreenPresenter = roomScreenPresenters.get(activeRoomId) || null;
    const activeWhiteboardUser = roomWhiteboardUsers.get(activeRoomId) || null;
    const whiteboardStrokes = roomWhiteboardStrokes.get(activeRoomId) || [];
    const activeMapType = roomMapTypes.get(activeRoomId) || 'office';
    const theatreLighting = roomTheatreLighting.get(activeRoomId) || { lightsOn: true };
    const rawPlayback = roomTheatrePlayback.get(activeRoomId) || {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
      playbackRate: 1,
      updatedBy: ''
    };
    let currentPlayback = { ...rawPlayback };
    if (currentPlayback.isPlaying && currentPlayback.lastUpdated) {
      const elapsed = (Date.now() - currentPlayback.lastUpdated) / 1000;
      currentPlayback.currentTime += elapsed * (currentPlayback.playbackRate || 1);
    }

    socket.emit('room-users', {
      roomId: activeRoomId,
      mapType: activeMapType,
      users: participantsList,
      iceServers,
      screenPresenter: activeScreenPresenter,
      whiteboardUser: activeWhiteboardUser,
      whiteboardStrokes,
      theatreLighting,
      theatrePlayback: currentPlayback
    });

    // Broadcast to other participants in this room that a new user joined
    socket.to(activeRoomId).emit('user-joined', userData);
    console.log(`[Join] User "${userData.name}" (${socket.id}) entered room "${activeRoomId}" (Total: ${room.size})`);
  });

  // Real-time position & rotation update
  socket.on('player-move', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    if (user) {
      user.position = data.position;
      user.rotation = data.rotation;
      user.state = data.state || 'walking';
      user.seatId = null;

      // Broadcast move event to everyone else in this room
      socket.to(roomId).emit('player-moved', {
        id: socket.id,
        position: data.position,
        rotation: data.rotation,
        state: data.state
      });
    }
  });

  // Chair sit/stand action (Exclusivity: no 2 people can sit on the same seat)
  socket.on('player-sit', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    if (!user) return;

    if (data.isSitting && data.seatId) {
      // Check if another participant is already sitting on this seat
      let occupiedByName = null;
      for (const [id, participant] of room.entries()) {
        if (id !== socket.id && participant.seatId === data.seatId) {
          occupiedByName = participant.name || 'Another participant';
          break;
        }
      }

      if (occupiedByName) {
        socket.emit('seat-error', {
          seatId: data.seatId,
          message: `Seat is already occupied by ${occupiedByName}!`
        });
        return;
      }

      user.state = 'sitting';
      user.seatId = data.seatId;
      if (data.position) user.position = data.position;
      if (data.rotation !== undefined) user.rotation = data.rotation;
    } else {
      user.state = 'idle';
      user.seatId = null;
    }

    io.in(roomId).emit('player-sat', {
      id: socket.id,
      isSitting: user.state === 'sitting',
      seatId: user.seatId,
      position: user.position,
      rotation: user.rotation
    });
  });

  // Avatar customization change
  socket.on('update-avatar', (avatarConfig) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    if (user) {
      user.avatarConfig = avatarConfig;
      socket.to(roomId).emit('avatar-updated', {
        id: socket.id,
        avatarConfig
      });
    }
  });

  // Speaking indicator toggle
  socket.on('player-speaking', (isSpeaking) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    if (user) {
      user.isSpeaking = !!isSpeaking;
      socket.to(roomId).emit('player-speaking-changed', {
        id: socket.id,
        isSpeaking: !!isSpeaking
      });
    }
  });

  // Media track / Camera / Mic status change
  socket.on('media-state-changed', (mediaState) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    if (user) {
      user.mediaState = { ...(user.mediaState || {}), ...mediaState };
      socket.to(roomId).emit('player-media-state-changed', {
        id: socket.id,
        mediaState: user.mediaState
      });
    }
  });

  // WebRTC Signaling: Offer
  socket.on('webrtc-offer', ({ target, sdp, type = 'media' }) => {
    if (!target) return;
    console.log(`[WebRTC Signaling] Offer from ${socket.id} -> ${target} (${type})`);
    io.to(target).emit('webrtc-offer', {
      caller: socket.id,
      sdp,
      type
    });
  });

  // WebRTC Signaling: Answer
  socket.on('webrtc-answer', ({ target, sdp, type = 'media' }) => {
    if (!target) return;
    console.log(`[WebRTC Signaling] Answer from ${socket.id} -> ${target} (${type})`);
    io.to(target).emit('webrtc-answer', {
      responder: socket.id,
      sdp,
      type
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('webrtc-ice-candidate', ({ target, candidate, type = 'media' }) => {
    if (!target || !candidate) return;
    io.to(target).emit('webrtc-ice-candidate', {
      sender: socket.id,
      candidate,
      type
    });
  });

  // Presentation TV: Screen Sharing broadcast (Exclusivity: only one person can share at a time)
  socket.on('screen-share-started', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const currentPresenter = roomScreenPresenters.get(roomId);
    if (currentPresenter && currentPresenter.presenterId !== socket.id) {
      socket.emit('screen-share-error', {
        message: `Screen share is already in use by ${currentPresenter.presenterName || 'another participant'}.`
      });
      return;
    }

    const presenterInfo = {
      presenterId: socket.id,
      presenterName: data?.presenterName || 'Presenter'
    };
    roomScreenPresenters.set(roomId, presenterInfo);

    socket.to(roomId).emit('screen-share-started', presenterInfo);
  });

  socket.on('screen-share-stopped', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      const currentPresenter = roomScreenPresenters.get(roomId);
      if (currentPresenter && currentPresenter.presenterId === socket.id) {
        roomScreenPresenters.delete(roomId);
      }
      io.in(roomId).emit('screen-share-stopped', {
        presenterId: socket.id
      });
    }
  });

  // Projectile Throwing System (Tomato, Egg, Water Balloon)
  socket.on('throw-projectile', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);

    const projectileData = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: data.type || 'tomato', // 'tomato' | 'egg' | 'water_balloon'
      origin: data.origin,
      target: data.target,
      hitType: data.hitType || 'environment', // 'player' | 'environment'
      hitPlayerId: data.hitPlayerId || null,
      hitPoint: data.hitPoint || data.target,
      hitNormal: data.hitNormal || [0, 1, 0],
      throwerId: socket.id,
      throwerName: user?.name || 'Someone'
    };

    io.in(roomId).emit('projectile-thrown', projectileData);

    // If thrown directly on a player, notify that specific player to trigger screen splatter effect
    if (data.hitType === 'player' && data.hitPlayerId) {
      io.to(data.hitPlayerId).emit('player-splattered', {
        type: data.type || 'tomato',
        throwerName: user?.name || 'Someone'
      });
    }
  });

  // 3D Avatar Emoji Bubble Broadcast
  socket.on('send-emoji', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    io.in(roomId).emit('player-emoji', {
      id: socket.id,
      emoji: data.emoji,
      timestamp: Date.now()
    });
  });

  // Collaborative Whiteboard: Claim drawing turn (Exclusivity: 1 person at a time)
  socket.on('whiteboard-claim', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    const current = roomWhiteboardUsers.get(roomId);

    if (current && current.userId !== socket.id) {
      socket.emit('whiteboard-error', {
        message: `Whiteboard is currently in use by ${current.userName || 'another participant'}. Only one person can draw at a time.`
      });
      return;
    }

    const info = { userId: socket.id, userName: user?.name || 'Participant' };
    roomWhiteboardUsers.set(roomId, info);
    io.in(roomId).emit('whiteboard-claimed', info);
  });

  // Collaborative Whiteboard: Release control
  socket.on('whiteboard-release', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      const current = roomWhiteboardUsers.get(roomId);
      if (current && current.userId === socket.id) {
        roomWhiteboardUsers.delete(roomId);
        io.in(roomId).emit('whiteboard-released');
      }
    }
  });

  // Collaborative Whiteboard: Broadcast real-time stroke data
  socket.on('whiteboard-draw', (strokeData) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const current = roomWhiteboardUsers.get(roomId);
    // Exclusivity: only the user who holds the whiteboard can draw
    if (current && current.userId !== socket.id) return;

    if (!roomWhiteboardStrokes.has(roomId)) {
      roomWhiteboardStrokes.set(roomId, []);
    }

    if (strokeData.isClear) {
      roomWhiteboardStrokes.set(roomId, []);
    } else {
      const strokes = roomWhiteboardStrokes.get(roomId);
      strokes.push(strokeData);
      if (strokes.length > 5000) strokes.shift();
    }

    socket.to(roomId).emit('whiteboard-draw', strokeData);
  });

  // Reaction / Emote broadcast
  socket.on('send-reaction', (reaction) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.in(roomId).emit('player-reaction', {
        id: socket.id,
        reaction
      });
    }
  });

  // Theatre Lighting Toggle
  socket.on('theatre-toggle-lights', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const current = roomTheatreLighting.get(roomId) || { lightsOn: true };
    const updated = { lightsOn: !current.lightsOn };
    roomTheatreLighting.set(roomId, updated);
    io.in(roomId).emit('theatre-lights-changed', updated);
  });

  // Theatre Video Watch-Together Synchronization
  socket.on('theatre-video-control', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    const user = room ? room.get(socket.id) : null;

    const current = roomTheatrePlayback.get(roomId) || {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
      playbackRate: 1,
      updatedBy: ''
    };

    const action = data.action; // 'play' | 'pause' | 'seek' | 'change-source'
    const newPlayback = {
      videoUrl: data.videoUrl !== undefined ? data.videoUrl : current.videoUrl,
      isPlaying: data.isPlaying !== undefined ? !!data.isPlaying : (action === 'play' ? true : action === 'pause' ? false : current.isPlaying),
      currentTime: typeof data.currentTime === 'number' ? Math.max(0, data.currentTime) : current.currentTime,
      lastUpdated: Date.now(),
      playbackRate: data.playbackRate || 1,
      updatedBy: user?.name || 'Participant'
    };

    roomTheatrePlayback.set(roomId, newPlayback);
    io.in(roomId).emit('theatre-playback-updated', {
      ...newPlayback,
      action
    });
  });

  // Change Map between 'office' and 'theatre'
  socket.on('change-map', ({ mapType }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !['office', 'theatre'].includes(mapType)) return;
    roomMapTypes.set(roomId, mapType);

    // Reset sitting states when changing maps
    const room = rooms.get(roomId);
    if (room) {
      for (const participant of room.values()) {
        participant.state = 'idle';
        participant.seatId = null;
      }
    }

    io.in(roomId).emit('map-changed', {
      mapType,
      changedBy: socket.id
    });
  });

  // Disconnect & Room cleanup
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const user = room.get(socket.id);

      // Clean up screen share if this socket was the active presenter
      const activePresenter = roomScreenPresenters.get(roomId);
      if (activePresenter && activePresenter.presenterId === socket.id) {
        roomScreenPresenters.delete(roomId);
        io.in(roomId).emit('screen-share-stopped', {
          presenterId: socket.id
        });
      }

      // Clean up whiteboard if this socket held the whiteboard
      const activeWbUser = roomWhiteboardUsers.get(roomId);
      if (activeWbUser && activeWbUser.userId === socket.id) {
        roomWhiteboardUsers.delete(roomId);
        io.in(roomId).emit('whiteboard-released');
      }

      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
        roomMapTypes.delete(roomId);
        roomScreenPresenters.delete(roomId);
        roomWhiteboardUsers.delete(roomId);
        roomWhiteboardStrokes.delete(roomId);
        roomTheatreLighting.delete(roomId);
        roomTheatrePlayback.delete(roomId);
      } else {
        io.in(roomId).emit('user-left', socket.id);
      }
      console.log(`[Leave] User "${user?.name || socket.id}" left room "${roomId}" (Remaining: ${room.size})`);
    }
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
// Listen on 0.0.0.0 so devices on Wi-Fi/Hotspot/LAN can connect directly
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Virtual Office coordination server listening on 0.0.0.0:${PORT}`);
});
