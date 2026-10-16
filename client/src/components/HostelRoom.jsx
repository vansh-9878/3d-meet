import React from 'react';
import * as THREE from 'three';
import { PresentationScreen } from './PresentationScreen';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';

/**
 * 6 Interactive Seating spots in the Hostel Room:
 * - 3 Study Desk Chairs
 * - 1 Window Study Chair
 * - 2 Lower Bunk Bed Sitting Edges
 */
export const HOSTEL_SEAT_POSITIONS = [
  // 1. Study Desk 1 Chair (Left side, towards window)
  { id: 'hostel-seat-1', position: [-2.2, 0.45, -2.3], rotation: -Math.PI / 2, label: 'Desk 1 Chair' },
  // 2. Study Desk 2 Chair (Gaming Setup with open laptop)
  { id: 'hostel-seat-2', position: [-2.2, 0.45, -0.7], rotation: -Math.PI / 2, label: 'Desk 2 Chair' },
  // 3. Study Desk 3 Chair (Towards entrance)
  { id: 'hostel-seat-3', position: [-2.2, 0.45, 0.8], rotation: -Math.PI / 2, label: 'Desk 3 Chair' },
  // 4. Window Desk 4 Chair (Facing desk against front wall)
  { id: 'hostel-seat-4', position: [-0.7, 0.45, -3.15], rotation: 0, label: 'Desk 4 Chair' },
  // 5. Lower Bunk Bed 1 Edge (Left side, facing into room)
  { id: 'hostel-seat-5', position: [-2.5, 0.45, 2.8], rotation: Math.PI / 2, label: 'Bunk Bed 1' },
  // 6. Lower Bunk Bed 2 Edge (Front wall, rotated 90 deg, facing into room)
  { id: 'hostel-seat-6', position: [2.3, 0.45, -3.0], rotation: 0, label: 'Bunk Bed 2' },
];

/**
 * Collision bounds for Hostel Room:
 * - Room dimensions: X in [-3.6, 3.6], Z in [-3.9, 3.9]
 * - Left Study Desks (1, 2, 3): X in [-3.6, -2.5], Z in [-3.0, 1.4]
 * - Front Window Desk 4: X in [-1.35, -0.05], Z in [-3.9, -3.3]
 * - Bunk Bed 1 (Left corner): X in [-3.65, -2.5], Z in [1.75, 3.85]
 * - Wardrobes: X in [2.85, 3.75], Z in [0.15, 3.8]
 * - Bunk Bed 2 (Front wall, rotated 90 deg): X in [1.25, 3.35], Z in [-3.9, -3.05]
 */
export function isHostelPositionBlocked(x, z, y) {
  // Outer perimeter walls
  if (x < -3.55 || x > 3.55 || z < -3.85 || z > 3.85) return true;

  // Left 3 Study Desks (allows sitting)
  if (y < 0.95 && x < -2.5 && z > -3.0 && z < 1.4) return true;

  // Front Wall Study Desk 4 (allows sitting)
  if (y < 0.95 && x > -1.35 && x < -0.05 && z < -3.3) return true;

  // Bunk Bed 1 base (allows jumping on mattress if y > 0.8)
  if (y < 0.8 && x < -2.5 && z > 1.75 && z < 3.85) return true;

  // Wardrobes bank (tall, completely impassable)
  if (x > 2.85 && z > 0.15 && z < 3.8) return true;

  // Bunk Bed 2 base (rotated 90 deg along front wall, allows jumping on mattress if y > 0.8)
  if (y < 0.8 && x > 1.25 && x < 3.35 && z < -3.05) return true;

  return false;
}

