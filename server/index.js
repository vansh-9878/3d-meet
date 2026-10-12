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
// Active screen presenter per room: roomId -> { presenterId, presenterName }
const roomScreenPresenters = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Join a specific room with unique roomId
  socket.on('join-room', async ({ roomId, user }) => {
    // Sanitize room ID
    const activeRoomId = (roomId && roomId.trim()) ? roomId.trim().toLowerCase() : 'main-office';
    socket.join(activeRoomId);

    if (!rooms.has(activeRoomId)) {
      rooms.set(activeRoomId, new Map());
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

    // Send the current list of participants + active ICE servers + active screen presenter to newly joined player
    const participantsList = Array.from(room.values());
    const iceServers = await getIceServers();
    const activeScreenPresenter = roomScreenPresenters.get(activeRoomId) || null;

    socket.emit('room-users', {
      roomId: activeRoomId,
      users: participantsList,
      iceServers,
      screenPresenter: activeScreenPresenter
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

      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
        roomScreenPresenters.delete(roomId);
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
