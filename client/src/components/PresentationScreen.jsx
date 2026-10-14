import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PresentationScreen renders the live presentation feed directly onto the 85" conference TV wall.
 * When screenStream is active, it creates a dynamic THREE.VideoTexture updated in real-time.
 * When inactive, it displays an executive conference welcome banner.
 */
export function PresentationScreen({ screenStream, presenterName }) {
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
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '640px';
      video.style.height = '360px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
      videoRef.current = video;
    }

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
      if (videoTexture) {
        videoTexture.dispose();
      }
    };
  }, [screenStream]);

  // Keep screen share texture updated on every rendered frame
  useFrame(() => {
    if (videoTexture && videoRef.current) {
      if (videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }
    }
  });

  return (
    <group position={[0, 4.2, -11.6]}>
      {/* Heavy Bezel Frame */}
      <mesh castShadow>
        <boxGeometry args={[8.8, 4.8, 0.12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Screen Display Surface */}
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[8.5, 4.5]} />
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

      {/* Bottom Conference Speaker Bar */}
      <mesh position={[0, -2.6, 0.1]}>
        <boxGeometry args={[5.2, 0.28, 0.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>
    </group>
  );
}
