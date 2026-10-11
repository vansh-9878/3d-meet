import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Applies centered zoom scaling to a THREE.VideoTexture using UV repeat and offset.
 */
function applyZoomToTexture(texture, zoom, isLocal) {
  if (!texture) return;
  const z = Math.max(1.0, Math.min(3.0, zoom || 1.2));
  const span = 1 / z;
  const offset = 0.5 * (1 - span);

  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  if (isLocal) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -span;
    texture.offset.x = 0.5 + span / 2;
  } else {
    texture.repeat.x = span;
    texture.offset.x = offset;
  }

  texture.repeat.y = span;
  texture.offset.y = offset;
  texture.needsUpdate = true;
}

/**
 * AvatarVideoHead:
 * 1. When isCamActive is TRUE:
 *    - Head is rendered as a stylized HEMISPHERE sitting cleanly above shoulders (no neck).
 *    - Plane side (flat circular face facing forward): displays live camera video footage with adjustable zoom.
 *    - Spherical side (curved half-sphere facing backward): pure solid jet black (#000000) to simulate hair.
 *    - Local feed is horizontally mirrored; remote feeds are unmirrored.
 * 2. When isCamActive is FALSE:
 *    - Sticks strictly to the complete stylized 3D head with facial features, hair, and ears.
 */
