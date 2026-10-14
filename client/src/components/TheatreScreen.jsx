import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * TheatreScreen:
 * - Massive 16:9 cinema screen at front of Movie Theatre ([0, 3.4, -10.2]).
 * - Displays live WebRTC screen sharing when active (screenStream).
 * - Displays local video or loaded movie via THREE.VideoTexture when videoUrl is active.
 * - Displays a high-contrast cinematic marquee banner when idle.
 * - Emits dynamic screen bounce lighting onto the room.
 * - Click / raycast interactive: opens Movie Player / Screen Projector modal.
 */
export function TheatreScreen({
  videoRef,
  videoUrl,
  isPlaying,
  currentTime,
  onOpenPlayer,
  isCinemaMode = false,
  screenStream = null,
  width = 11.2,
  height = 6.3
}) {
  const [videoTexture, setVideoTexture] = useState(null);
  const [screenTexture, setScreenTexture] = useState(null);
  const [hasVideoError, setHasVideoError] = useState(false);
  const meshRef = useRef(null);
  const screenVideoRef = useRef(null);

  // 1. Handle live screen sharing stream (WebRTC)
  useEffect(() => {
    let video = screenVideoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '640px';
      video.style.height = '360px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
      screenVideoRef.current = video;
    }

    if (screenStream) {
      video.srcObject = screenStream;
      const handlePlay = () => {
        setScreenTexture((prev) => {
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

      video.addEventListener('loadedmetadata', () => {
        video.play().then(handlePlay).catch((e) => console.warn('Theatre screen share auto-play prevented:', e));
      });
      video.addEventListener('playing', handlePlay);
      video.addEventListener('loadeddata', handlePlay);
      video.addEventListener('canplay', handlePlay);

      video.play().then(handlePlay).catch(() => {});
    } else {
      if (video) {
        video.srcObject = null;
      }
      setScreenTexture(null);
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [screenStream]);

  // 2. Handle movie / local video element
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

  // Click & raycast interaction
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

  // Screen share takes priority if present, otherwise local video
  const activeTexture = screenTexture || (videoTexture && !hasVideoError ? videoTexture : null);
  const isScreenActive = !!activeTexture;

  return (
    <group position={[0, 3.4, -10.2]}>
      {/* 1. Outer Dark Cinema Bevel Frame */}
      <mesh position={[0, 0, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.45, height + 0.45, 0.12]} />
        <meshStandardMaterial color="#09090b" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Inner Accent Gold/Charcoal Trim */}
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
        {activeTexture ? (
          <meshBasicMaterial
            map={activeTexture}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            color="#09090b"
            roughness={0.2}
            metalness={0.1}
            emissive={isCinemaMode ? '#1e1b4b' : '#0f172a'}
            emissiveIntensity={isCinemaMode ? 0.35 : 0.15}
          />
        )}
      </mesh>

      {/* 3. High-Contrast Cinema Marquee Display when idle */}
      {!isScreenActive && (
        <group position={[0, 0, 0.06]}>
          {/* Deep Solid Backing Surface */}
          <mesh>
            <planeGeometry args={[width * 0.94, height * 0.9]} />
            <meshBasicMaterial color="#090d16" />
          </mesh>

          {/* Film Reel Center Emblem */}
          <group position={[0, 0.5, 0.02]}>
            <mesh>
              <ringGeometry args={[0.75, 0.88, 36]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[0.6, 36]} />
              <meshBasicMaterial color="#0284c7" />
            </mesh>
            {/* Play Symbol */}
            <mesh position={[0.08, 0, 0.02]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.28, 0.48, 3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Banner Horizontal Divider */}
          <mesh position={[0, -0.6, 0.02]}>
            <boxGeometry args={[4.5, 0.04, 0.01]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>

          {/* Interactive Screen Button Cue */}
          <mesh position={[0, -1.2, 0.02]}>
            <boxGeometry args={[3.8, 0.55, 0.01]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      )}

      {/* 4. Dynamic Screen Bounce Light onto Stage and Seats */}
      {isCinemaMode && (
        <pointLight
          position={[0, -0.5, 1.8]}
          intensity={isScreenActive ? 1.8 : 0.4}
          distance={15}
          color={isScreenActive ? '#e0f2fe' : '#6366f1'}
          decay={1.8}
        />
      )}

      {/* 5. Cinema Soundbar beneath Screen */}
      <group position={[0, -height / 2 - 0.16, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[width * 0.75, 0.14, 0.1]} />
          <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
