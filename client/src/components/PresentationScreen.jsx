import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * PresentationScreen renders the live presentation feed directly onto the 85" conference TV wall.
 * When screenStream is active, it creates a dynamic THREE.VideoTexture updated in real-time.
 * When inactive, it displays an executive conference welcome banner.
 */
export function PresentationScreen({ screenStream, presenterName }) {
  const videoRef = useRef(null);
  const [videoTexture, setVideoTexture] = useState(null);

  useEffect(() => {
    if (!videoRef.current) {
      const vid = document.createElement('video');
      vid.autoplay = true;
      vid.playsInline = true;
      vid.muted = true;
      videoRef.current = vid;
    }

    const video = videoRef.current;

    if (screenStream) {
      video.srcObject = screenStream;
      video.play().catch(e => console.warn('Presentation video auto-play prevented:', e));

      const texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      setVideoTexture(texture);
    } else {
      video.srcObject = null;
      setVideoTexture(null);
    }

    return () => {
      if (videoTexture) {
        videoTexture.dispose();
      }
    };
  }, [screenStream]);

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
