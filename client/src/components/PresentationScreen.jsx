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
  const audioRef = useRef(null);
  const [videoTexture, setVideoTexture] = useState(null);

  // Play incoming screen share audio tracks for viewers
  useEffect(() => {
    if (!screenStream) {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
      return;
    }

    const audioTracks = screenStream.getAudioTracks();
    if (audioTracks.length > 0) {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
      }
      audio.srcObject = new MediaStream(audioTracks);
      audio.volume = 1.0;
      audio.play().catch(e => console.warn('[PresentationScreen] Screen audio playback blocked:', e));
    } else {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [screenStream]);

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
      video.style.bottom = '0px';
      video.style.right = '0px';
      video.style.width = '4px';
      video.style.height = '4px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-100';
      document.body.appendChild(video);
      videoRef.current = video;
    }

    const autoResume = () => {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    };

    if (screenStream) {
      video.srcObject = screenStream;
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

      video.addEventListener('loadedmetadata', () => {
        video.play().then(handlePlay).catch(e => console.warn('Presentation video auto-play prevented:', e));
      });
      video.addEventListener('playing', handlePlay);
      video.addEventListener('loadeddata', handlePlay);
      video.addEventListener('canplay', handlePlay);
      video.addEventListener('pause', autoResume);
      window.addEventListener('focus', autoResume);
      document.addEventListener('visibilitychange', autoResume);

      video.play()
        .then(handlePlay)
        .catch(e => {
          console.warn('Presentation video auto-play prevented:', e);
          const resumeOnGesture = () => {
            if (videoRef.current) {
              videoRef.current.play().then(handlePlay).catch(() => {});
            }
            window.removeEventListener('click', resumeOnGesture);
            window.removeEventListener('keydown', resumeOnGesture);
          };
          window.addEventListener('click', resumeOnGesture, { once: true });
          window.addEventListener('keydown', resumeOnGesture, { once: true });
        });

      screenStream.onaddtrack = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
          videoRef.current.play().then(handlePlay).catch(() => {});
        }
      };

      screenStream.getVideoTracks().forEach(track => {
        track.onunmute = () => {
          if (videoRef.current) {
            videoRef.current.play().then(handlePlay).catch(() => {});
          }
        };
      });
    } else {
      video.srcObject = null;
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
      if (videoTexture) {
        videoTexture.dispose();
      }
    };
  }, [screenStream]);

  // Keep screen share texture updated on every rendered frame and resume if paused
  useFrame(() => {
    const video = videoRef.current;
    if (videoTexture && video) {
      if (video.paused && video.readyState >= 2) {
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
