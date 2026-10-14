import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TheatreScreen } from './TheatreScreen';

/**
 * 8 Tiered Luxury Cinema Seats:
 * - Row 1 (Front): 4 seats on floor level at Z = -2.5
 * - Row 2 (Back): 4 seats on raised tier riser at Z = 2.5
 * - Central aisle between X = -1.0 and X = +1.0
 * - All seats face -Z toward the Cinema Screen (rotation = Math.PI)
 */
export const THEATRE_SEAT_POSITIONS = [
  // Front Row (Floor level, Y = 0.45)
  { id: 'theatre-seat-1', position: [-3.8, 0.45, -2.5], rotation: Math.PI, label: 'Front Row A1' },
  { id: 'theatre-seat-2', position: [-1.4, 0.45, -2.5], rotation: Math.PI, label: 'Front Row A2' },
  { id: 'theatre-seat-3', position: [1.4, 0.45, -2.5], rotation: Math.PI, label: 'Front Row A3' },
  { id: 'theatre-seat-4', position: [3.8, 0.45, -2.5], rotation: Math.PI, label: 'Front Row A4' },

  // Back Row (Elevated Stadium Riser Platform, Y = 1.50)
  { id: 'theatre-seat-5', position: [-3.8, 1.50, 2.7], rotation: Math.PI, label: 'Elevated Row B1' },
  { id: 'theatre-seat-6', position: [-1.4, 1.50, 2.7], rotation: Math.PI, label: 'Elevated Row B2' },
  { id: 'theatre-seat-7', position: [1.4, 1.50, 2.7], rotation: Math.PI, label: 'Elevated Row B3' },
  { id: 'theatre-seat-8', position: [3.8, 1.50, 2.7], rotation: Math.PI, label: 'Elevated Row B4' },
];

/**
 * Collision bounds checking for Movie Theatre:
 * - Room bounds: X in [-7.4, 7.4], Z in [-8.8, 9.8]
 * - Stage platform: Z < -8.2 is blocked unless player is above 0.42m
 * - Seat rows: block walking directly through seat bases, leaving wide center aisle (|X| < 1.0)
 */
export function isTheatrePositionBlocked(x, z, y) {
  // Room boundary walls
  if (x < -7.4 || x > 7.4 || z < -8.8 || z > 9.8) return true;

  // Front Stage platform (h ~ 0.44m)
  if (z < -8.2 && y < 0.42) {
    return true;
  }

  // Row 1 Seats (Z between -3.0 and -2.0)
  if (z > -3.0 && z < -2.0 && Math.abs(x) > 0.9) {
    if (y < 0.55) return true;
  }

  // Row 2 Elevated Riser Platform (Z between 1.1 and 4.3)
  if (z >= 1.1 && z < 4.3 && Math.abs(x) > 0.9) {
    if (y < 1.0) return true;
  }

  // Row 2 Seats (Z between 2.1 and 3.4)
  if (z > 2.1 && z < 3.4 && Math.abs(x) > 0.9) {
    if (y < 1.55) return true;
  }

  return false;
}

/**
 * MovieTheatre:
 * - Dedicated cinematic screening room environment
 * - Large 16:9 cinema screen on front wall
 * - 8 plush tiered velvet cinema seats
 * - Interactive lighting system (Normal lights vs Cinema mode)
 * - Physical wall-mounted light switch near rear entrance
 * - Synchronized watch-together video screen
 */
