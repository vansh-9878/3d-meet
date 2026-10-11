import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterAvatar } from './CharacterAvatar';

/**
 * RemotePlayer renders other connected teammates inside the 3D room.
 * Uses smooth linear interpolation (lerp) for positions and slerp/angle lerp for rotations
 * to ensure silky smooth movement even over normal network jitter.
 */
export function RemotePlayer({ player, videoStream = null, isCamActive = false, camZoom = 1.2 }) {
  const currentPos = useRef(new THREE.Vector3(...(player.position || [0, 0, 0])));
  const targetPos = useRef(new THREE.Vector3(...(player.position || [0, 0, 0])));
  const currentRot = useRef(player.rotation || 0);
  const audioRef = useRef(null);

  // Play incoming audio stream if available
  useEffect(() => {
    let audio = audioRef.current;
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.style.position = 'fixed';
      audio.style.top = '-9999px';
      audio.style.left = '-9999px';
      audio.style.opacity = '0';
      audio.style.pointerEvents = 'none';
      document.body.appendChild(audio);
      audioRef.current = audio;
    }

    if (videoStream) {
      audio.srcObject = videoStream;
      const playAudio = () => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn('[RemotePlayer] Remote audio autoplay blocked:', e);
            const resumeAudio = () => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
              window.removeEventListener('click', resumeAudio);
              window.removeEventListener('keydown', resumeAudio);
            };
            window.addEventListener('click', resumeAudio, { once: true });
            window.addEventListener('keydown', resumeAudio, { once: true });
          });
        }
      };

      playAudio();
      videoStream.onaddtrack = playAudio;
      videoStream.getAudioTracks().forEach(track => {
        track.onunmute = playAudio;
      });
    } else {
      audio.srcObject = null;
    }

    return () => {
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
        audioRef.current = null;
      }
    };
  }, [videoStream]);

  // Update target when player prop changes
  useEffect(() => {
    if (player.position) {
      targetPos.current.set(player.position[0], player.position[1], player.position[2]);
    }
  }, [player.position]);

  useFrame((_, delta) => {
    // Smoothly lerp towards target network position
    currentPos.current.lerp(targetPos.current, 0.2);

    // Smoothly lerp rotation
    const targetRot = player.rotation || 0;
    currentRot.current = THREE.MathUtils.lerp(currentRot.current, targetRot, 0.2);
  });

  return (
    <group>
      <CharacterAvatar
        position={[currentPos.current.x, currentPos.current.y, currentPos.current.z]}
        rotation={currentRot.current}
        state={player.state || 'idle'}
        avatarConfig={player.avatarConfig}
        name={player.name}
        isSpeaking={player.isSpeaking}
        isLocal={false}
        videoStream={videoStream}
        isCamActive={isCamActive}
        camZoom={camZoom}
      />
    </group>
  );
}
