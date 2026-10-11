import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useWebRTC handles:
 * 1. User media (Camera & Microphone) capture
 * 2. Screen sharing capture
 * 3. Peer-to-peer WebRTC mesh connections (RTCPeerConnection)
 * 4. Pre-allocated transceivers with replaceTrack for instant, collision-free media streaming
 * 5. ICE candidate negotiation & offer/answer signaling via Socket.IO
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.nextcloud.com:443' }
  ]
};

// Optionally inject user-provided TURN server if defined in environment
if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_URL) {
  RTC_CONFIG.iceServers.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME || '',
    credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
  });
}

export function useWebRTC(socket, roomId, userName) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isCamActive, setIsCamActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenPresenter, setScreenPresenter] = useState(null);

  // remoteStreams: { [peerId]: MediaStream }
  const [remoteStreams, setRemoteStreams] = useState({});
  // peerMediaStates: { [peerId]: { isCamActive: boolean, isMicActive: boolean, camZoom?: number } }
  const [peerMediaStates, setPeerMediaStates] = useState({});

  const peerConnections = useRef({}); // peerId -> RTCPeerConnection (camera/mic)
  const screenPeerConnections = useRef({}); // peerId -> RTCPeerConnection (screen share)
  const iceCandidateQueues = useRef({}); // peerId -> Array of candidate objects
  const screenIceCandidateQueues = useRef({}); // peerId -> Array of candidate objects
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isCamActiveRef = useRef(false);
  const isMicActiveRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const makingOffer = useRef({}); // peerId -> boolean

  // Helper to create WebRTC Peer Connection for user camera/mic
  const createPeerConnection = useCallback((peerId) => {
    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }

    console.log(`[WebRTC] Initializing PeerConnection for ${peerId}`);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current[peerId] = pc;

    // Attach active local tracks or pre-allocate transceivers
    const currentAudioTrack = localStreamRef.current?.getAudioTracks()[0] || null;
    const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0] || null;

    try {
      pc.addTransceiver(currentAudioTrack || 'audio', { direction: 'sendrecv' });
      pc.addTransceiver(currentVideoTrack || 'video', { direction: 'sendrecv' });
    } catch (e) {
      console.warn(`[WebRTC] Transceiver pre-allocation warning for ${peerId}:`, e);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
    }

    // Handle receiving remote audio/video tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track (${event.track.kind}) from ${peerId}`);
      const incomingStream = event.streams[0] || new MediaStream([event.track]);

      const updateStream = () => {
        setRemoteStreams(prev => {
          const current = prev[peerId] || new MediaStream();
          incomingStream.getTracks().forEach(t => {
            if (!current.getTracks().some(ct => ct.id === t.id)) {
              current.addTrack(t);
            }
          });
          return {
            ...prev,
            [peerId]: new MediaStream(current.getTracks())
          };
        });
      };

      updateStream();
      event.track.onunmute = () => {
        console.log(`[WebRTC] Remote track unmuted (${event.track.kind}) from ${peerId}`);
        updateStream();
      };
      event.track.onended = () => {
        console.log(`[WebRTC] Remote track ended (${event.track.kind}) from ${peerId}`);
        setRemoteStreams(prev => {
          if (!prev[peerId]) return prev;
          const remaining = prev[peerId].getTracks().filter(t => t.id !== event.track.id);
          return {
            ...prev,
            [peerId]: new MediaStream(remaining)
          };
        });
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc-ice-candidate', {
          target: peerId,
          candidate: event.candidate,
          type: 'media'
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE Connection State (${peerId}): ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        console.warn(`[WebRTC] ICE failed with ${peerId}, attempting ICE restart`);
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection State (${peerId}): ${pc.connectionState}`);
    };

    return pc;
  }, [socket]);

  // Helper to safely send offer to peer
  const sendOfferToPeer = useCallback(async (peerId, pc) => {
    try {
      if (!pc || pc.signalingState !== 'stable') {
        return;
      }
      makingOffer.current[peerId] = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`[WebRTC] Sent media offer to ${peerId}`);

      socket?.emit('webrtc-offer', {
        target: peerId,
        sdp: pc.localDescription,
        type: 'media'
      });
    } catch (err) {
      console.warn(`[WebRTC] Error sending offer to ${peerId}:`, err);
    } finally {
      makingOffer.current[peerId] = false;
    }
  }, [socket]);

  // Helper to initiate connection to a newly discovered peer
  const initiateConnection = useCallback(async (peerId) => {
    const pc = createPeerConnection(peerId);
    await sendOfferToPeer(peerId, pc);
  }, [createPeerConnection, sendOfferToPeer]);

  // 1. Toggle Local Camera
  const toggleCamera = useCallback(async () => {
    try {
      if (isCamActive) {
        // Stop hardware camera capture
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
            localStreamRef.current.removeTrack(track);
          });
        }

        setIsCamActive(false);
        isCamActiveRef.current = false;
        socket?.emit('media-state-changed', { isCamActive: false });

        // Instantly stop transmitting video across all peers via replaceTrack(null)
        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          try {
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.kind === 'video')
              || pc.getTransceivers().find(t => t.receiver?.track?.kind === 'video')?.sender;
            if (videoSender) {
              await videoSender.replaceTrack(null);
            }
          } catch (e) {
            console.warn(`[WebRTC] Error clearing video track on ${peerId}:`, e);
          }
        }

        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
          setLocalStream(new MediaStream(localStreamRef.current.getAudioTracks()));
        } else {
          localStreamRef.current = null;
          setLocalStream(null);
        }
      } else {
        // Request Camera Access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 640 }, frameRate: { ideal: 30 } },
          audio: false
        });

        const newVideoTrack = stream.getVideoTracks()[0];
        if (!newVideoTrack) {
          throw new Error('No video track available');
        }

        newVideoTrack.onended = () => {
          setIsCamActive(false);
          isCamActiveRef.current = false;
          socket?.emit('media-state-changed', { isCamActive: false });
        };

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        // Clean out any stale video tracks
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });

        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsCamActive(true);
        isCamActiveRef.current = true;
        socket?.emit('media-state-changed', { isCamActive: true });

        // Stream video immediately across all existing peer connections
        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          try {
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.kind === 'video')
              || pc.getTransceivers().find(t => t.receiver?.track?.kind === 'video')?.sender;
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
              console.log(`[WebRTC] Replaced video track with active camera on peer ${peerId}`);
            } else {
              pc.addTrack(newVideoTrack, localStreamRef.current);
              await sendOfferToPeer(peerId, pc);
            }
          } catch (e) {
            console.warn(`[WebRTC] Error attaching video track to ${peerId}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Camera access failed:', err);
      alert('Camera access was not granted or no webcam device was found.');
    }
  }, [isCamActive, socket, sendOfferToPeer]);

  // 2. Toggle Local Microphone
  const toggleMic = useCallback(async () => {
    try {
      if (isMicActive) {
        // Mute Microphone
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => {
            t.enabled = false;
            t.stop();
            localStreamRef.current.removeTrack(t);
          });
        }

        setIsMicActive(false);
        isMicActiveRef.current = false;
        socket?.emit('player-speaking', false);
        socket?.emit('media-state-changed', { isMicActive: false });

        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          try {
            const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio' || s.kind === 'audio')
              || pc.getTransceivers().find(t => t.receiver?.track?.kind === 'audio')?.sender;
            if (audioSender) {
              await audioSender.replaceTrack(null);
            }
          } catch (e) {
            console.warn(`[WebRTC] Error clearing audio track on ${peerId}:`, e);
          }
        }

        if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
          setLocalStream(new MediaStream(localStreamRef.current.getVideoTracks()));
        } else {
          localStreamRef.current = null;
          setLocalStream(null);
        }
      } else {
        // Request Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });

        const newAudioTrack = stream.getAudioTracks()[0];
        if (!newAudioTrack) {
          throw new Error('No audio track available');
        }

        newAudioTrack.onended = () => {
          setIsMicActive(false);
          isMicActiveRef.current = false;
          socket?.emit('player-speaking', false);
          socket?.emit('media-state-changed', { isMicActive: false });
        };

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        localStreamRef.current.getAudioTracks().forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });

        localStreamRef.current.addTrack(newAudioTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsMicActive(true);
        isMicActiveRef.current = true;
        socket?.emit('player-speaking', true);
        socket?.emit('media-state-changed', { isMicActive: true });

        // Stream audio immediately across all existing peer connections
        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          try {
            const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio' || s.kind === 'audio')
              || pc.getTransceivers().find(t => t.receiver?.track?.kind === 'audio')?.sender;
            if (audioSender) {
              await audioSender.replaceTrack(newAudioTrack);
              console.log(`[WebRTC] Replaced audio track with active mic on peer ${peerId}`);
            } else {
              pc.addTrack(newAudioTrack, localStreamRef.current);
              await sendOfferToPeer(peerId, pc);
            }
          } catch (e) {
            console.warn(`[WebRTC] Error attaching audio track to ${peerId}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Microphone access failed:', err);
      alert('Microphone access was not granted or no microphone device was found.');
    }
  }, [isMicActive, socket, sendOfferToPeer]);

  // 3. Screen Sharing (Cast to Conference TV Wall)
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      isScreenSharingRef.current = false;
      setScreenStream(null);
      setScreenPresenter(null);
      socket?.emit('screen-share-stopped');

      for (const [peerId, spc] of Object.entries(screenPeerConnections.current)) {
        try { spc.close(); } catch (_) {}
      }
      screenPeerConnections.current = {};
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', frameRate: { ideal: 30 } },
          audio: true
        });

        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);
        isScreenSharingRef.current = true;
        setScreenPresenter({
          presenterId: socket?.id,
          presenterName: `${userName} (You)`,
          stream
        });

        socket?.emit('screen-share-started', { presenterName: userName });

        stream.getVideoTracks()[0].onended = () => {
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }
          setIsScreenSharing(false);
          isScreenSharingRef.current = false;
          setScreenStream(null);
          setScreenPresenter(null);
          socket?.emit('screen-share-stopped');

          for (const [peerId, spc] of Object.entries(screenPeerConnections.current)) {
            try { spc.close(); } catch (_) {}
          }
          screenPeerConnections.current = {};
        };

        // Broadcast screen tracks to all connected peers
        for (const peerId of Object.keys(peerConnections.current)) {
          try {
            if (screenPeerConnections.current[peerId]) {
              screenPeerConnections.current[peerId].close();
            }
            const screenPC = new RTCPeerConnection(RTC_CONFIG);
            screenPeerConnections.current[peerId] = screenPC;

            stream.getTracks().forEach(t => screenPC.addTrack(t, stream));

            screenPC.onicecandidate = (event) => {
              if (event.candidate) {
                socket?.emit('webrtc-ice-candidate', {
                  target: peerId,
                  candidate: event.candidate,
                  type: 'screen'
                });
              }
            };

            const offer = await screenPC.createOffer();
            await screenPC.setLocalDescription(offer);
            socket?.emit('webrtc-offer', {
              target: peerId,
              sdp: screenPC.localDescription,
              type: 'screen'
            });
          } catch (e) {
            console.error('[WebRTC] Error negotiating screen share with peer:', peerId, e);
          }
        }
      } catch (err) {
        console.warn('[WebRTC] Screen share canceled or denied:', err);
      }
    }
  }, [isScreenSharing, socket, userName]);

  // 4. Socket.IO Signaling Listeners
  useEffect(() => {
    if (!socket) return;

    // Room participants list when this user joins
    const handleRoomUsers = ({ users }) => {
      const states = {};
      users.forEach(u => {
        if (u.id !== socket.id) {
          if (u.mediaState) {
            states[u.id] = u.mediaState;
          }
          createPeerConnection(u.id);
        }
      });
      setPeerMediaStates(prev => ({ ...prev, ...states }));
    };

    // Another teammate joined the room -> initiate connection to them
    const handleUserJoined = (userData) => {
      if (userData.mediaState) {
        setPeerMediaStates(prev => ({
          ...prev,
          [userData.id]: userData.mediaState
        }));
      }
      initiateConnection(userData.id);

      // If this user is actively screen sharing, negotiate screen feed to new peer
      if (isScreenSharingRef.current && screenStreamRef.current) {
        try {
          const screenPC = new RTCPeerConnection(RTC_CONFIG);
          screenPeerConnections.current[userData.id] = screenPC;

          screenStreamRef.current.getTracks().forEach(t => screenPC.addTrack(t, screenStreamRef.current));

          screenPC.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('webrtc-ice-candidate', {
                target: userData.id,
                candidate: event.candidate,
                type: 'screen'
              });
            }
          };

          screenPC.createOffer()
            .then(offer => screenPC.setLocalDescription(offer))
            .then(() => {
              socket.emit('webrtc-offer', {
                target: userData.id,
                sdp: screenPC.localDescription,
                type: 'screen'
              });
            })
            .catch(e => console.warn('Error offering screen share to newly joined user:', e));
        } catch (e) {
          console.warn('Error establishing screen share with newly joined user:', e);
        }
      }
    };

    // Received WebRTC Offer
    const handleOffer = async ({ caller, sdp, type }) => {
      try {
        console.log(`[WebRTC] Received offer from ${caller} (${type})`);
        if (type === 'screen') {
          if (screenPeerConnections.current[caller]) {
            screenPeerConnections.current[caller].close();
          }
          const screenPC = new RTCPeerConnection(RTC_CONFIG);
          screenPeerConnections.current[caller] = screenPC;

          screenPC.ontrack = (event) => {
            console.log(`[WebRTC Screen] ontrack received from presenter ${caller}`);
            const incoming = event.streams[0] || new MediaStream([event.track]);
            setScreenPresenter(prev => ({
              presenterId: caller,
              presenterName: prev?.presenterName || 'Presenter',
              stream: incoming
            }));
          };

          screenPC.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('webrtc-ice-candidate', {
                target: caller,
                candidate: event.candidate,
                type: 'screen'
              });
            }
          };

          await screenPC.setRemoteDescription(new RTCSessionDescription(sdp));

          if (screenIceCandidateQueues.current[caller]) {
            for (const cand of screenIceCandidateQueues.current[caller]) {
              await screenPC.addIceCandidate(cand).catch(() => {});
            }
            screenIceCandidateQueues.current[caller] = [];
          }

          const answer = await screenPC.createAnswer();
          await screenPC.setLocalDescription(answer);

          socket.emit('webrtc-answer', {
            target: caller,
            sdp: screenPC.localDescription,
            type: 'screen'
          });
        } else {
          const pc = createPeerConnection(caller);

          // Handle offer collision (glare)
          const isCollision = makingOffer.current[caller] || pc.signalingState !== 'stable';
          if (isCollision) {
            console.warn(`[WebRTC] Collision detected with ${caller}, signalingState=${pc.signalingState}`);
            if (pc.signalingState !== 'stable') {
              await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          if (iceCandidateQueues.current[caller]) {
            for (const cand of iceCandidateQueues.current[caller]) {
              await pc.addIceCandidate(cand).catch(() => {});
            }
            iceCandidateQueues.current[caller] = [];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc-answer', {
            target: caller,
            sdp: pc.localDescription,
            type: 'media'
          });
        }
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    // Received WebRTC Answer
    const handleAnswer = async ({ responder, sdp, type }) => {
      try {
        console.log(`[WebRTC] Received answer from ${responder} (${type})`);
        const pc = type === 'screen'
          ? screenPeerConnections.current[responder]
          : peerConnections.current[responder];

        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          const queue = type === 'screen'
            ? screenIceCandidateQueues.current[responder]
            : iceCandidateQueues.current[responder];

          if (queue) {
            for (const cand of queue) {
              await pc.addIceCandidate(cand).catch(() => {});
            }
            if (type === 'screen') screenIceCandidateQueues.current[responder] = [];
            else iceCandidateQueues.current[responder] = [];
          }
        }
      } catch (err) {
        console.error('[WebRTC] Error setting remote description for answer:', err);
      }
    };

    // Received ICE Candidate
    const handleIceCandidate = async ({ sender, candidate, type }) => {
      try {
        const pc = type === 'screen'
          ? screenPeerConnections.current[sender]
          : peerConnections.current[sender];

        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(candidate).catch(() => {});
        } else {
          const queues = type === 'screen' ? screenIceCandidateQueues.current : iceCandidateQueues.current;
          if (!queues[sender]) queues[sender] = [];
          queues[sender].push(candidate);
        }
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    };

    // Peer media state updated (camera on/off)
    const handlePeerMediaStateChanged = ({ id, mediaState }) => {
      setPeerMediaStates(prev => ({
        ...prev,
        [id]: mediaState
      }));
    };

    // Screen Share started / stopped notifications
    const handleScreenShareStarted = ({ presenterId, presenterName }) => {
      setScreenPresenter({
        presenterId,
        presenterName,
        stream: null
      });
    };

    const handleScreenShareStopped = () => {
      setScreenPresenter(null);
    };

    // Remote participant left room
    const handleUserLeft = (socketId) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      if (screenPeerConnections.current[socketId]) {
        screenPeerConnections.current[socketId].close();
        delete screenPeerConnections.current[socketId];
      }
      delete iceCandidateQueues.current[socketId];
      delete screenIceCandidateQueues.current[socketId];

      setRemoteStreams(prev => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      setPeerMediaStates(prev => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      setScreenPresenter(prev => (prev?.presenterId === socketId ? null : prev));
    };

    socket.on('room-users', handleRoomUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    socket.on('player-media-state-changed', handlePeerMediaStateChanged);
    socket.on('screen-share-started', handleScreenShareStarted);
    socket.on('screen-share-stopped', handleScreenShareStopped);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('room-users', handleRoomUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('player-media-state-changed', handlePeerMediaStateChanged);
      socket.off('screen-share-started', handleScreenShareStarted);
      socket.off('screen-share-stopped', handleScreenShareStopped);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, createPeerConnection, initiateConnection]);

  return {
    localStream,
    screenStream,
    remoteStreams,
    peerMediaStates,
    isCamActive,
    isMicActive,
    isScreenSharing,
    screenPresenter,
    toggleCamera,
    toggleMic,
    toggleScreenShare
  };
}