export function AvatarVideoHead({
  videoStream = null,
  isCamActive = false,
  isLocal = false,
  zoom = 1.2,
  materials,
  hairStyle = 'executive',
  accessory = 'glasses'
}) {
  const videoRef = useRef(null);
  const textureRef = useRef(null);
  const [hasValidVideo, setHasValidVideo] = useState(false);

  useEffect(() => {
    // If camera is OFF or stream is null, clean up all video & texture resources
    if (!isCamActive || !videoStream) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        videoRef.current = null;
      }
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      setHasValidVideo(false);
      return;
    }

    // Camera is ON with video stream:
    let video = videoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      // Style to ensure off-screen but treated by browser as active DOM element
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '320px';
      video.style.height = '320px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
      videoRef.current = video;
    }

    video.srcObject = videoStream;

    const setupTexture = () => {
      if (!textureRef.current && videoRef.current) {
        const tex = new THREE.VideoTexture(videoRef.current);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.format = THREE.RGBAFormat;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = false;

        applyZoomToTexture(tex, zoom, isLocal);
        textureRef.current = tex;
      } else if (textureRef.current) {
        applyZoomToTexture(textureRef.current, zoom, isLocal);
      }
      setHasValidVideo(true);
    };

    video.addEventListener('loadedmetadata', () => {
      video.play().catch(e => console.warn('Avatar video play error:', e));
    });
    video.addEventListener('playing', setupTexture);
    video.addEventListener('canplay', setupTexture);

    video.play()
      .then(setupTexture)
      .catch(e => console.warn('Avatar video play:', e));

    // Handle asynchronous track additions to the MediaStream
    videoStream.onaddtrack = () => {
      video.srcObject = videoStream;
      video.play().catch(() => {});
    };

    return () => {
      if (video) {
        video.removeEventListener('playing', setupTexture);
        video.removeEventListener('canplay', setupTexture);
      }
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [videoStream, isCamActive, isLocal, zoom]);

  // Update zoom when zoom prop changes
  useEffect(() => {
    if (textureRef.current) {
      applyZoomToTexture(textureRef.current, zoom, isLocal);
    }
  }, [zoom, isLocal]);

  // Keep VideoTexture continuously updated with latest camera frames
  useFrame(() => {
    if (isCamActive && textureRef.current && videoRef.current) {
      if (videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
        textureRef.current.needsUpdate = true;
      }
    }
  });

  // ==========================================
  // CASE 1: Camera is ON
  // Head is a HEMISPHERE (Neck is removed):
  // - Plane side: flat circle facing forward with live camera footage (zoomed)
  // - Spherical side: curved dome facing backward, solid pitch black (#000000) to simulate hair
  // ==========================================
  if (isCamActive) {
    return (
      <group position={[0, 0.02, 0]}>
        {/* Spherical side: Curved half-sphere pointing backward (-Z), colored solid jet black to simulate hair */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <sphereGeometry args={[0.228, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#000000"
            roughness={0.9}
            metalness={0.04}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Interior black backing circle so no interior light/white is ever visible */}
        <mesh position={[0, 0, 0.0005]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.226, 48]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Plane side: Flat circular face facing forward (+Z) with live camera video viewport */}
        {hasValidVideo && textureRef.current ? (
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[0.225, 48]} />
            <meshBasicMaterial map={textureRef.current} toneMapped={false} />
          </mesh>
        ) : (
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[0.225, 48]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.8} />
          </mesh>
        )}

        {/* Clean accent ring framing the circular camera plane and hair seam */}
        <mesh position={[0, 0, 0.003]}>
          <ringGeometry args={[0.222, 0.228, 48]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      </group>
    );
  }

  // ==========================================
  // CASE 2: Camera is OFF
  // Stick strictly to the complete stylized 3D head with facial features, hair, and ears!
  // ==========================================
  return (
    <group>
      {/* Cranium / Braincase */}
      <mesh position={[0, 0.12, -0.01]} material={materials.skin} castShadow>
        <sphereGeometry args={[0.225, 32, 32]} />
      </mesh>
      {/* Forehead and upper face fullness */}
      <mesh position={[0, 0.08, 0.03]} material={materials.skin}>
        <sphereGeometry args={[0.21, 28, 28]} />
      </mesh>
      {/* Gentle cheekbones and midface contour */}
      <mesh position={[0, 0.01, 0.03]} material={materials.skin}>
        <cylinderGeometry args={[0.205, 0.165, 0.17, 28]} />
      </mesh>
      {/* Soft rounded chin and jaw taper */}
      <mesh position={[0, -0.075, 0.04]} material={materials.skin} castShadow>
        <sphereGeometry args={[0.145, 28, 28]} />
      </mesh>

      {/* Eyes — High-Priority Expressive Symmetrical Eyes */}
      {/* Left Eye */}
      <group position={[-0.076, 0.085, 0.198]}>
        <mesh position={[0, 0.034, 0.012]} rotation={[-0.2, 0, -0.08]} material={materials.eyelid}>
          <boxGeometry args={[0.082, 0.015, 0.03]} />
        </mesh>
        <mesh material={materials.eyesWhite}>
          <sphereGeometry args={[0.044, 20, 20]} />
        </mesh>
        <mesh position={[0, 0, 0.032]} material={materials.iris}>
          <cylinderGeometry args={[0.028, 0.028, 0.01, 20]} rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
        <mesh position={[0, 0, 0.036]} material={materials.pupils}>
          <cylinderGeometry args={[0.017, 0.017, 0.01, 16]} rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
        <mesh position={[0.009, 0.011, 0.044]}>
          <sphereGeometry args={[0.007, 10, 10]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Right Eye */}
      <group position={[0.076, 0.085, 0.198]}>
        <mesh position={[0, 0.034, 0.012]} rotation={[-0.2, 0, 0.08]} material={materials.eyelid}>
          <boxGeometry args={[0.082, 0.015, 0.03]} />
        </mesh>
        <mesh material={materials.eyesWhite}>
          <sphereGeometry args={[0.044, 20, 20]} />
        </mesh>
        <mesh position={[0, 0, 0.032]} material={materials.iris}>
          <cylinderGeometry args={[0.028, 0.028, 0.01, 20]} rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
        <mesh position={[0, 0, 0.036]} material={materials.pupils}>
          <cylinderGeometry args={[0.017, 0.017, 0.01, 16]} rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
        <mesh position={[0.009, 0.011, 0.044]}>
          <sphereGeometry args={[0.007, 10, 10]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Eyebrows */}
      <group position={[-0.078, 0.155, 0.195]} rotation={[0, 0, -0.06]}>
        <mesh material={materials.eyebrows}>
          <boxGeometry args={[0.072, 0.016, 0.03]} />
        </mesh>
      </group>
      <group position={[0.078, 0.155, 0.195]} rotation={[0, 0, 0.06]}>
        <mesh material={materials.eyebrows}>
          <boxGeometry args={[0.072, 0.016, 0.03]} />
        </mesh>
      </group>

      {/* Sculpted Nose */}
      <group position={[0, 0.038, 0.218]}>
        <mesh position={[0, 0.03, -0.005]} rotation={[0.22, 0, 0]} material={materials.skin}>
          <boxGeometry args={[0.032, 0.07, 0.03]} />
        </mesh>
        <mesh position={[0, -0.006, 0.014]} material={materials.skin} castShadow>
          <sphereGeometry args={[0.026, 16, 16]} />
        </mesh>
        <mesh position={[-0.024, -0.012, 0.004]} material={materials.skin}>
          <sphereGeometry args={[0.016, 12, 12]} />
        </mesh>
        <mesh position={[0.024, -0.012, 0.004]} material={materials.skin}>
          <sphereGeometry args={[0.016, 12, 12]} />
        </mesh>
      </group>

      {/* Subtle Smile */}
      <group position={[0, -0.026, 0.208]}>
        <mesh position={[0, 0.006, 0]} rotation={[0.08, 0, 0]} material={materials.lips}>
          <boxGeometry args={[0.075, 0.014, 0.025]} />
        </mesh>
        <mesh position={[0, -0.006, 0.003]} rotation={[-0.08, 0, 0]} material={materials.lips}>
          <boxGeometry args={[0.065, 0.016, 0.028]} />
        </mesh>
      </group>

      {/* Ears */}
      <group position={[-0.225, 0.08, -0.01]} rotation={[0, 0, -0.12]}>
        <mesh material={materials.skin}>
          <sphereGeometry args={[0.048, 16, 16]} />
        </mesh>
      </group>
      <group position={[0.225, 0.08, -0.01]} rotation={[0, 0, 0.12]}>
        <mesh material={materials.skin}>
          <sphereGeometry args={[0.048, 16, 16]} />
        </mesh>
      </group>

      {/* Hairstyle */}
      {hairStyle === 'crop' ? (
        <group position={[0, 0.13, -0.01]}>
          <mesh material={materials.hair} castShadow>
            <sphereGeometry args={[0.24, 28, 28]} />
          </mesh>
          <mesh position={[0, 0.06, 0.02]} material={materials.hair}>
            <sphereGeometry args={[0.21, 24, 24]} />
          </mesh>
          <mesh position={[0, 0.09, 0.16]} rotation={[0.32, 0, 0]} material={materials.hair}>
            <boxGeometry args={[0.26, 0.07, 0.08]} />
          </mesh>
        </group>
      ) : hairStyle === 'bob' ? (
        <group position={[0, 0.13, -0.02]}>
          <mesh material={materials.hair} castShadow>
            <sphereGeometry args={[0.242, 28, 28]} />
          </mesh>
          <mesh position={[-0.195, -0.07, 0.02]} material={materials.hair} castShadow>
            <cylinderGeometry args={[0.075, 0.055, 0.24, 16]} />
          </mesh>
          <mesh position={[0.195, -0.07, 0.02]} material={materials.hair} castShadow>
            <cylinderGeometry args={[0.075, 0.055, 0.24, 16]} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0.13, -0.01]}>
          <mesh material={materials.hair} castShadow>
            <sphereGeometry args={[0.238, 28, 28]} />
          </mesh>
          <mesh position={[-0.04, 0.07, 0.05]} rotation={[0.2, 0.15, -0.1]} material={materials.hair} castShadow>
            <sphereGeometry args={[0.185, 24, 24]} />
          </mesh>
          <mesh position={[-0.02, 0.10, 0.15]} rotation={[0.3, 0.12, -0.08]} material={materials.hair}>
            <cylinderGeometry args={[0.045, 0.055, 0.22, 12]} rotation={[0, 0, Math.PI / 2]} />
          </mesh>
        </group>
      )}

      {/* Glasses */}
      {accessory === 'glasses' && (
        <group position={[0, 0.085, 0.22]}>
          <mesh position={[-0.076, 0, 0]} material={materials.glassesFrame}>
            <boxGeometry args={[0.078, 0.052, 0.012]} />
          </mesh>
          <mesh position={[0.076, 0, 0]} material={materials.glassesFrame}>
            <boxGeometry args={[0.078, 0.052, 0.012]} />
          </mesh>
          <mesh position={[0, 0.006, 0]} material={materials.glassesFrame}>
            <boxGeometry args={[0.036, 0.01, 0.01]} />
          </mesh>
          <mesh position={[-0.122, 0, -0.09]} rotation={[0, -0.14, 0]} material={materials.glassesFrame}>
            <boxGeometry args={[0.01, 0.01, 0.18]} />
          </mesh>
          <mesh position={[0.122, 0, -0.09]} rotation={[0, 0.14, 0]} material={materials.glassesFrame}>
            <boxGeometry args={[0.01, 0.01, 0.18]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
