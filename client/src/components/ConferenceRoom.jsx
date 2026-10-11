import React from 'react';
import * as THREE from 'three';
import { PresentationScreen } from './PresentationScreen';

/**
 * Modern Executive Boardroom:
 * - Medium Slate-Grey Perimeter Walls (#64748b - clean, refined)
 * - Warm Chocolate Brown Hardwood & Plush Espresso Conference Rug
 * - High-Intensity Daylight Recessed LED Matrix (Well-Lit)
 * - Rich Decor Items:
 *   * Laptops & Open Notebooks on the Conference Table
 *   * Coffee Mugs & Water Carafes
 *   * Executive Credenza & Coffee Espresso Station in Southeast Corner
 *   * Side Lounge Leather Armchairs & Low Coffee Table in North-East Area
 *   * Modern Bookshelf with Binders & Sculptures
 *   * Water Cooler Dispenser & Recycle Cans
 *   * Office Flipchart & Wall Clock & Framed Art Pieces
 *   * Planter Boxes & Potted Fiddle Leaf Trees
 * - 8 Executive Swivel Chairs with Click-to-Sit (Center crosshair raycast clickable)
 * - 85" Ultra-Bright Presentation TV Wall & Collaborative Whiteboard
 */

export const SEAT_POSITIONS = [
  // West side of table (facing +X towards table center)
  { id: 'seat-1', position: [-2.2, 0.45, -2.1], rotation: Math.PI / 2, label: 'Seat 1' },
  { id: 'seat-2', position: [-2.2, 0.45, -0.7], rotation: Math.PI / 2, label: 'Seat 2' },
  { id: 'seat-3', position: [-2.2, 0.45, 0.7], rotation: Math.PI / 2, label: 'Seat 3' },
  { id: 'seat-4', position: [-2.2, 0.45, 2.1], rotation: Math.PI / 2, label: 'Seat 4' },
  // East side of table (facing -X towards table center)
  { id: 'seat-5', position: [2.2, 0.45, -2.1], rotation: -Math.PI / 2, label: 'Seat 5' },
  { id: 'seat-6', position: [2.2, 0.45, -0.7], rotation: -Math.PI / 2, label: 'Seat 6' },
  { id: 'seat-7', position: [2.2, 0.45, 0.7], rotation: -Math.PI / 2, label: 'Seat 7' },
  { id: 'seat-8', position: [2.2, 0.45, 2.1], rotation: -Math.PI / 2, label: 'Seat 8' },
];