export function HostelRoom({
  onSeatSelect = () => {},
  currentSeatId = null,
  isCursorFree = false,
  screenStream = null,
  presenterName = '',
  hoveredSeatId = null,
  occupiedSeatIds = {},
  whiteboardStrokes = [],
  whiteboardUser = null,
  currentSocketId = null,
  onOpenWhiteboard = () => {},
  lightsOn = true,
  onToggleLights = () => {}
}) {
  return (
    <group>
      {/* ============================================================== */}
      {/* 1. LIGHTING (Hostel Tube Lights + Ambient + Switch)             */}
      {/* ============================================================== */}
      <ambientLight intensity={lightsOn ? 1.35 : 0.25} color={lightsOn ? '#f8fafc' : '#1e1b4b'} />
      <directionalLight
        position={[4, 7, 2]}
        intensity={lightsOn ? 1.6 : 0.2}
        color={lightsOn ? '#fffbeb' : '#312e81'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ceiling Tube Light 1 (Horizontal across room, Front Section, flush to ceiling) */}
      <group position={[0, 3.385, -1.2]}>
        {/* Metal Batten Fixture against ceiling */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.4, 0.03, 0.12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Horizontal Glass Tube aligned across X */}
        <mesh position={[0, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 2.2, 12]} />
          <meshBasicMaterial color={lightsOn ? '#ffffff' : '#64748b'} />
        </mesh>
        {/* Chrome End Caps */}
        <mesh position={[-1.12, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        <mesh position={[1.12, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {lightsOn && <pointLight position={[0, -0.2, 0]} intensity={1.5} distance={9} color="#fffbeb" />}
      </group>

      {/* Ceiling Tube Light 2 (Horizontal across room, Back Section, flush to ceiling) */}
      <group position={[0, 3.385, 1.5]}>
        {/* Metal Batten Fixture against ceiling */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.4, 0.03, 0.12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Horizontal Glass Tube aligned across X */}
        <mesh position={[0, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 2.2, 12]} />
          <meshBasicMaterial color={lightsOn ? '#ffffff' : '#64748b'} />
        </mesh>
        {/* Chrome End Caps */}
        <mesh position={[-1.12, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        <mesh position={[1.12, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {lightsOn && <pointLight position={[0, -0.2, 0]} intensity={1.5} distance={9} color="#fffbeb" />}
      </group>

      {/* Desk 2 Laptop & Lamp Glow */}
      <pointLight position={[-2.8, 1.25, -0.7]} intensity={0.7} distance={3.5} color="#38bdf8" />
      <pointLight position={[-2.9, 1.5, -1.0]} intensity={lightsOn ? 0.9 : 1.2} distance={2.8} color="#fef08a" />

      {/* ============================================================== */}
      {/* 2. ROOM ENCLOSURE (Tiled Floor, Off-White Walls, Ceiling)       */}
      {/* ============================================================== */}
      {/* Light Grey Tile Floor with Grid Grout lines */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[7.6, 8.4]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.65} metalness={0.08} />
      </mesh>

      {/* Tile Grout Lines */}
      {[-3, -2, -1, 0, 1, 2, 3].map((x) => (
        <mesh key={`grid-x-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.002, 0]}>
          <planeGeometry args={[0.015, 8.4]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>
      ))}
      {[-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].map((z) => (
        <mesh key={`grid-z-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, z]}>
          <planeGeometry args={[7.6, 0.015]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>
      ))}

      {/* White Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.4, 0]}>
        <planeGeometry args={[7.6, 8.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* Back Wall (Z = +4.2, Entrance Door side) */}
      <mesh position={[0, 1.7, 4.2]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[7.6, 3.4]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.85} />
      </mesh>

      {/* Front Wall (Z = -4.2, Window side) */}
      <mesh position={[0, 1.7, -4.2]} receiveShadow>
        <planeGeometry args={[7.6, 3.4]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.85} />
      </mesh>

      {/* Left Wall (X = -3.8, Desks & Wall Shelves) */}
      <mesh position={[-3.8, 1.7, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8.4, 3.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.85} />
      </mesh>

      {/* Right Wall (X = +3.8, Wardrobes & TV) */}
      <mesh position={[3.8, 1.7, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8.4, 3.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.85} />
      </mesh>

      {/* Skirting / Baseboards along floor edges */}
      <mesh position={[0, 0.05, 4.18]}>
        <boxGeometry args={[7.6, 0.1, 0.03]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, -4.18]}>
        <boxGeometry args={[7.6, 0.1, 0.03]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <mesh position={[-3.78, 0.05, 0]}>
        <boxGeometry args={[0.03, 0.1, 8.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <mesh position={[3.78, 0.05, 0]}>
        <boxGeometry args={[0.03, 0.1, 8.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>

      {/* ============================================================== */}
      {/* 3. ENTRANCE DOOR & BACK WALL ARCHITECTURE                      */}
      {/* ============================================================== */}
      {/* Dark Brown Wooden Door */}
      <group position={[2.6, 1.25, 4.16]}>
        {/* Frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 2.5, 0.06]} />
          <meshStandardMaterial color="#1e130c" roughness={0.6} />
        </mesh>
        {/* Door Leaf */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[1.12, 2.42, 0.04]} />
          <meshStandardMaterial color="#361f14" roughness={0.5} />
        </mesh>
        {/* Door Knob / Handle */}
        <mesh position={[-0.45, -0.05, -0.05]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Hydraulic Door Closer at Top */}
        <mesh position={[0, 1.15, -0.05]}>
          <boxGeometry args={[0.32, 0.06, 0.06]} />
          <meshStandardMaterial color="#71717a" metalness={0.8} />
        </mesh>
        {/* Newspaper / Posters Taped to Top of Door */}
        <mesh position={[-0.2, 0.75, -0.032]}>
          <planeGeometry args={[0.35, 0.25]} />
          <meshBasicMaterial color="#e4e4e7" />
        </mesh>
        <mesh position={[0.22, 0.75, -0.032]}>
          <planeGeometry args={[0.32, 0.28]} />
          <meshBasicMaterial color="#d4d4d8" />
        </mesh>
        {/* 3 Hooks on Door with Hanging Clothes */}
        {[-0.28, 0, 0.28].map((hx, idx) => (
          <group key={`hook-${idx}`} position={[hx, 0.25, -0.04]}>
            {/* Hook knob */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.04, 8]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
            {/* Hanging Jacket / Coat */}
            <mesh position={[0, -0.45, -0.02]} rotation={[0, 0, (idx - 1) * 0.05]}>
              <boxGeometry args={[0.24, 0.82, 0.08]} />
              <meshStandardMaterial
                color={idx === 0 ? '#451a03' : idx === 1 ? '#0f172a' : '#1e293b'}
                roughness={0.9}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Laundry Hamper / Basket near Door */}
      <group position={[3.3, 0.35, 3.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.26, 0.24, 0.7, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.265, 0.265, 0.04, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
        </mesh>
      </group>

      {/* Wall Split Air Conditioner Unit (White Daikin style) */}
      <group position={[2.6, 2.9, 4.08]}>
        <mesh castShadow>
          <boxGeometry args={[1.25, 0.38, 0.28]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Bottom Air Louvre Flap */}
        <mesh position={[0, -0.16, 0.02]}>
          <boxGeometry args={[1.18, 0.04, 0.24]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
        </mesh>
        {/* Brand logo & LED indicator */}
        <mesh position={[0.45, -0.05, -0.142]}>
          <circleGeometry args={[0.012, 8]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>

      {/* Electric Meter Box & Wires */}
      <group position={[1.2, 2.7, 4.15]}>
        <mesh>
          <boxGeometry args={[0.22, 0.3, 0.1]} />
          <meshStandardMaterial color="#18181b" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.05, -0.052]}>
          <planeGeometry args={[0.14, 0.08]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Square Ventilation Grille */}
      <mesh position={[0.8, 2.75, 4.17]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.5} />
      </mesh>

      {/* Wall Light Switch Panel (Interactive toggle) */}
      <group
        position={[1.6, 1.35, 4.16]}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLights();
        }}
      >
        <mesh>
          <boxGeometry args={[0.16, 0.22, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[0.06, 0.08, 0.02]} />
          <meshStandardMaterial color={lightsOn ? '#f59e0b' : '#334155'} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 4. TALL MEDIUM BROWN WARDROBES / ALMIRAHS (Right Wall, X = +3.8) */}
      {/* ============================================================== */}
      <group position={[3.35, 1.45, 1.95]}>
        {/* Main Wardrobe Cabinet Shell: Medium Brown Wood */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.75, 2.9, 3.6]} />
          <meshStandardMaterial color="#854d0e" roughness={0.6} metalness={0.08} />
        </mesh>

        {/* 5 Individual Door Panels with Grooves and Vertical Wooden Handles */}
        {[-1.4, -0.7, 0, 0.7, 1.4].map((zPos, i) => (
          <group key={`wardrobe-door-${i}`} position={[-0.38, 0, zPos]}>
            <mesh>
              <boxGeometry args={[0.02, 2.84, 0.68]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#935a32' : '#874d26'}
                roughness={0.55}
              />
            </mesh>
            {/* Long Vertical Wooden Handle */}
            <mesh position={[-0.025, 0, i % 2 === 0 ? 0.28 : -0.28]}>
              <boxGeometry args={[0.03, 0.42, 0.04]} />
              <meshStandardMaterial color="#502b15" roughness={0.4} />
            </mesh>
          </group>
        ))}

        {/* White Shirt on Red Hanger hanging from Wardrobe Handle */}
        <group position={[-0.42, -0.05, 0.7]}>
          {/* Red Hanger */}
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[0.02, 0.04, 0.38]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {/* White Shirt body */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.75, 0.46]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          {/* Shirt Collar */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.09, 0.08, 0.22]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
        </group>

        {/* College ID Lanyard hanging from another handle */}
        <mesh position={[-0.41, -0.15, -0.7]}>
          <boxGeometry args={[0.015, 0.45, 0.04]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[-0.41, -0.4, -0.7]}>
          <boxGeometry args={[0.01, 0.1, 0.07]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* STACKED ITEMS ON TOP OF WARDROBES */}
        {/* Bright Blue Hardshell Luggage Suitcase */}
        <group position={[0.05, 1.72, -0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.48, 0.75]} />
            <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.2} />
          </mesh>
          {/* Handle & Corner Ribs */}
          <mesh position={[-0.26, 0, 0]}>
            <boxGeometry args={[0.04, 0.06, 0.3]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Dark Navy / Black Fabric Suitcase */}
        <group position={[0.05, 1.68, 0.4]}>
          <mesh castShadow>
            <boxGeometry args={[0.52, 0.42, 0.72]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
        </group>

        {/* Delivery Cardboard Storage Boxes */}
        <group position={[0.05, 1.66, 1.25]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.38, 0.55]} />
            <meshStandardMaterial color="#d97706" roughness={0.9} />
          </mesh>
          {/* Tape stripe */}
          <mesh position={[0, 0.192, 0]}>
            <boxGeometry args={[0.505, 0.005, 0.08]} />
            <meshBasicMaterial color="#b45309" />
          </mesh>
        </group>
        <group position={[0.05, 1.65, -1.3]}>
          <mesh castShadow>
            <boxGeometry args={[0.48, 0.35, 0.5]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.9} />
          </mesh>
        </group>
        {/* Red Grocery / Snack Tote bag */}
        <mesh position={[-0.1, 1.58, -1.65]}>
          <boxGeometry args={[0.25, 0.26, 0.25]} />
          <meshStandardMaterial color="#dc2626" roughness={0.9} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 5. INTERACTIVE 16:9 TV (Right Wall, X = +3.7, Z = -1.4)        */}
      {/* ============================================================== */}
      <PresentationScreen
        screenStream={screenStream}
        presenterName={presenterName}
        position={[3.7, 1.95, -1.4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[1, 1, 1]}
        width={2.2}
        height={1.24}
        includeSpeakerBar={true}
      />

      {/* ============================================================== */}
      {/* 6. BUNK BED 1 (Black Metal Frame, tucked into Left/Back Corner) */}
      {/* ============================================================== */}
      <group position={[-3.1, 0, 2.8]}>
        {/* 4 Vertical Black Metal Posts */}
        {[
          [-0.52, 1.1, -1.02],
          [0.52, 1.1, -1.02],
          [-0.52, 1.1, 1.02],
          [0.52, 1.1, 1.02],
        ].map(([px, py, pz], i) => (
          <mesh key={`bunk1-post-${i}`} position={[px, py, pz]} castShadow>
            <boxGeometry args={[0.05, 2.2, 0.05]} />
            <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.7} />
          </mesh>
        ))}

        {/* Lower Bed Frame & Base */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.06, 2.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Lower Mattress with light grey patterned sheet */}
        <mesh position={[0, 0.52, 0]} receiveShadow>
          <boxGeometry args={[0.98, 0.16, 1.98]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        {/* Lower Bed Pillow with Leaf Pattern */}
        <mesh position={[0, 0.65, 0.72]}>
          <boxGeometry args={[0.62, 0.12, 0.42]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
        </mesh>
        {/* Messy Crumpled Blanket on Lower Bed */}
        <group position={[0.08, 0.64, -0.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.78, 0.14, 1.05]} />
            <meshStandardMaterial color="#64748b" roughness={0.95} />
          </mesh>
          {/* Fold overlap */}
          <mesh position={[-0.1, 0.06, 0.15]} rotation={[0.1, -0.1, 0.1]}>
            <boxGeometry args={[0.6, 0.08, 0.5]} />
            <meshStandardMaterial color="#0284c7" roughness={0.9} />
          </mesh>
        </group>

        {/* Upper Bed Frame */}
        <mesh position={[0, 1.62, 0]} castShadow>
          <boxGeometry args={[1.05, 0.06, 2.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Upper Mattress with Blue Patterned Fabric */}
        <mesh position={[0, 1.72, 0]}>
          <boxGeometry args={[0.98, 0.16, 1.98]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.85} />
        </mesh>
        {/* Upper Pillow */}
        <mesh position={[0, 1.84, 0.72]}>
          <boxGeometry args={[0.6, 0.12, 0.4]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.8} />
        </mesh>

        {/* Upper Bed Horizontal Safety Railings */}
        {/* Outer Railing Bar */}
        <mesh position={[0.52, 1.92, 0]}>
          <boxGeometry args={[0.03, 0.04, 2.05]} />
          <meshStandardMaterial color="#09090b" metalness={0.7} />
        </mesh>
        {/* Vertical Railing Slats */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((rz, ri) => (
          <mesh key={`bunk1-slat-${ri}`} position={[0.52, 1.78, rz]}>
            <boxGeometry args={[0.02, 0.28, 0.03]} />
            <meshStandardMaterial color="#09090b" metalness={0.7} />
          </mesh>
        ))}

        {/* Clothes Casually Hanging Over the Upper Railing */}
        {/* Striped Polo Shirt */}
        <mesh position={[0.54, 1.76, 0.15]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.06, 0.38, 0.32]} />
          <meshStandardMaterial color="#c2410c" roughness={0.95} />
        </mesh>
        {/* Black T-Shirt */}
        <mesh position={[0.54, 1.72, -0.3]}>
          <boxGeometry args={[0.05, 0.46, 0.35]} />
          <meshStandardMaterial color="#0f172a" roughness={0.95} />
        </mesh>

        {/* Built-in Black Metal Ladder on Right Side */}
        <group position={[0.54, 0.9, 0.45]}>
          {/* 2 Vertical Ladder Rails */}
          <mesh position={[0, 0, -0.18]}>
            <cylinderGeometry args={[0.02, 0.02, 1.75, 8]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.18]}>
            <cylinderGeometry args={[0.02, 0.02, 1.75, 8]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} />
          </mesh>
          {/* Ladder Rungs */}
          {[-0.6, -0.25, 0.1, 0.45, 0.75].map((ry, idx) => (
            <mesh key={`bunk1-rung-${idx}`} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.36, 8]} />
              <meshStandardMaterial color="#09090b" metalness={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ============================================================== */}
      {/* 7. FRONT WALL WINDOW & DEEP RED FABRIC CURTAIN                 */}
      {/* ============================================================== */}
      <group position={[-1.2, 2.0, -4.15]}>
        {/* Window Cutout Recess */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.8, 1.9]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} />
        </mesh>
        {/* White Window Frame */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[1.86, 1.96, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        {/* Horizontal Security Grill Bars */}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((by, bi) => (
          <mesh key={`window-bar-${bi}`} position={[0, by, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 1.8, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        ))}
        {/* Curtain Rod */}
        <mesh position={[-0.2, 1.05, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 2.2, 8]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.9} />
        </mesh>
        {/* Deep Red Fabric Curtain with 3D Folds */}
        <group position={[-0.3, -0.05, 0.14]}>
          {[-0.5, -0.32, -0.14, 0.04, 0.22, 0.4].map((fx, fi) => (
            <mesh key={`curtain-fold-${fi}`} position={[fx, 0, (fi % 2) * 0.04]} castShadow>
              <cylinderGeometry args={[0.1, 0.12, 2.05, 8, 1, false, 0, Math.PI]} rotation={[0, Math.PI / 2, 0]} />
              <meshStandardMaterial color="#991b1b" roughness={0.95} />
            </mesh>
          ))}
          {/* Main drape backing */}
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[1.1, 2.05]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.95} />
          </mesh>
        </group>
      </group>

      {/* ============================================================== */}
      {/* 8. BUNK BED 2 (Front Wall, rotated 90 deg, snug against wall)  */}
      {/* ============================================================== */}
      <group position={[2.3, 0, -3.6]} rotation={[0, Math.PI / 2, 0]}>
        {/* 4 Vertical Black Metal Posts */}
        {[
          [-0.52, 1.1, -1.02],
          [0.52, 1.1, -1.02],
          [-0.52, 1.1, 1.02],
          [0.52, 1.1, 1.02],
        ].map(([px, py, pz], i) => (
          <mesh key={`bunk2-post-${i}`} position={[px, py, pz]} castShadow>
            <boxGeometry args={[0.05, 2.2, 0.05]} />
            <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.7} />
          </mesh>
        ))}

        {/* Lower Bed Frame & Base */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.06, 2.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Lower Mattress */}
        <mesh position={[0, 0.52, 0]} receiveShadow>
          <boxGeometry args={[0.98, 0.16, 1.98]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
        </mesh>
        {/* Crumpled blanket & Pillow */}
        <mesh position={[0, 0.65, -0.72]}>
          <boxGeometry args={[0.62, 0.12, 0.42]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
        </mesh>
        <mesh position={[-0.05, 0.62, 0.15]}>
          <boxGeometry args={[0.82, 0.12, 1.1]} />
          <meshStandardMaterial color="#475569" roughness={0.95} />
        </mesh>

        {/* Upper Bed Frame */}
        <mesh position={[0, 1.62, 0]} castShadow>
          <boxGeometry args={[1.05, 0.06, 2.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Upper Mattress with Floral / Colourful Quilt */}
        <mesh position={[0, 1.72, 0]}>
          <boxGeometry args={[0.98, 0.16, 1.98]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.76, 0.1]}>
          <boxGeometry args={[0.92, 0.1, 1.5]} />
          <meshStandardMaterial color="#b45309" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.84, -0.72]}>
          <boxGeometry args={[0.6, 0.12, 0.4]} />
          <meshStandardMaterial color="#fde047" roughness={0.8} />
        </mesh>

        {/* Safety Railings */}
        <mesh position={[-0.52, 1.92, 0]}>
          <boxGeometry args={[0.03, 0.04, 2.05]} />
          <meshStandardMaterial color="#09090b" metalness={0.7} />
        </mesh>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((rz, ri) => (
          <mesh key={`bunk2-slat-${ri}`} position={[-0.52, 1.78, rz]}>
            <boxGeometry args={[0.02, 0.28, 0.03]} />
            <meshStandardMaterial color="#09090b" metalness={0.7} />
          </mesh>
        ))}

        {/* Ladder on Left Side */}
        <group position={[-0.54, 0.9, -0.35]}>
          <mesh position={[0, 0, -0.18]}>
            <cylinderGeometry args={[0.02, 0.02, 1.75, 8]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.18]}>
            <cylinderGeometry args={[0.02, 0.02, 1.75, 8]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} />
          </mesh>
          {[-0.6, -0.25, 0.1, 0.45, 0.75].map((ry, idx) => (
            <mesh key={`bunk2-rung-${idx}`} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.36, 8]} />
              <meshStandardMaterial color="#09090b" metalness={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ============================================================== */}
      {/* 9. THREE STUDY DESKS WITH PROPS (Left Wall, X = -3.1)          */}
      {/* ============================================================== */}
      {/* DESK 1 (Towards Window, Z = -2.3) */}
      <group position={[-3.1, 0, -2.3]}>
        {/* Tabletop: Dark Brown Wood */}
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.04, 1.15]} />
          <meshStandardMaterial color="#3b2214" roughness={0.6} />
        </mesh>
        {/* 4 Black Metal Legs */}
        {[
          [-0.46, 0.37, -0.52],
          [0.46, 0.37, -0.52],
          [-0.46, 0.37, 0.52],
          [0.46, 0.37, 0.52],
        ].map(([lx, ly, lz], li) => (
          <mesh key={`d1-leg-${li}`} position={[lx, ly, lz]} castShadow>
            <boxGeometry args={[0.04, 0.74, 0.04]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        ))}

        {/* Closed Black Laptop with Stickers */}
        <mesh position={[0.05, 0.77, 0.1]} rotation={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.26, 0.02, 0.36]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Sticker on laptop */}
        <mesh position={[0.05, 0.781, 0.1]} rotation={[-Math.PI / 2, 0, 0.08]}>
          <planeGeometry args={[0.08, 0.08]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Purple Spiral Notebook with Optical Mouse on Top */}
        <mesh position={[0.1, 0.765, -0.32]} rotation={[0, -0.05, 0]}>
          <boxGeometry args={[0.24, 0.015, 0.28]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.7} />
        </mesh>
        <mesh position={[0.1, 0.78, -0.32]}>
          <boxGeometry args={[0.06, 0.025, 0.1]} />
          <meshStandardMaterial color="#09090b" roughness={0.2} />
        </mesh>
        {/* Pen Stand & Colorful Pens */}
        <mesh position={[-0.32, 0.83, 0.38]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[-0.32, 0.92, 0.38]} rotation={[0.1, 0, 0.1]}>
          <cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      {/* DESK 2 (Middle Gaming / Coding Desk, Z = -0.7) */}
      <group position={[-3.1, 0, -0.7]}>
        {/* Tabletop */}
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.04, 1.15]} />
          <meshStandardMaterial color="#3b2214" roughness={0.6} />
        </mesh>
        {/* Legs */}
        {[
          [-0.46, 0.37, -0.52],
          [0.46, 0.37, -0.52],
          [-0.46, 0.37, 0.52],
          [0.46, 0.37, 0.52],
        ].map(([lx, ly, lz], li) => (
          <mesh key={`d2-leg-${li}`} position={[lx, ly, lz]} castShadow>
            <boxGeometry args={[0.04, 0.74, 0.04]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        ))}

        {/* Large "ANT ESPORTS" Style Mousepad */}
        <mesh position={[0.08, 0.762, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.48, 0.82]} />
          <meshStandardMaterial color="#09090b" roughness={0.8} />
        </mesh>

        {/* OPEN LAPTOP WITH CODE EDITOR SCREEN GLOW */}
        <group position={[0.05, 0.76, -0.1]}>
          {/* Laptop Base & Keyboard */}
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.26, 0.018, 0.38]} />
            <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[-0.01, 0.02, 0]}>
            <boxGeometry args={[0.18, 0.005, 0.34]} />
            <meshStandardMaterial color="#09090b" roughness={0.5} />
          </mesh>
          {/* Laptop Screen Lid angled up ~105 degrees */}
          <group position={[-0.12, 0.015, 0]} rotation={[0, 0, 1.82]}>
            <mesh position={[0.13, 0.008, 0]}>
              <boxGeometry args={[0.26, 0.012, 0.38]} />
              <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Glowing Code Editor Screen */}
            <mesh position={[0.13, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.34, 0.22]} />
              <meshBasicMaterial color="#064e3b" />
            </mesh>
          </group>
        </group>

        {/* Gaming Mouse */}
        <mesh position={[0.12, 0.775, 0.24]}>
          <boxGeometry args={[0.065, 0.028, 0.11]} />
          <meshStandardMaterial color="#18181b" roughness={0.2} />
        </mesh>

        {/* Gaming Controller / Gamepad */}
        <group position={[-0.15, 0.775, 0.22]} rotation={[0, 0.2, 0]}>
          <mesh>
            <boxGeometry args={[0.14, 0.03, 0.09]} />
            <meshStandardMaterial color="#27272a" roughness={0.4} />
          </mesh>
          <mesh position={[-0.04, 0.02, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.015, 8]} />
            <meshStandardMaterial color="#09090b" />
          </mesh>
        </group>

        {/* Tall Red Plastic Water Bottle */}
        <group position={[-0.32, 0.88, -0.38]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.28, 12]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 12]} />
            <meshStandardMaterial color="#ef4444" roughness={0.2} />
          </mesh>
        </group>

        {/* White Desk Lamp with Goose Neck */}
        <group position={[-0.35, 0.76, 0.38]}>
          <mesh position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.03, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0.06, 0.22, -0.05]} rotation={[0.4, 0, -0.3]}>
            <cylinderGeometry args={[0.01, 0.01, 0.38, 8]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.9} />
          </mesh>
          <mesh position={[0.12, 0.38, -0.1]} rotation={[0.6, 0, -0.4]}>
            <coneGeometry args={[0.07, 0.12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        </group>

        {/* Orange Laundry / Storage basket under desk */}
        <mesh position={[0.08, 0.25, 0.05]} castShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.5, 12]} />
          <meshStandardMaterial color="#ea580c" roughness={0.8} />
        </mesh>
      </group>

      {/* DESK 3 (Towards Entrance, Z = +0.8) */}
      <group position={[-3.1, 0, 0.8]}>
        {/* Tabletop */}
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.04, 1.15]} />
          <meshStandardMaterial color="#3b2214" roughness={0.6} />
        </mesh>
        {/* Legs */}
        {[
          [-0.46, 0.37, -0.52],
          [0.46, 0.37, -0.52],
          [-0.46, 0.37, 0.52],
          [0.46, 0.37, 0.52],
        ].map(([lx, ly, lz], li) => (
          <mesh key={`d3-leg-${li}`} position={[lx, ly, lz]} castShadow>
            <boxGeometry args={[0.04, 0.74, 0.04]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        ))}

        {/* Stainless Steel Tumbler / Flask */}
        <mesh position={[-0.2, 0.88, 0.32]}>
          <cylinderGeometry args={[0.04, 0.035, 0.26, 12]} />
          <meshStandardMaterial color="#e4e4e7" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Hand Sanitizer Pump Bottle */}
        <mesh position={[-0.32, 0.82, 0.15]}>
          <boxGeometry args={[0.05, 0.12, 0.06]} />
          <meshStandardMaterial color="#10b981" roughness={0.3} />
        </mesh>
        {/* Notebook & Paper Sheets */}
        <mesh position={[0.08, 0.765, -0.1]}>
          <boxGeometry args={[0.26, 0.015, 0.32]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
      </group>

      {/* DESK 4 (Front Window Wall Study Desk for 4th Chair, X = -0.7, Z = -3.7) */}
      <group position={[-0.7, 0, -3.7]}>
        {/* Tabletop: Dark Brown Wood */}
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.04, 0.75]} />
          <meshStandardMaterial color="#3b2214" roughness={0.6} />
        </mesh>
        {/* 4 Black Metal Legs */}
        {[
          [-0.52, 0.37, -0.32],
          [0.52, 0.37, -0.32],
          [-0.52, 0.37, 0.32],
          [0.52, 0.37, 0.32],
        ].map(([lx, ly, lz], li) => (
          <mesh key={`d4-leg-${li}`} position={[lx, ly, lz]} castShadow>
            <boxGeometry args={[0.04, 0.74, 0.04]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        ))}

        {/* Desk 4 Props: Open Study Notebook, Blue Pen, Ceramic Coffee Mug, Table Clock */}
        <mesh position={[-0.1, 0.765, 0.05]} rotation={[0, -0.06, 0]}>
          <boxGeometry args={[0.26, 0.015, 0.34]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
        <mesh position={[0.1, 0.775, 0.05]} rotation={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
        <group position={[0.32, 0.81, -0.1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.042, 0.038, 0.1, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0.048, 0, 0]}>
            <boxGeometry args={[0.02, 0.05, 0.02]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
        </group>
        <mesh position={[-0.38, 0.79, -0.15]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.08, 0.08, 0.04]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 10. MASSIVE WALL-MOUNTED STORAGE SHELVES (Left Wall, Y = 2.2) */}
      {/* ============================================================== */}
      <group position={[-3.58, 2.2, -0.8]}>
        {/* Outer Dark Wooden Frame (3 sections wide, 2 tiers high) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.88, 3.8]} />
          <meshStandardMaterial color="#1c120c" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Shelf Horizontal Divider (Middle) */}
        <mesh position={[0.01, 0, 0]}>
          <boxGeometry args={[0.34, 0.03, 3.76]} />
          <meshStandardMaterial color="#2c1a11" roughness={0.65} />
        </mesh>
        {/* Shelf Vertical Dividers (Separates into 3 big bays) */}
        <mesh position={[0.01, 0, -0.63]}>
          <boxGeometry args={[0.34, 0.84, 0.03]} />
          <meshStandardMaterial color="#2c1a11" roughness={0.65} />
        </mesh>
        <mesh position={[0.01, 0, 0.63]}>
          <boxGeometry args={[0.34, 0.84, 0.03]} />
          <meshStandardMaterial color="#2c1a11" roughness={0.65} />
        </mesh>

        {/* SHELF CONTENTS (Books, Toiletries, Protein Powder, Teddy Bear!) */}
        {/* Right Section Upper: Big Protein Powder Tub ("YES PROTEIN 25g") */}
        <group position={[0.06, 0.22, 1.25]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.24, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.125, 0]}>
            <cylinderGeometry args={[0.092, 0.092, 0.03, 16]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
        </group>
        {/* Right Section Upper: Purple Chocos Cereal Box */}
        <mesh position={[0.06, 0.22, 1.6]} castShadow>
          <boxGeometry args={[0.1, 0.26, 0.18]} />
          <meshStandardMaterial color="#581c87" roughness={0.8} />
        </mesh>

        {/* Right Section Lower: Row of Deodorant / Spray Bottles */}
        {[-0.14, -0.07, 0, 0.07, 0.14].map((sz, si) => (
          <mesh key={`spray-${si}`} position={[0.06, -0.25, 1.35 + sz]}>
            <cylinderGeometry args={[0.022, 0.022, 0.16, 10]} />
            <meshStandardMaterial
              color={si % 2 === 0 ? '#09090b' : '#1e3a8a'}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        ))}

        {/* Middle Section Upper: Cute Brown Teddy Bear! */}
        <group position={[0.06, 0.2, 0]}>
          {/* Bear Body */}
          <mesh castShadow>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#92400e" roughness={0.95} />
          </mesh>
          {/* Bear Head */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color="#92400e" roughness={0.95} />
          </mesh>
          {/* Bear Ears */}
          <mesh position={[0, 0.18, 0.05]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 0.18, -0.05]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>

        {/* Middle Section Lower: Textbooks & Notebooks stack */}
        <group position={[0.06, -0.26, -0.15]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.2, 0.08, 0.28]} />
            <meshStandardMaterial color="#0284c7" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.26]} />
            <meshStandardMaterial color="#16a34a" roughness={0.7} />
          </mesh>
          {/* Nivea / Lotion Pump bottle */}
          <mesh position={[0, 0.05, 0.28]}>
            <cylinderGeometry args={[0.03, 0.03, 0.15, 10]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
          </mesh>
        </group>

        {/* Left Section: Plastic Storage Boxes & Containers */}
        <mesh position={[0.06, -0.26, -1.3]}>
          <boxGeometry args={[0.18, 0.14, 0.25]} />
          <meshStandardMaterial color="#fef08a" roughness={0.4} />
        </mesh>
        <mesh position={[0.06, 0.18, -1.3]}>
          <boxGeometry args={[0.18, 0.12, 0.22]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
        </mesh>

        {/* TOP OF SHELVES: Water jug, dish soap, spray */}
        {/* Big 5-Liter Blue/Grey Water Jug */}
        <group position={[0.02, 0.65, 0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.38, 14]} />
            <meshStandardMaterial color="#64748b" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.06, 10]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
        </group>
        {/* Yellow Dish Soap Bottle */}
        <mesh position={[0.02, 0.56, 1.1]}>
          <cylinderGeometry args={[0.035, 0.04, 0.22, 10]} />
          <meshStandardMaterial color="#facc15" roughness={0.3} />
        </mesh>
        {/* Aerosol Can */}
        <mesh position={[0.02, 0.58, 1.6]}>
          <cylinderGeometry args={[0.03, 0.03, 0.25, 10]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </mesh>
      </group>

      {/* Wall Switchboards & Yellow Sticky Notes below shelves */}
      <group position={[-3.78, 1.4, -0.7]}>
        {/* Switchboard 1 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.14, 0.28]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        {/* Switchboard 2 */}
        <mesh position={[0, 0, 1.1]}>
          <boxGeometry args={[0.02, 0.14, 0.24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        {/* Yellow Sticky Notes on the Wall */}
        {[-0.45, -0.32, -0.19].map((ny, idx) => (
          <mesh key={`note-${idx}`} position={[0.015, 0.08, ny]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.08, 0.08]} />
            <meshBasicMaterial color="#fde047" />
          </mesh>
        ))}
      </group>

      {/* ============================================================== */}
      {/* 11. INTERACTIVE WHITEBOARD (Empty Back Wall, X = -0.5, Z = 4.14) */}
      {/* ============================================================== */}
      <InteractiveWhiteboard
        strokes={whiteboardStrokes}
        whiteboardUser={whiteboardUser}
        currentSocketId={currentSocketId}
        onOpenWhiteboard={onOpenWhiteboard}
        isCursorFree={isCursorFree}
        position={[-0.5, 1.85, 4.14]}
        rotation={[0, Math.PI, 0]}
        scale={[0.75, 0.75, 0.75]}
        width={2.2}
        height={1.3}
      />

      {/* ============================================================== */}
      {/* 12. FOUR STUDY CHAIRS (Interactive Click-To-Sit)               */}
      {/* ============================================================== */}
      {HOSTEL_SEAT_POSITIONS.slice(0, 4).map((seat, idx) => {
        const isHovered = hoveredSeatId === seat.id;
        const isOccupied = !!occupiedSeatIds[seat.id];
        const isCurrent = currentSeatId === seat.id;

        // Chair colors from photo: Yellow chair, Black mesh chair, Blue chair, White plastic chair
        const chairColor = idx === 1 ? '#eab308' : idx === 2 ? '#18181b' : idx === 3 ? '#0369a1' : '#f8fafc';

        return (
          <group
            key={seat.id}
            position={[seat.position[0], 0, seat.position[2]]}
            rotation={[0, seat.rotation, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSeatSelect(seat);
            }}
          >
            {/* 4 Metal Legs */}
            {[
              [-0.18, 0.22, -0.18],
              [0.18, 0.22, -0.18],
              [-0.18, 0.22, 0.18],
              [0.18, 0.22, 0.18],
            ].map(([cx, cy, cz], ci) => (
              <mesh key={`chair-leg-${ci}`} position={[cx, cy, cz]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.44, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
            ))}

            {/* Chair Seat Cushion */}
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.42, 0.05, 0.42]} />
              <meshStandardMaterial
                color={isCurrent ? '#10b981' : isHovered ? '#60a5fa' : isOccupied ? '#ef4444' : chairColor}
                roughness={0.7}
              />
            </mesh>

            {/* Chair Backrest */}
            <mesh position={[0, 0.72, -0.18]} castShadow>
              <boxGeometry args={[0.38, 0.42, 0.04]} />
              <meshStandardMaterial
                color={isCurrent ? '#10b981' : isHovered ? '#60a5fa' : isOccupied ? '#ef4444' : chairColor}
                roughness={0.7}
              />
            </mesh>

            {/* Jacket draped over Chair 1 */}
            {idx === 1 && (
              <mesh position={[0, 0.65, -0.22]}>
                <boxGeometry args={[0.42, 0.45, 0.08]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ============================================================== */}
      {/* 13. BED EDGE SITTING TARGETS (Lower Bunk Beds 1 & 2)           */}
      {/* ============================================================== */}
      {HOSTEL_SEAT_POSITIONS.slice(4).map((seat) => {
        const isHovered = hoveredSeatId === seat.id;
        const isOccupied = !!occupiedSeatIds[seat.id];
        const isCurrent = currentSeatId === seat.id;

        return (
          <mesh
            key={seat.id}
            position={[seat.position[0], 0.55, seat.position[2]]}
            onClick={(e) => {
              e.stopPropagation();
              onSeatSelect(seat);
            }}
          >
            <boxGeometry args={[0.55, 0.08, 0.55]} />
            <meshStandardMaterial
              color={isCurrent ? '#10b981' : isHovered ? '#60a5fa' : isOccupied ? '#ef4444' : '#cbd5e1'}
              transparent
              opacity={isHovered || isCurrent || isOccupied ? 0.7 : 0.0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
