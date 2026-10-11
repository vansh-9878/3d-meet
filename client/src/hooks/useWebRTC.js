import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useWebRTC handles:
 * 1. User media (Camera & Microphone) capture
 * 2. Screen sharing capture
 * 3. Peer-to-peer WebRTC connections (RTCPeerConnection) with mesh architecture
 * 4. ICE candidate negotiation & offer/answer signaling via Socket.IO
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
    // Open Relay Project public TURN servers for NAT / symmetric firewall traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

export function useWebRTC(socket, roomId, userName) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isCamActive, setIsCamActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenPresenter, setScreenPresenter] = useState(null);

  // remoteStreams: { [peerId]: MediaStream }
  const [remoteStreams, setRemoteStreams] = useState({});
  // peerMediaStates: { [peerId]: { isCamActive: boolean, isMicActive: boolean } }
  const [peerMediaStates, setPeerMediaStates] = useState({});

  const peerConnections = useRef({}); // peerId -> RTCPeerConnection (for camera/mic)
  const screenPeerConnections = useRef({}); // peerId -> RTCPeerConnection (for screen share)
  const iceCandidateQueues = useRef({}); // peerId -> Array of RTCIceCandidateInit
  const screenIceCandidateQueues = useRef({}); // peerId -> Array of RTCIceCandidateInit
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Helper to create WebRTC Peer Connection for user camera/mic
  const createPeerConnection = useCallback((peerId) => {
    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current[peerId] = pc;

    // Attach all local tracks currently active
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle receiving remote audio/video tracks
    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      
      const updateStream = () => {
        setRemoteStreams(prev => {
          const existing = prev[peerId] || new MediaStream();
          incomingStream.getTracks().forEach(t => {
            if (!existing.getTracks().some(et => et.id === t.id)) {
              existing.addTrack(t);
            }
          });
          return {
            ...prev,
            [peerId]: new MediaStream(existing.getTracks())
          };
        });
      };

      updateStream();
      event.track.onunmute = updateStream;
      event.track.onended = () => {
        setRemoteStreams(prev => {
          if (!prev[peerId]) return prev;
          const remainingTracks = prev[peerId].getTracks().filter(t => t.id !== event.track.id);
          return {
            ...prev,
            [peerId]: new MediaStream(remainingTracks)
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

    return pc;
  }, [socket]);

  // Helper to safely renegotiate or send offer to peer
  const sendOfferToPeer = useCallback(async (peerId, pc) => {
    try {
      if (!pc || pc.signalingState !== 'stable') {
        return;
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      socket?.emit('webrtc-offer', {
        target: peerId,
        sdp: pc.localDescription,
        type: 'media'
      });
    } catch (err) {
      console.warn('[WebRTC] Error sending offer to peer:', peerId, err);
    }
  }, [socket]);

  // Helper to initiate connection to peer
  const initiateConnection = useCallback(async (peerId) => {
    const pc = createPeerConnection(peerId);
    await sendOfferToPeer(peerId, pc);
  }, [createPeerConnection, sendOfferToPeer]);

  // 1. Toggle Local Camera
  const toggleCamera = useCallback(async () => {
    try {
      if (isCamActive) {
        // Stop hardware video tracks immediately
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
            localStreamRef.current.removeTrack(track);
          });
        }

        // Inform all WebRTC peer connections that video is stopped
        Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
          try {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(null);
            }
          } catch (e) {
            console.warn('[WebRTC] Error clearing video track on peer:', e);
          }
        });

        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
          setLocalStream(new MediaStream(localStreamRef.current.getAudioTracks()));
        } else {
          localStreamRef.current = null;
          setLocalStream(null);
        }

        setIsCamActive(false);
        socket?.emit('media-state-changed', { isCamActive: false });
      } else {
        // Turn Camera ON
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
          socket?.emit('media-state-changed', { isCamActive: false });
        };

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        // Remove any old video tracks if present
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });

        localStreamRef.current.addTrack(newVideoTrack);

        // Replace or add track across all existing peer connections
        Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
          try {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newVideoTrack);
            } else {
              pc.addTrack(newVideoTrack, localStreamRef.current);
              await sendOfferToPeer(peerId, pc);
            }
          } catch (e) {
            console.warn('[WebRTC] Error attaching video track to peer connection:', peerId, e);
          }
        });

        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsCamActive(true);
        socket?.emit('media-state-changed', { isCamActive: true });
      }
    } catch (err) {
      console.warn('[WebRTC] Could not access camera:', err);
      alert('Camera access was not granted or no webcam device was found.');
    }
  }, [isCamActive, socket, sendOfferToPeer]);

  // 2. Toggle Local Microphone
  const toggleMic = useCallback(async () => {
    try {
      if (isMicActive) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => {
            t.enabled = false;
          });
        }
        setIsMicActive(false);
        socket?.emit('player-speaking', false);
        socket?.emit('media-state-changed', { isMicActive: false });
      } else {
        let audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (!audioTrack) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false
          });
          audioTrack = stream.getAudioTracks()[0];
          if (!localStreamRef.current) {
            localStreamRef.current = new MediaStream();
          }
          if (audioTrack) {
            localStreamRef.current.addTrack(audioTrack);
          }

          Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
            if (audioTrack) {
              const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
              if (sender) {
                await sender.replaceTrack(audioTrack);
              } else {
                pc.addTrack(audioTrack, localStreamRef.current);
                await sendOfferToPeer(peerId, pc);
              }
            }
          });
        } else {
          audioTrack.enabled = true;
        }

        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsMicActive(true);
        socket?.emit('player-speaking', true);
        socket?.emit('media-state-changed', { isMicActive: true });
      }
    } catch (err) {
      console.warn('[WebRTC] Could not access microphone:', err);
      alert('Microphone access was not granted or no microphone device was found.');
    }
  }, [isMicActive, socket, sendOfferToPeer]);

  // 3. Screen Sharing (Cast to Presentation TV)
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      setScreenStream(null);
      setScreenPresenter(null);
      socket?.emit('screen-share-stopped');
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', frameRate: { ideal: 30 } },
          audio: false
        });

        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);
        setScreenPresenter({
          presenterId: socket?.id,
          presenterName: `${userName} (You)`,
          stream
        });

        socket?.emit('screen-share-started', { presenterName: userName });

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          setScreenPresenter(null);
          socket?.emit('screen-share-stopped');
        };

        // Broadcast screen tracks to all connected peers
        Object.entries(peerConnections.current).forEach(async ([peerId, pc]) => {
          try {
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
        });
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
    };

    // Received WebRTC Offer
    const handleOffer = async ({ caller, sdp, type }) => {
      try {
        if (type === 'screen') {
          const screenPC = new RTCPeerConnection(RTC_CONFIG);
          screenPeerConnections.current[caller] = screenPC;

          screenPC.ontrack = (event) => {
            const incoming = event.streams[0] || new MediaStream([event.track]);
            const setStream = () => {
              setScreenPresenter(prev => ({
                presenterId: caller,
                presenterName: prev?.presenterName || 'Presenter',
                stream: incoming
              }));
            };
            setStream();
            event.track.onunmute = setStream;
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

          // Process queued ICE candidates for screen share
          if (screenIceCandidateQueues.current[caller]) {
            for (const cand of screenIceCandidateQueues.current[caller]) {
              await screenPC.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
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
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Process queued ICE candidates for media
          if (iceCandidateQueues.current[caller]) {
            for (const cand of iceCandidateQueues.current[caller]) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
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
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
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
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
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
