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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory room state: roomId -> Map(socketId => participantData)
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Join a specific room with unique roomId
  socket.on('join-room', ({ roomId, user }) => {
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

    // Send the current list of participants in this room to newly joined player
    const participantsList = Array.from(room.values());
    socket.emit('room-users', {
      roomId: activeRoomId,
      users: participantsList
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

  // Chair sit/stand action
  socket.on('player-sit', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.get(socket.id);
    if (user) {
      user.state = data.isSitting ? 'sitting' : 'idle';
      user.seatId = data.seatId || null;
      if (data.position) user.position = data.position;
      if (data.rotation !== undefined) user.rotation = data.rotation;

      io.in(roomId).emit('player-sat', {
        id: socket.id,
        isSitting: data.isSitting,
        seatId: data.seatId,
        position: user.position,
        rotation: user.rotation
      });
    }
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
    socket.to(target).emit('webrtc-offer', {
      caller: socket.id,
      sdp,
      type
    });
  });

  // WebRTC Signaling: Answer
  socket.on('webrtc-answer', ({ target, sdp, type = 'media' }) => {
    socket.to(target).emit('webrtc-answer', {
      responder: socket.id,
      sdp,
      type
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('webrtc-ice-candidate', ({ target, candidate, type = 'media' }) => {
    socket.to(target).emit('webrtc-ice-candidate', {
      sender: socket.id,
      candidate,
      type
    });
  });

  // Presentation TV: Screen Sharing broadcast
  socket.on('screen-share-started', (data) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('screen-share-started', {
        presenterId: socket.id,
        presenterName: data?.presenterName || 'Presenter'
      });
    }
  });

  socket.on('screen-share-stopped', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.in(roomId).emit('screen-share-stopped', {
        presenterId: socket.id
      });
    }
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
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
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