export function ConferenceRoom({
  onSeatSelect,
  currentSeatId,
  isCursorFree = false,
  screenStream = null,
  presenterName = ''
}) {
  const wallColor = '#64748b';

  return (
    <group>
      {/* 1. Warm Brown Floor & Carpet */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color="#3e2723" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Plush Espresso Brown Conference Rug */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[10, 11]} />
        <meshStandardMaterial color="#4a2c17" roughness={0.8} />
      </mesh>
      {/* Golden Bronze Border Stripe on Rug */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[5.0, 5.15, 4]} />
        <meshStandardMaterial color="#d97706" roughness={0.4} opacity={0.65} transparent />
      </mesh>

      {/* Clean Neutral Ceiling Enclosure */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>

      {/* 2. Medium Slate Grey Architectural Walls */}
      {/* South Wall (Back) */}
      <mesh position={[0, 4, 12]} receiveShadow>
        <boxGeometry args={[26, 8, 0.4]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* North Wall (Front with TV) */}
      <mesh position={[0, 4, -12]} receiveShadow>
        <boxGeometry args={[26, 8, 0.4]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* Acoustic Walnut Wood Slat Feature Wall Behind TV */}
      <mesh position={[0, 4, -11.75]}>
        <boxGeometry args={[12, 6.5, 0.08]} />
        <meshStandardMaterial color="#5c381e" roughness={0.5} />
      </mesh>

      {/* West Wall (Left, Whiteboard Wall) */}
      <mesh position={[-12, 4, 0]} receiveShadow>
        <boxGeometry args={[0.4, 8, 26]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* East Wall (Right, Perimeter Wall with Recessed Window) */}
      <group position={[12, 4, 0]}>
        <mesh position={[0, 2.7, 0]}>
          <boxGeometry args={[0.4, 2.6, 26]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -2.7, 0]}>
          <boxGeometry args={[0.4, 2.6, 26]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, -11]}>
          <boxGeometry args={[0.4, 3.2, 4]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 11]}>
          <boxGeometry args={[0.4, 3.2, 4]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>

        {/* Scenic Sky Blue Daylight Horizon outside window */}
        <mesh position={[0.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[18, 5]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Window Mullions */}
        {[-6, -2, 2, 6].map((offset) => (
          <mesh key={offset} position={[0.05, 0, offset]}>
            <boxGeometry args={[0.12, 3.2, 0.12]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* 3. Executive Conference Table */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.12, 6.8]} />
          <meshStandardMaterial color="#3b2011" roughness={0.25} metalness={0.1} />
        </mesh>

        {/* Center Cable Channel */}
        <mesh position={[0, 1.165, 0]}>
          <boxGeometry args={[0.6, 0.02, 3.6]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Table Legs */}
        {[-1.3, 1.3].map((x) =>
          [-2.6, 2.6].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.55, z]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 1.1, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
            </mesh>
          ))
        )}

        {/* TABLETOP ACCESSORIES: Laptops, Notebooks & Coffee Mugs */}
        <group position={[-0.9, 1.18, -1.2]} rotation={[0, Math.PI / 12, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.015, 0.32]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.14, -0.15]} rotation={[-Math.PI / 8, 0, 0]}>
            <boxGeometry args={[0.42, 0.28, 0.01]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} />
          </mesh>
        </group>

        <group position={[0.9, 1.18, 1.2]} rotation={[0, -Math.PI / 1.1, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.015, 0.32]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.14, -0.15]} rotation={[-Math.PI / 8, 0, 0]}>
            <boxGeometry args={[0.42, 0.28, 0.01]} />
            <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.3} />
          </mesh>
        </group>

        {/* Notebooks & Pens */}
        <group position={[-0.8, 1.17, 0.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.02, 0.4]} />
            <meshStandardMaterial color="#0284c7" roughness={0.6} />
          </mesh>
          <mesh position={[0.18, 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 0.22, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.7} />
          </mesh>
        </group>

        {/* Ceramic Coffee Mugs */}
        <group position={[-0.8, 1.22, -0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.11, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        </group>
        <group position={[0.8, 1.22, -1.8]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.11, 16]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </mesh>
        </group>
        {/* Glass Water Carafe */}
        <group position={[0, 1.26, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.26, 16]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.6} roughness={0.1} />
          </mesh>
        </group>
      </group>

      {/* 4. Eight Interactive Executive Chairs */}
      {SEAT_POSITIONS.map((seat) => (
        <ConferenceChair
          key={seat.id}
          seat={seat}
          isOccupied={currentSeatId === seat.id}
          isCursorFree={isCursorFree}
          onSelect={() => onSeatSelect && onSeatSelect(seat)}
        />
      ))}

      {/* 5. 85" Ultra-Bright Presentation TV Wall */}
      <PresentationScreen
        screenStream={screenStream}
        presenterName={presenterName}
      />

      {/* 6. Collaborative Whiteboard (West Wall) */}
      <group position={[-11.75, 3.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[7.8, 3.8, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[7.6, 3.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.02} />
        </mesh>
        <mesh position={[0, -1.95, 0.15]}>
          <boxGeometry args={[5.0, 0.08, 0.25]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
      </group>

      {/* 7. NEW ROOM FILLER ITEMS (Breakout Lounge, Sideboards, Credenza, Flipchart) */}
      
      {/* Breakout Lounge in North-East Area (Two Armchairs + Round Coffee Table) */}
      <group position={[7.5, 0, -8.5]}>
        {/* Round Glass Coffee Table */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.05, 24]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.1} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.44, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.04, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        {/* Plant bowl on coffee table */}
        <mesh position={[0, 0.52, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>

        {/* Lounge Leather Armchair 1 */}
        <group position={[-1.4, 0, 0]} rotation={[0, Math.PI / 3, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[0.85, 0.35, 0.85]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.8, -0.35]} castShadow>
            <boxGeometry args={[0.85, 0.6, 0.2]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
        </group>

        {/* Lounge Leather Armchair 2 */}
        <group position={[1.4, 0, 0]} rotation={[0, -Math.PI / 3, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[0.85, 0.35, 0.85]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.8, -0.35]} castShadow>
            <boxGeometry args={[0.85, 0.6, 0.2]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Coffee Credenza & Espresso Station (South-East Corner) */}
      <group position={[8.5, 0, 10.5]}>
        {/* Credenza Cabinet */}
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 1.1, 1.1]} />
          <meshStandardMaterial color="#2d1b10" roughness={0.4} />
        </mesh>
        {/* Espresso Coffee Machine */}
        <group position={[-0.8, 1.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.6, 0.55]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Chrome steam wand */}
          <mesh position={[0.25, -0.15, 0.2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
          </mesh>
        </group>
        {/* Paper cups stack */}
        <group position={[0.2, 1.25, 0.1]}>
          <cylinderGeometry args={[0.07, 0.05, 0.35, 12]} />
          <meshStandardMaterial color="#f8fafc" />
        </group>
      </group>

      {/* Office Flipchart Easel in North-West Corner */}
      <group position={[-8.5, 0, -8.5]} rotation={[0, Math.PI / 4, 0]}>
        {/* Tripod Legs */}
        <mesh position={[-0.35, 0.9, -0.2]} rotation={[0.1, 0, -0.1]}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        <mesh position={[0.35, 0.9, -0.2]} rotation={[0.1, 0, 0.1]}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.9, 0.3]} rotation={[-0.15, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {/* Flipchart Paper Board */}
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[0.95, 1.3, 0.04]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
      </group>

      {/* Executive Bookshelf against South-West Wall */}
      <group position={[-9.5, 2.5, 10.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.6, 4.8, 0.8]} />
          <meshStandardMaterial color="#2d1b10" roughness={0.5} />
        </mesh>
        {[-1.2, 0, 1.2].map((yOffset, i) => (
          <group key={i} position={[0, yOffset, 0.1]}>
            <mesh position={[-0.8, 0, 0]}>
              <boxGeometry args={[0.5, 0.7, 0.4]} />
              <meshStandardMaterial color="#1e3a8a" />
            </mesh>
            <mesh position={[-0.2, 0, 0]}>
              <boxGeometry args={[0.4, 0.65, 0.4]} />
              <meshStandardMaterial color="#b91c1c" />
            </mesh>
            <mesh position={[0.4, 0, 0]}>
              <boxGeometry args={[0.6, 0.75, 0.4]} />
              <meshStandardMaterial color="#047857" />
            </mesh>
            <mesh position={[1.1, -0.1, 0]}>
              <dodecahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Office Water Cooler Dispenser in South Area */}
      <group position={[-4.5, 0, 10.8]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.65, 1.6, 0.65]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.6, 16]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.65} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.1, 0.35]}>
          <boxGeometry args={[0.25, 0.1, 0.1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Modern Wall Clock on Whiteboard Wall */}
      <group position={[-11.75, 6.2, -4.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.65, 0.65, 0.08, 32]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.58, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Framed Wall Art on South Wall */}
      <group position={[0, 4.8, 11.75]}>
        <mesh castShadow>
          <boxGeometry args={[3.2, 2.0, 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[2.9, 1.7]} />
          <meshBasicMaterial color="#1e3a8a" />
        </mesh>
      </group>

      {/* Second Framed Art on West Wall */}
      <group position={[-11.75, 4.5, 6.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.6, 1.8, 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[2.4, 1.6]} />
          <meshBasicMaterial color="#047857" />
        </mesh>
      </group>

      {/* Trash Cans */}
      <group position={[-1.8, 0.3, 3.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.22, 0.16, 0.6, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
      </group>

      {/* Corner Indoor Potted Plants */}
      <group position={[-9.5, 0, -9.5]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.4, 1.2, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <dodecahedronGeometry args={[1.0, 1]} />
          <meshStandardMaterial color="#16a34a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.7, 0]} castShadow>
          <dodecahedronGeometry args={[0.75, 1]} />
          <meshStandardMaterial color="#22c55e" roughness={0.6} />
        </mesh>
      </group>

      {/* Second Potted Plant near Window */}
      <group position={[10.2, 0, -2.5]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.3, 1.0, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <dodecahedronGeometry args={[0.85, 1]} />
          <meshStandardMaterial color="#15803d" roughness={0.6} />
        </mesh>
      </group>

      {/* 8. High-Power LED Ceiling Recessed Light Matrix */}
      <group position={[0, 7.8, 0]}>
        {[-3, 3].map((x) =>
          [-4, 0, 4].map((z) => (
            <group key={`${x}-${z}`} position={[x, 0, z]}>
              <mesh>
                <boxGeometry args={[2.2, 0.05, 2.2]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={1.8}
                />
              </mesh>
              <pointLight intensity={45} distance={16} color="#ffffff" decay={1.8} />
            </group>
          ))
        )}
      </group>
    </group>
  );
}

/**
 * Interactive Ergonomic Conference Chair
 */
function ConferenceChair({ seat, isOccupied, onSelect, isCursorFree = false }) {
  const [hovered, setHovered] = React.useState(false);
  const groupRef = React.useRef();

  React.useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData = { onSelect };
      groupRef.current.traverse((child) => {
        child.userData = { onSelect };
      });
    }
  }, [onSelect]);

  return (
    <group
      ref={groupRef}
      position={seat.position}
      rotation={[0, seat.rotation, 0]}
      onClick={(e) => {
        // If not in cursor free mode, do not trigger from mouse coordinates;
        // LocalPlayer's center raycast handles it!
        if (!isCursorFree) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        if (!isCursorFree) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        if (!isCursorFree) return;
        setHovered(false);
      }}
    >
      {/* Seat Cushion in Executive Leather */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.82, 0.12, 0.82]} />
        <meshStandardMaterial
          color={isOccupied ? '#2563eb' : hovered ? '#0284c7' : '#2d241e'}
          roughness={0.4}
        />
      </mesh>

      {/* Ergonomic Backrest */}
      <mesh position={[0, 0.98, -0.38]} castShadow>
        <boxGeometry args={[0.78, 0.84, 0.1]} />
        <meshStandardMaterial
          color={isOccupied ? '#1d4ed8' : hovered ? '#0369a1' : '#1c1510'}
          roughness={0.4}
        />
      </mesh>

      {/* Metal Armrests */}
      <mesh position={[-0.43, 0.74, 0]} castShadow>
        <boxGeometry args={[0.08, 0.36, 0.6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh position={[0.43, 0.74, 0]} castShadow>
        <boxGeometry args={[0.08, 0.36, 0.6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>

      {/* Hydraulic Pole & Star Base */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.45, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.06, 5]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Floating Sit Indicator Beacon */}
      {!isOccupied && (
        <mesh position={[0, hovered ? 1.6 : 1.35, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 16]} />
          <meshBasicMaterial
            color={hovered ? '#38bdf8' : '#60a5fa'}
            transparent
            opacity={hovered ? 0.9 : 0.4}
          />
        </mesh>
      )}
    </group>
  );
}
