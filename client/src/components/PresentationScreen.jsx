import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PresentationScreen renders the live presentation feed directly onto the 85" conference TV wall.
 * When screenStream is active, it creates a dynamic THREE.VideoTexture updated in real-time.
 * When inactive, it displays an executive conference welcome banner.
 */
export function PresentationScreen({
  screenStream,
  presenterName,
  position = [0, 4.2, -11.6],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  width = 8.5,
  height = 4.5,
  includeSpeakerBar = true
}) {
  const videoRef = useRef(null);
  const [videoTexture, setVideoTexture] = useState(null);

  useEffect(() => {
    let video = videoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.style.position = 'fixed';
      video.style.top = '0px';
      video.style.left = '0px';
      video.style.width = '16px';
      video.style.height = '16px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '99999';
      document.body.appendChild(video);
      videoRef.current = video;
    }

    const autoResume = () => {
      const v = videoRef.current;
      if (v) {
        if (v.paused && !v.ended) {
          v.play().catch(() => {});
        }
      }
    };

    if (screenStream) {
      if (video.srcObject !== screenStream) {
        video.srcObject = screenStream;
      }

      const handlePlay = () => {
        setVideoTexture(prev => {
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

      video.addEventListener('loadedmetadata', handlePlay);
      video.addEventListener('playing', handlePlay);
      video.addEventListener('loadeddata', handlePlay);
      video.addEventListener('canplay', handlePlay);
      video.addEventListener('pause', autoResume);
      window.addEventListener('focus', autoResume);
      document.addEventListener('visibilitychange', autoResume);

      video.play().then(handlePlay).catch(() => {});

      screenStream.getVideoTracks().forEach(track => {
        track.onunmute = () => {
          if (videoRef.current) {
            videoRef.current.play().then(handlePlay).catch(() => {});
          }
        };
      });

      if (video.readyState >= 2) {
        handlePlay();
      }
    } else {
      if (video) {
        video.srcObject = null;
      }
      setVideoTexture(prev => {
        if (prev) prev.dispose();
        return null;
      });
    }

    return () => {
      window.removeEventListener('focus', autoResume);
      document.removeEventListener('visibilitychange', autoResume);
      if (video) {
        video.removeEventListener('pause', autoResume);
      }
    };
  }, [screenStream]);

  // Clean up DOM video element on complete unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        videoRef.current = null;
      }
    };
  }, []);

  // Keep screen share texture updated on every rendered frame and resume if paused
  useFrame(() => {
    const video = videoRef.current;
    if (videoTexture && video) {
      if (video.paused && !video.ended && video.readyState >= 2) {
        video.play().catch(() => {});
      }
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }
    }
  });

  const frameWidth = width + 0.3;
  const frameHeight = height + 0.3;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Heavy Bezel Frame */}
      <mesh castShadow>
        <boxGeometry args={[frameWidth, frameHeight, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Screen Display Surface */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[width, height]} />
        {videoTexture ? (
          <meshBasicMaterial map={videoTexture} />
        ) : (
          <meshStandardMaterial
            color="#0369a1"
            emissive="#0284c7"
            emissiveIntensity={0.65}
            roughness={0.2}
          />
        )}
      </mesh>

      {/* Bottom Conference Speaker Bar (optional) */}
      {includeSpeakerBar && (
        <mesh position={[0, -height / 2 - 0.25, 0.06]}>
          <boxGeometry args={[Math.min(5.2, width * 0.7), 0.22, 0.12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      )}
    </group>
  );
}
