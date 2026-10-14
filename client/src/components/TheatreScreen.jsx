import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Film, Play, Volume2, Sparkles } from 'lucide-react';

/**
 * TheatreScreen:
 * - Large 16:9 cinema screen wall-mounted at the front of the Movie Theatre.
 * - Renders active video via THREE.VideoTexture when videoUrl is playing/loaded.
 * - Displays a sleek cinema marquee banner when idle.
 * - Emits soft dynamic screen bounce light onto the stage and seats.
 * - Interactive: clicking or aiming at the screen opens the movie player.
 */
export function TheatreScreen({
  videoRef,
  videoUrl,
  isPlaying,
  currentTime,
  onOpenPlayer,
  isCinemaMode = false,
  width = 11.2,
  height = 6.3
}) {
  const [videoTexture, setVideoTexture] = useState(null);
  const [hasVideoError, setHasVideoError] = useState(false);
  const meshRef = useRef(null);

  // Set up VideoTexture from the shared HTML5 video element
  useEffect(() => {
    const video = videoRef?.current;
    if (!video || !videoUrl) {
      setVideoTexture(null);
      return;
    }

    setHasVideoError(false);

    const handleCanPlay = () => {
      setVideoTexture((prev) => {
        if (!prev) {
          const texture = new THREE.VideoTexture(video);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = false;
          return texture;
        }
        return prev;
      });
    };

    const handleError = () => {
      console.warn('Theatre video failed to load:', videoUrl);
      setHasVideoError(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handleCanPlay);
    video.addEventListener('error', handleError);

    if (video.readyState >= 2) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoRef, videoUrl]);

  // Set up raycast interaction for clicking the screen to open the movie player
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData = {
        name: 'cinema-screen',
        onSelect: () => {
          onOpenPlayer && onOpenPlayer();
        }
      };
    }
  }, [onOpenPlayer]);

  return (
    <group position={[0, 3.4, -10.2]}>
      {/* 1. Outer Dark Cinema Bevel Frame */}
      <mesh position={[0, 0, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.45, height + 0.45, 0.12]} />
        <meshStandardMaterial color="#09090b" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Inner Accent Trim / Border */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.08]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* 2. Main 16:9 Screen Surface */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0.04]}
        castShadow={false}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onOpenPlayer && onOpenPlayer();
        }}
      >
        <planeGeometry args={[width, height]} />
        {videoTexture && !hasVideoError ? (
          <meshBasicMaterial
            map={videoTexture}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            color="#0b0f19"
            roughness={0.3}
            metalness={0.1}
            emissive={isCinemaMode ? '#1e1b4b' : '#0f172a'}
            emissiveIntensity={isCinemaMode ? 0.35 : 0.15}
          />
        )}
      </mesh>

      {/* 3. Idle Marquee Display when no video is playing */}
      {(!videoTexture || hasVideoError) && (
        <group position={[0, 0, 0.06]}>
          {/* Subtle Backing Canvas Effect */}
          <mesh>
            <planeGeometry args={[width * 0.94, height * 0.9]} />
            <meshBasicMaterial color="#090d16" />
          </mesh>

          {/* Golden / Cyan Cinematic Emblem */}
          <group position={[0, 0.4, 0.02]}>
            {/* Film Reel Decorative Ring */}
            <mesh>
              <ringGeometry args={[0.7, 0.82, 32]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[0.55, 32]} />
              <meshBasicMaterial color="#0369a1" />
            </mesh>
            {/* Play Symbol in Center */}
            <mesh position={[0.06, 0, 0.02]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.26, 0.45, 3]} />
              <meshBasicMaterial color="#f8fafc" />
            </mesh>
          </group>

          {/* Under-Emblem Cinema Welcome Banner Line */}
          <mesh position={[0, -0.65, 0.02]}>
            <boxGeometry args={[4.2, 0.04, 0.01]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>

          {/* Click to open player cue pill */}
          <mesh position={[0, -1.2, 0.02]}>
            <boxGeometry args={[3.2, 0.45, 0.01]} />
            <meshBasicMaterial color="#2563eb" />
          </mesh>
        </group>
      )}

      {/* 4. Dynamic Screen Bounce Light onto Stage and Front Seats */}
      {isCinemaMode && (
        <pointLight
          position={[0, -0.5, 1.8]}
          intensity={isPlaying ? 1.6 : 0.6}
          distance={14}
          color={isPlaying ? '#e0f2fe' : '#6366f1'}
          decay={1.8}
        />
      )}

      {/* 5. Soundbar Speaker Grille beneath Screen */}
      <group position={[0, -height / 2 - 0.16, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[width * 0.75, 0.14, 0.1]} />
          <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