export function MovieTheatre({
  videoRef,
  videoUrl = '',
  isPlaying = false,
  currentTime = 0,
  onOpenPlayer = () => {},
  lightsOn = true,
  onToggleLights = () => {},
  onSeatSelect = () => {},
  currentSeatId = null,
  occupiedSeatIds = {},
  hoveredSeatId = null,
  isCursorFree = false,
  screenStream = null
}) {
  const switchMeshRef = useRef(null);

  // Set up click/raycast interaction for the physical light switch
  useEffect(() => {
    if (switchMeshRef.current) {
      switchMeshRef.current.userData = {
        name: 'theatre-light-switch',
        onSelect: () => {
          onToggleLights && onToggleLights();
        }
      };
    }
  }, [onToggleLights]);

  // Lighting parameters based on lightsOn state
  const ambientIntensity = lightsOn ? 0.95 : 0.18;
  const ceilingLightIntensity = lightsOn ? 1.6 : 0.08;
  const sconceIntensity = lightsOn ? 0.9 : 0.12;

  return (
    <group>
      {/* ============================================================== */}
      {/* 1. DYNAMIC THEATRE LIGHTING SYSTEM (Synced Lights-On vs Cinema) */}
      {/* ============================================================== */}
      <ambientLight intensity={ambientIntensity} color={lightsOn ? '#fef3c7' : '#1e1b4b'} />

      {/* Main Overhead Cinema Warm LED Recessed Grid */}
      <directionalLight
        position={[0, 8, 0]}
        intensity={ceilingLightIntensity}
        color={lightsOn ? '#fffbeb' : '#312e81'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Front Ambient Fill towards Screen */}
      <pointLight
        position={[0, 4.5, -4]}
        intensity={lightsOn ? 0.8 : 0.15}
        distance={18}
        color={lightsOn ? '#fed7aa' : '#4338ca'}
      />

      {/* ============================================================== */}
      {/* 2. THEATRE ROOM ENCLOSURE (Walls, Floor, Ceiling, Carpet)       */}
      {/* ============================================================== */}
      {/* Plush Crimson / Wine-Red Carpeted Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[16, 22]} />
        <meshStandardMaterial color="#450a0a" roughness={0.85} />
      </mesh>

      {/* Center Aisle Carpet Runner with Gold Trims */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[2.0, 21.8]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
      </mesh>

      {/* Subtle Aisle Edge Glow Trim Lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.0, 0.01, 0]}>
        <planeGeometry args={[0.04, 21.8]} />
        <meshBasicMaterial color={lightsOn ? '#f59e0b' : '#38bdf8'} transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.0, 0.01, 0]}>
        <planeGeometry args={[0.04, 21.8]} />
        <meshBasicMaterial color={lightsOn ? '#f59e0b' : '#38bdf8'} transparent opacity={0.6} />
      </mesh>

      {/* Matte Dark Acoustic Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.2, 0]}>
        <planeGeometry args={[16, 22]} />
        <meshStandardMaterial color="#09090b" roughness={0.9} />
      </mesh>

      {/* Recessed Ceiling Fixture Strips */}
      {[-4, -2, 0, 2, 4].map((z, i) => (
        <group key={i} position={[0, 6.18, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.0, 0.2]} />
            <meshBasicMaterial color={lightsOn ? '#fef3c7' : '#1e1b4b'} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* Front Proscenium Wall (Behind Screen) */}
      <mesh position={[0, 3.1, -10.8]} receiveShadow>
        <planeGeometry args={[16, 6.2]} />
        <meshStandardMaterial color="#09090b" roughness={0.9} />
      </mesh>

      {/* Rear Wall with Entrance */}
      <mesh position={[0, 3.1, 10.8]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[16, 6.2]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* Left Wall with Acoustic Sound Baffles */}
      <mesh position={[-7.95, 3.1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[22, 6.2]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* Right Wall with Acoustic Sound Baffles */}
      <mesh position={[7.95, 3.1, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[22, 6.2]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* Vertical Acoustic Wood Slat Panels on Side Walls */}
      {[-8, -5, -2, 1, 4, 7].map((z, idx) => (
        <React.Fragment key={idx}>
          {/* Left Wall Panel */}
          <group position={[-7.9, 3.0, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.08, 4.4, 1.8]} />
              <meshStandardMaterial color="#27272a" roughness={0.6} />
            </mesh>
            {/* Wall Sconce Light */}
            <mesh position={[0.08, 0.4, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.35, 12]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={sconceIntensity}
              />
            </mesh>
            <pointLight
              position={[0.2, 0.4, 0]}
              intensity={sconceIntensity * 0.4}
              distance={4.5}
              color="#f59e0b"
            />
          </group>

          {/* Right Wall Panel */}
          <group position={[7.9, 3.0, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.08, 4.4, 1.8]} />
              <meshStandardMaterial color="#27272a" roughness={0.6} />
            </mesh>
            {/* Wall Sconce Light */}
            <mesh position={[-0.08, 0.4, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.35, 12]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={sconceIntensity}
              />
            </mesh>
            <pointLight
              position={[-0.2, 0.4, 0]}
              intensity={sconceIntensity * 0.4}
              distance={4.5}
              color="#f59e0b"
            />
          </group>
        </React.Fragment>
      ))}

      {/* ============================================================== */}
      {/* 3. CINEMA FRONT STAGE & LARGE PROSCENIUM SPEAKERS              */}
      {/* ============================================================== */}
      {/* Raised Matte Black Stage Platform beneath Screen */}
      <group position={[0, 0.22, -9.6]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[14.2, 0.44, 2.4]} />
          <meshStandardMaterial color="#09090b" roughness={0.7} metalness={0.4} />
        </mesh>
        {/* Stage Edge Brass/Gold Accent Lip */}
        <mesh position={[0, 0.21, 1.2]}>
          <boxGeometry args={[14.2, 0.03, 0.04]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Stage Step Down */}
        <mesh position={[0, -0.11, 1.4]} castShadow>
          <boxGeometry args={[6.0, 0.22, 0.4]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      </group>

      {/* Left Proscenium Tower Speaker */}
      <group position={[-6.4, 2.0, -9.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 3.8, 0.7]} />
          <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.8} />
        </mesh>
        {/* Speaker Acoustic Mesh Grille */}
        <mesh position={[0, 0, 0.36]}>
          <boxGeometry args={[0.8, 3.6, 0.02]} />
          <meshStandardMaterial color="#09090b" roughness={0.9} />
        </mesh>
      </group>

      {/* Right Proscenium Tower Speaker */}
      <group position={[6.4, 2.0, -9.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 3.8, 0.7]} />
          <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.8} />
        </mesh>
        {/* Speaker Acoustic Mesh Grille */}
        <mesh position={[0, 0, 0.36]}>
          <boxGeometry args={[0.8, 3.6, 0.02]} />
          <meshStandardMaterial color="#09090b" roughness={0.9} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 4. LARGE 16:9 CINEMA SCREEN (Interactive THREE.VideoTexture)  */}
      {/* ============================================================== */}
      <TheatreScreen
        videoRef={videoRef}
        videoUrl={videoUrl}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onOpenPlayer={onOpenPlayer}
        isCinemaMode={!lightsOn}
        screenStream={screenStream}
      />

      {/* ============================================================== */}
      {/* 5. TIERED ELEVATED RISER PLATFORM FOR BACK ROW SEATS          */}
      {/* ============================================================== */}
      {/* Intermediate Access Step (h = 0.52m) */}
      <group position={[0, 0.26, 0.8]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[11.5, 0.52, 0.6]} />
          <meshStandardMaterial color="#450a0a" roughness={0.85} />
        </mesh>
        {/* Step Gold Edge Strip */}
        <mesh position={[0, 0.25, -0.3]}>
          <boxGeometry args={[11.5, 0.03, 0.04]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Step Lights */}
        {[-3.0, -1.5, 1.5, 3.0].map((x, i) => (
          <mesh key={i} position={[x, 0.12, -0.32]}>
            <boxGeometry args={[0.15, 0.04, 0.02]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        ))}
      </group>

      {/* Main Elevated Riser Platform for Row 2 (h = 1.05m, top at Y = 1.05m) */}
      <group position={[0, 0.525, 2.7]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[11.5, 1.05, 3.2]} />
          <meshStandardMaterial color="#450a0a" roughness={0.85} />
        </mesh>
        {/* Gold Upper Riser Edge Strip */}
        <mesh position={[0, 0.52, -1.6]}>
          <boxGeometry args={[11.5, 0.03, 0.04]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Upper Step Lights along Riser Edge */}
        {[-3.0, -1.5, 1.5, 3.0].map((x, i) => (
          <mesh key={i} position={[x, 0.35, -1.62]}>
            <boxGeometry args={[0.15, 0.04, 0.02]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        ))}
      </group>

      {/* ============================================================== */}
      {/* 6. EIGHT INTERACTIVE LUXURY THEATRE SEATS                     */}
      {/* ============================================================== */}
      {THEATRE_SEAT_POSITIONS.map((seat) => {
        const isOccupiedByLocal = currentSeatId === seat.id;
        const occupiedByName = occupiedSeatIds[seat.id] || null;
        const isOccupiedByOther = !!occupiedByName;
        const isHovered = !isCursorFree && hoveredSeatId === seat.id;

        return (
          <TheatreSeat
            key={seat.id}
            seat={seat}
            isOccupiedByLocal={isOccupiedByLocal}
            isOccupiedByOther={isOccupiedByOther}
            occupiedByName={occupiedByName}
            isHovered={isHovered}
            onSelect={() => {
              if (isCursorFree) return;
              if (isOccupiedByOther) return;
              onSeatSelect && onSeatSelect(seat);
            }}
          />
        );
      })}

      {/* ============================================================== */}
      {/* 7. REAR ENTRANCE, EXIT SIGN & PHYSICAL LIGHT SWITCH            */}
      {/* ============================================================== */}
      {/* Cinema Double Exit Doors */}
      <group position={[0, 1.5, 10.7]}>
        {/* Door Frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.8, 3.1, 0.1]} />
          <meshStandardMaterial color="#18181b" roughness={0.7} />
        </mesh>
        {/* Left Door Leaf */}
        <mesh position={[-0.68, 0, 0.02]}>
          <boxGeometry args={[1.3, 2.9, 0.05]} />
          <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Right Door Leaf */}
        <mesh position={[0.68, 0, 0.02]}>
          <boxGeometry args={[1.3, 2.9, 0.05]} />
          <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Metal Push Bars */}
        <mesh position={[-0.68, -0.1, 0.07]}>
          <boxGeometry args={[1.0, 0.06, 0.04]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        <mesh position={[0.68, -0.1, 0.07]}>
          <boxGeometry args={[1.0, 0.06, 0.04]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>

        {/* Illuminated Green EXIT Sign overhead */}
        <group position={[0, 1.8, 0.06]}>
          <mesh>
            <boxGeometry args={[0.9, 0.35, 0.08]} />
            <meshStandardMaterial
              color="#15803d"
              emissive="#16a34a"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      </group>

      {/* PHYSICAL WALL-MOUNTED LIGHT SWITCH */}
      <group position={[-2.8, 1.4, 10.65]}>
        {/* Switch Backing Faceplate */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.55, 0.05]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Interactive Rocker Toggle Button */}
        <mesh
          ref={switchMeshRef}
          position={[0, 0.04, 0.04]}
          rotation={[lightsOn ? -0.15 : 0.15, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLights && onToggleLights();
          }}
        >
          <boxGeometry args={[0.22, 0.22, 0.06]} />
          <meshStandardMaterial
            color={lightsOn ? '#f59e0b' : '#38bdf8'}
            emissive={lightsOn ? '#f59e0b' : '#0284c7'}
            emissiveIntensity={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Status Text Plate */}
        <mesh position={[0, -0.16, 0.03]}>
          <boxGeometry args={[0.3, 0.08, 0.01]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* Hover beacon ring around switch */}
        <mesh position={[0, 0.04, 0.06]}>
          <ringGeometry args={[0.16, 0.19, 16]} />
          <meshBasicMaterial
            color={lightsOn ? '#f59e0b' : '#38bdf8'}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Individual Luxury Cinema Theatre Seat:
 * - High-back curved burgundy velvet backrest
 * - Plush padded contour seat cushion
 * - Armrests with brass cup holders
 * - Heavy steel pedestal base
 * - Click-to-sit raycast handler
 */
function TheatreSeat({
  seat,
  isOccupiedByLocal,
  isOccupiedByOther,
  occupiedByName,
  isHovered,
  onSelect
}) {
  const groupRef = useRef(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData = {
        name: `theatre-seat-${seat.id}`,
        onSelect: () => {
          if (!isOccupiedByOther) {
            onSelect && onSelect();
          }
        }
      };
    }
  }, [seat.id, isOccupiedByOther, onSelect]);

  const isOccupied = isOccupiedByLocal || isOccupiedByOther;

  // Velvet Cushion Color: Deep rich burgundy red
  const velvetColor = isOccupiedByLocal
    ? '#2563eb'
    : isOccupiedByOther
    ? '#374151'
    : isHovered
    ? '#dc2626'
    : '#991b1b';

  const backrestColor = isOccupiedByLocal
    ? '#1d4ed8'
    : isOccupiedByOther
    ? '#1f2937'
    : isHovered
    ? '#b91c1c'
    : '#7f1d1d';

  return (
    <group
      ref={groupRef}
      position={seat.position}
      rotation={[0, seat.rotation, 0]}
    >
      {/* 1. Plush Velvet Seat Cushion */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.82, 0.16, 0.78]} />
        <meshStandardMaterial
          color={velvetColor}
          roughness={isHovered ? 0.3 : 0.6}
          emissive={isHovered ? '#dc2626' : '#000000'}
          emissiveIntensity={isHovered ? 0.4 : 0}
        />
      </mesh>

      {/* 2. High-Back Ergonomic Cinema Backrest */}
      <mesh position={[0, 1.05, -0.34]} castShadow>
        <boxGeometry args={[0.8, 0.96, 0.14]} />
        <meshStandardMaterial
          color={backrestColor}
          roughness={isHovered ? 0.3 : 0.6}
          emissive={isHovered ? '#b91c1c' : '#000000'}
          emissiveIntensity={isHovered ? 0.35 : 0}
        />
      </mesh>

      {/* Padded Headrest Pillow */}
      <mesh position={[0, 1.42, -0.32]} castShadow>
        <boxGeometry args={[0.68, 0.26, 0.16]} />
        <meshStandardMaterial color={backrestColor} roughness={0.6} />
      </mesh>

      {/* 3. Left and Right Padded Armrests with Cup Holders */}
      {/* Left Armrest */}
      <group position={[-0.45, 0.76, -0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.38, 0.64]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} />
        </mesh>
        {/* Brass Cup Holder Front */}
        <mesh position={[0, 0.2, 0.24]}>
          <cylinderGeometry args={[0.045, 0.04, 0.06, 12]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Right Armrest */}
      <group position={[0.45, 0.76, -0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.38, 0.64]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} />
        </mesh>
        {/* Brass Cup Holder Front */}
        <mesh position={[0, 0.2, 0.24]}>
          <cylinderGeometry args={[0.045, 0.04, 0.06, 12]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* 4. Heavy Steel Pedestal Floor Mount */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.44, 12]} />
        <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.06, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {/* 5. Floating Hover / Sit Beacon */}
      {!isOccupied && (
        <group position={[0, isHovered ? 1.7 : 1.45, 0]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.05, 16]} />
            <meshBasicMaterial
              color={isHovered ? '#38bdf8' : '#ef4444'}
              transparent
              opacity={isHovered ? 0.95 : 0.35}
            />
          </mesh>
          {isHovered && (
            <mesh position={[0, 0.12, 0]}>
              <ringGeometry args={[0.2, 0.25, 16]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
            </mesh>
          )}
        </group>
      )}

      {/* Occupied Badge Indicator */}
      {isOccupiedByOther && isHovered && (
        <group position={[0, 1.6, 0]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
}
