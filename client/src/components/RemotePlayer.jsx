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
    if (audioRef.current && videoStream) {
      if (audioRef.current.srcObject !== videoStream) {
        audioRef.current.srcObject = videoStream;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn('[RemotePlayer] Remote audio autoplay blocked by browser policy:', e);
            // Retry on any subsequent user interaction with the document
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
      }
    }
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
      {videoStream && (
        <Html style={{ display: 'none' }}>
          <audio ref={audioRef} autoPlay playsInline />
        </Html>
      )}
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
