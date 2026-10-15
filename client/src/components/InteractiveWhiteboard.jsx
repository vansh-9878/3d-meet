import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

/**
 * InteractiveWhiteboard:
 * - 3D Whiteboard mounted on the West Wall with a dynamic THREE.CanvasTexture.
 * - Displays all strokes drawn by the active participant in real time.
 * - Displays a 3D badge indicating who is currently using it (or Click to Draw if free).
 */
export function InteractiveWhiteboard({
  strokes = [],
  whiteboardUser = null,
  currentSocketId = null,
  onOpenWhiteboard = () => {},
  isCursorFree = false,
  position = [-11.75, 3.6, 0],
  rotation = [0, Math.PI / 2, 0],
  scale = [1, 1, 1],
  width = 7.6,
  height = 3.6
}) {
  const canvasRef = useRef(null);
  const textureRef = useRef(null);
  const [textureReady, setTextureReady] = useState(false);

  // Initialize high-res 1920x960 2D canvas texture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');

    // Fill white with very faint design grid lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 60; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 60; y < canvas.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Default welcome watermark in corner
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Collaborative Whiteboard', 40, 50);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.generateMipmaps = false;

    canvasRef.current = canvas;
    textureRef.current = texture;
    setTextureReady(true);

    return () => {
      texture.dispose();
    };
  }, []);

  // Redraw canvas whenever strokes change or are cleared
  useEffect(() => {
    if (!canvasRef.current || !textureRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Reset board
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 60; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 60; y < canvas.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Collaborative Whiteboard', 40, 50);

    // Render all strokes
    strokes.forEach((s) => {
      if (s.isClear) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.strokeStyle = s.isEraser ? '#ffffff' : (s.color || '#0f172a');
      ctx.lineWidth = s.size || 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    textureRef.current.needsUpdate = true;
  }, [strokes]);

  const isBeingUsedBySomeoneElse = whiteboardUser && whiteboardUser.userId !== currentSocketId;
  const isBeingUsedByMe = whiteboardUser && whiteboardUser.userId === currentSocketId;

  const frameW = width + 0.2;
  const frameH = height + 0.2;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Heavy Aluminium Bezel Frame */}
      <mesh castShadow>
        <boxGeometry args={[frameW, frameH, 0.08]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Dynamic Drawing Surface */}
      <mesh
        position={[0, 0, 0.045]}
        onClick={(e) => {
          e.stopPropagation();
          onOpenWhiteboard();
        }}
      >
        <planeGeometry args={[width, height]} />
        {textureReady && textureRef.current ? (
          <meshBasicMaterial map={textureRef.current} />
        ) : (
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.02} />
        )}
      </mesh>

      {/* Bottom Aluminum Pen & Eraser Tray */}
      <mesh position={[0, -height / 2 - 0.15, 0.15]}>
        <boxGeometry args={[Math.min(5.0, width * 0.7), 0.08, 0.25]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Marker Pens on the Tray */}
      <mesh position={[-0.8, -1.90, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.4, -1.90, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0.0, -1.90, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0.4, -1.90, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      {/* Whiteboard Felt Eraser */}
      <mesh position={[1.0, -1.90, 0.15]}>
        <boxGeometry args={[0.18, 0.04, 0.08]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* 3D Status / Click to Draw Badge above Whiteboard */}
      <group position={[0, 2.2, 0.1]}>
        <Html center distanceFactor={14}>
          <div className="select-none pointer-events-auto">
            {isBeingUsedBySomeoneElse ? (
              <div className="px-3.5 py-1.5 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-xl border-2 border-amber-300 flex items-center gap-2 animate-pulse whitespace-nowrap">
                <span>✏️</span>
                <span>In use by {whiteboardUser.userName}</span>
              </div>
            ) : isBeingUsedByMe ? (
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-xl border-2 border-emerald-300 flex items-center gap-2 whitespace-nowrap">
                <span>✏️</span>
                <span>You are drawing (Live)</span>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenWhiteboard();
                }}
                className="px-4 py-1.5 rounded-full bg-blue-600/95 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xl border-2 border-blue-400 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>✏️</span>
                <span>Click to Draw on Whiteboard</span>
              </button>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}
