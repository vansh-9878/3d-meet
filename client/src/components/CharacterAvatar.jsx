import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarVideoHead } from './AvatarVideoHead';

export function CharacterAvatar({
  position = [0, 0, 0],
  rotation = 0,
  state = 'idle', // 'idle' | 'walking' | 'sitting' | 'jumping'
  avatarConfig = {},
  name = 'Participant',
  isSpeaking = false,
  isLocal = false,
  hideModelInFpp = false,
  videoStream = null,
  isCamActive = false,
  camZoom = 1.2,
  activeEmoji = null
}) {
  const groupRef = useRef();
  const rootPelvisRef = useRef();
  const torsoRef = useRef();
  const chestRef = useRef();
  const headRef = useRef();

  // Limbs
  const leftUpperArmRef = useRef();
  const leftForearmRef = useRef();
  const rightUpperArmRef = useRef();
  const rightForearmRef = useRef();

  const leftThighRef = useRef();
  const leftShinRef = useRef();
  const rightThighRef = useRef();
  const rightShinRef = useRef();

  const {
    suitColor = '#1e3a8a',
    shirtColor = '#ffffff',
    tieColor = '#dc2626',
    pantsColor = '#172554',
    skinColor = '#f3d2b8',
    hairColor = '#3a2312',
    hairStyle = 'executive', // 'executive' | 'crop' | 'bob'
    accessory = 'glasses', // 'glasses' | 'none'
    shoeColor = '#1e1b18'
  } = avatarConfig;

  // Custom palette materials with soft specular roughness
  const materials = useMemo(() => {
    return {
      skin: new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.62,
        metalness: 0.02
      }),
      hair: new THREE.MeshStandardMaterial({
        color: hairColor,
        roughness: 0.72,
        metalness: 0.08
      }),
      suit: new THREE.MeshStandardMaterial({
        color: suitColor,
        roughness: 0.65,
        metalness: 0.1
      }),
      suitLapel: new THREE.MeshStandardMaterial({
        color: new THREE.Color(suitColor).clone().multiplyScalar(0.85),
        roughness: 0.55,
        metalness: 0.15
      }),
      shirt: new THREE.MeshStandardMaterial({
        color: shirtColor,
        roughness: 0.45,
        metalness: 0.05
      }),
      tie: new THREE.MeshStandardMaterial({
        color: tieColor,
        roughness: 0.4,
        metalness: 0.2
      }),
      pants: new THREE.MeshStandardMaterial({
        color: pantsColor,
        roughness: 0.7,
        metalness: 0.05
      }),
      shoes: new THREE.MeshStandardMaterial({
        color: shoeColor,
        roughness: 0.35,
        metalness: 0.25
      }),
      shoeSole: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.8
      }),
      eyesWhite: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.15
      }),
      iris: new THREE.MeshStandardMaterial({
        color: '#2b1d0c', // Warm dark hazel/brown iris
        roughness: 0.2
      }),
      pupils: new THREE.MeshStandardMaterial({
        color: '#0a0a0a',
        roughness: 0.05
      }),
      eyelid: new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor).clone().multiplyScalar(0.92),
        roughness: 0.65
      }),
      eyebrows: new THREE.MeshStandardMaterial({
        color: new THREE.Color(hairColor).clone().multiplyScalar(0.75),
        roughness: 0.85
      }),
      lips: new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor).clone().lerp(new THREE.Color('#c25e68'), 0.38),
        roughness: 0.55
      }),
      goldAccent: new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        metalness: 0.85,
        roughness: 0.2
      }),
      glassesFrame: new THREE.MeshStandardMaterial({
        color: '#1e293b',
        metalness: 0.8,
        roughness: 0.25
      })
    };
  }, [suitColor, shirtColor, tieColor, pantsColor, skinColor, hairColor, shoeColor]);

  // Procedural Animation System: Coordinated limbs & natural breathing cycles
  useFrame((stateObj) => {
    if (hideModelInFpp) return;

    const time = stateObj.clock.getElapsedTime();

    if (state === 'walking') {
      const walkSpeed = 9.5;
      const t = time * walkSpeed;
      const legSwing = Math.sin(t) * 0.55;
      const armSwing = Math.sin(t) * 0.48;
      const bounce = Math.abs(Math.sin(t)) * 0.045;

      // Pelvis bobbing & slight rotation hip sway
      if (rootPelvisRef.current) {
        rootPelvisRef.current.position.y = 0.9 + bounce;
        rootPelvisRef.current.rotation.y = Math.sin(t) * 0.06;
      }

      // Torso counter-sway
      if (torsoRef.current) {
        torsoRef.current.rotation.y = -Math.sin(t) * 0.04;
        torsoRef.current.rotation.z = Math.cos(t) * 0.02;
      }

      // Head stability
      if (headRef.current) {
        headRef.current.position.y = 0.62 + bounce * 0.5;
        headRef.current.rotation.y = -Math.sin(t) * 0.02;
      }

      // Legs swing with knee flexion on back-swing
      if (leftThighRef.current) {
        leftThighRef.current.rotation.x = legSwing;
      }
      if (leftShinRef.current) {
        // Bend knee when leg moves backwards
        const kneeFlex = legSwing < 0 ? Math.abs(legSwing) * 0.85 : 0.05;
        leftShinRef.current.rotation.x = kneeFlex;
      }

      if (rightThighRef.current) {
        rightThighRef.current.rotation.x = -legSwing;
      }
      if (rightShinRef.current) {
        const kneeFlex = -legSwing < 0 ? Math.abs(legSwing) * 0.85 : 0.05;
        rightShinRef.current.rotation.x = kneeFlex;
      }

      // Arms counter-swing with slight elbow flexion
      if (leftUpperArmRef.current) {
        leftUpperArmRef.current.rotation.x = -armSwing;
        leftUpperArmRef.current.rotation.z = -0.12;
      }
      if (leftForearmRef.current) {
        leftForearmRef.current.rotation.x = armSwing < 0 ? 0.35 : 0.15;
      }

      if (rightUpperArmRef.current) {
        rightUpperArmRef.current.rotation.x = armSwing;
        rightUpperArmRef.current.rotation.z = 0.12;
      }
      if (rightForearmRef.current) {
        rightForearmRef.current.rotation.x = -armSwing < 0 ? 0.35 : 0.15;
      }
    } else if (state === 'sitting') {
      // Natural seated posture: hips placed, thighs forward at 90 deg, calves vertical
      if (rootPelvisRef.current) {
        rootPelvisRef.current.position.y = 0.52;
        rootPelvisRef.current.position.z = 0.08;
        rootPelvisRef.current.rotation.y = 0;
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.04; // slight relaxed lean
        torsoRef.current.rotation.y = 0;
        torsoRef.current.rotation.z = 0;
      }
      if (headRef.current) {
        headRef.current.position.y = 0.62 + Math.sin(time * 2) * 0.008;
      }

      // Thighs bent forward
      if (leftThighRef.current) {
        leftThighRef.current.rotation.x = -Math.PI / 2.05;
        leftThighRef.current.rotation.z = -0.06;
      }
      if (leftShinRef.current) {
        leftShinRef.current.rotation.x = Math.PI / 2.15;
      }

      if (rightThighRef.current) {
        rightThighRef.current.rotation.x = -Math.PI / 2.05;
        rightThighRef.current.rotation.z = 0.06;
      }
      if (rightShinRef.current) {
        rightShinRef.current.rotation.x = Math.PI / 2.15;
      }

      // Arms resting casually on conference table or lap
      if (leftUpperArmRef.current) {
        leftUpperArmRef.current.rotation.x = -0.55;
        leftUpperArmRef.current.rotation.z = -0.18;
      }
      if (leftForearmRef.current) {
        leftForearmRef.current.rotation.x = -0.45;
      }

      if (rightUpperArmRef.current) {
        rightUpperArmRef.current.rotation.x = -0.55;
        rightUpperArmRef.current.rotation.z = 0.18;
      }
      if (rightForearmRef.current) {
        rightForearmRef.current.rotation.x = -0.45;
      }
    } else {
      // Idle state with gentle breathing and relaxed shoulder movement
      const breath = Math.sin(time * 2.2);

      if (rootPelvisRef.current) {
        rootPelvisRef.current.position.y = THREE.MathUtils.lerp(rootPelvisRef.current.position.y, 0.9, 0.1);
        rootPelvisRef.current.position.z = 0;
        rootPelvisRef.current.rotation.y = THREE.MathUtils.lerp(rootPelvisRef.current.rotation.y, 0, 0.1);
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = breath * 0.015;
        torsoRef.current.rotation.y = THREE.MathUtils.lerp(torsoRef.current.rotation.y, 0, 0.1);
        torsoRef.current.rotation.z = THREE.MathUtils.lerp(torsoRef.current.rotation.z, 0, 0.1);
      }
      if (chestRef.current) {
        chestRef.current.scale.set(1 + breath * 0.015, 1 + breath * 0.01, 1 + breath * 0.02);
      }
      if (headRef.current) {
        headRef.current.position.y = 0.62 + breath * 0.012;
      }

      // Neutral standing legs
      if (leftThighRef.current) {
        leftThighRef.current.rotation.x = THREE.MathUtils.lerp(leftThighRef.current.rotation.x, 0, 0.12);
        leftThighRef.current.rotation.z = -0.04;
      }
      if (leftShinRef.current) {
        leftShinRef.current.rotation.x = THREE.MathUtils.lerp(leftShinRef.current.rotation.x, 0, 0.12);
      }

      if (rightThighRef.current) {
        rightThighRef.current.rotation.x = THREE.MathUtils.lerp(rightThighRef.current.rotation.x, 0, 0.12);
        rightThighRef.current.rotation.z = 0.04;
      }
      if (rightShinRef.current) {
        rightShinRef.current.rotation.x = THREE.MathUtils.lerp(rightShinRef.current.rotation.x, 0, 0.12);
      }

      // Relaxed arms hanging by side
      if (leftUpperArmRef.current) {
        leftUpperArmRef.current.rotation.x = THREE.MathUtils.lerp(leftUpperArmRef.current.rotation.x, 0.05, 0.12);
        leftUpperArmRef.current.rotation.z = -0.15 + breath * 0.01;
      }
      if (leftForearmRef.current) {
        leftForearmRef.current.rotation.x = THREE.MathUtils.lerp(leftForearmRef.current.rotation.x, 0.1, 0.12);
      }

      if (rightUpperArmRef.current) {
        rightUpperArmRef.current.rotation.x = THREE.MathUtils.lerp(rightUpperArmRef.current.rotation.x, 0.05, 0.12);
        rightUpperArmRef.current.rotation.z = 0.15 - breath * 0.01;
      }
      if (rightForearmRef.current) {
        rightForearmRef.current.rotation.x = THREE.MathUtils.lerp(rightForearmRef.current.rotation.x, 0.1, 0.12);
      }
    }
  });

  const avatarOffsetY = state === 'sitting' ? -0.15 : 0;

  return (
    <group
      position={[position[0], position[1] + avatarOffsetY, position[2]]}
      rotation={[0, rotation, 0]}
      ref={groupRef}
    >
      {/* 1. Floating User Identity Badge & Speaking Aura */}
      {(!isLocal || !hideModelInFpp) && (
        <group position={[0, state === 'sitting' ? 2.25 : 2.55, 0]}>
          <Html center distanceFactor={14}>
            <div className="flex flex-col items-center pointer-events-none select-none">
              {/* Floating 3D Emoji Speech Bubble (Displayed for 2-3 seconds) */}
              {activeEmoji && (
                <div className="relative mb-2 px-3 py-1 bg-white rounded-2xl shadow-2xl border-2 border-amber-400 text-3xl animate-bounce flex items-center justify-center transform -translate-y-1">
                  <span>{activeEmoji}</span>
                  {/* Bubble tail pointing down towards head */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r-2 border-b-2 border-amber-400 rotate-45" />
                </div>
              )}

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all duration-300 ${
                  isSpeaking
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse'
                    : isLocal
                    ? 'bg-blue-600 text-white border border-blue-400'
                    : 'bg-white text-gray-900 border border-gray-300'
                }`}
              >
                {isSpeaking && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                <span>{name}</span>
                {isLocal && <span className="text-[10px] text-blue-200">(You)</span>}
              </div>
              {state === 'sitting' && (
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded mt-0.5 border border-blue-200 shadow-sm">
                  Seated
                </span>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* 2. Stylized Human Character Geometry (Hidden in FPP) */}
      {!hideModelInFpp && (
        <group ref={rootPelvisRef} position={[0, 0.9, 0]}>
          {/* Hips & Pelvis Basin */}
          <mesh castShadow position={[0, 0, 0]} material={materials.pants}>
            <cylinderGeometry args={[0.22, 0.20, 0.18, 16]} />
          </mesh>

          {/* Belt & Buckle Accent */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.225, 0.225, 0.04, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.08, 0.22]} material={materials.goldAccent}>
            <boxGeometry args={[0.06, 0.045, 0.02]} />
          </mesh>

          {/* Upper Body (Torso, Chest, Shoulders, Head) */}
          <group ref={torsoRef} position={[0, 0.1, 0]}>
            {/* Midriff / Waist Section */}
            <mesh castShadow position={[0, 0.12, 0]} material={materials.suit}>
              <cylinderGeometry args={[0.25, 0.21, 0.24, 16]} />
            </mesh>

            {/* Chest & Shoulder Broadening */}
            <group ref={chestRef} position={[0, 0.32, 0]}>
              {/* Suit Blazer Main Body */}
              <mesh castShadow material={materials.suit}>
                <cylinderGeometry args={[0.28, 0.25, 0.28, 16]} />
              </mesh>

              {/* Crisp V-Neck Shirt Opening */}
              <mesh position={[0, 0.06, 0.14]} rotation={[0.15, 0, 0]} material={materials.shirt}>
                <boxGeometry args={[0.18, 0.24, 0.08]} />
              </mesh>

              {/* Silk Necktie with Knot */}
              <group position={[0, 0.04, 0.19]}>
                {/* Tie Knot */}
                <mesh position={[0, 0.08, 0]} material={materials.tie}>
                  <cylinderGeometry args={[0.035, 0.022, 0.05, 8]} />
                </mesh>
                {/* Tie Body */}
                <mesh position={[0, -0.06, -0.01]} rotation={[-0.05, 0, 0]} material={materials.tie}>
                  <boxGeometry args={[0.055, 0.22, 0.018]} />
                </mesh>
              </group>

              {/* Tailored Blazer Lapels (Left & Right) */}
              <mesh
                position={[-0.10, 0.05, 0.18]}
                rotation={[0.1, 0.25, -0.18]}
                material={materials.suitLapel}
                castShadow
              >
                <boxGeometry args={[0.09, 0.28, 0.04]} />
              </mesh>
              <mesh
                position={[0.10, 0.05, 0.18]}
                rotation={[0.1, -0.25, 0.18]}
                material={materials.suitLapel}
                castShadow
              >
                <boxGeometry args={[0.09, 0.28, 0.04]} />
              </mesh>

              {/* Suit Pocket Square (Left Breast) */}
              <group position={[-0.15, 0.06, 0.18]} rotation={[0.08, 0.2, 0]}>
                <mesh material={materials.suitLapel}>
                  <boxGeometry args={[0.07, 0.015, 0.02]} />
                </mesh>
                <mesh position={[0, 0.016, 0]} material={materials.shirt}>
                  <boxGeometry args={[0.055, 0.022, 0.012]} />
                </mesh>
              </group>

              {/* Blazer Metallic Buttons */}
              <mesh position={[0, -0.08, 0.22]} material={materials.goldAccent}>
                <sphereGeometry args={[0.015, 8, 8]} />
              </mesh>
              <mesh position={[0, -0.16, 0.20]} material={materials.goldAccent}>
                <sphereGeometry args={[0.015, 8, 8]} />
              </mesh>

              {/* Natural Shoulder Silhouette */}
              <mesh position={[-0.26, 0.08, 0]} material={materials.suit} castShadow>
                <sphereGeometry args={[0.075, 16, 16]} />
              </mesh>
              <mesh position={[0.26, 0.08, 0]} material={materials.suit} castShadow>
                <sphereGeometry args={[0.075, 16, 16]} />
              </mesh>
            </group>

            {/* Neck (Smoothly connects torso to head - removed when camera is ON) */}
            {!isCamActive && (
              <group position={[0, 0.50, 0]}>
                {/* Shirt Collar Rim */}
                <mesh position={[0, 0, 0]} material={materials.shirt}>
                  <cylinderGeometry args={[0.12, 0.13, 0.06, 16]} />
                </mesh>
                {/* Neck Column */}
                <mesh position={[0, 0.06, 0]} material={materials.skin} castShadow>
                  <cylinderGeometry args={[0.095, 0.105, 0.12, 16]} />
                </mesh>
              </group>
            )}

            {/* Head & Facial Features / Circular Video Texture Viewport */}
            <group ref={headRef} position={[0, isCamActive ? 0.54 : 0.62, 0]}>
              <AvatarVideoHead
                videoStream={videoStream}
                isCamActive={isCamActive}
                isLocal={isLocal}
                zoom={camZoom}
                initials={name ? name.slice(0, 2).toUpperCase() : 'ME'}
                materials={materials}
                hairStyle={hairStyle}
                accessory={accessory}
              />
            </group>

            {/* Articulated Left Arm (Shoulder -> Elbow -> Forearm -> Hand) */}
            <group ref={leftUpperArmRef} position={[-0.30, 0.38, 0]}>
              {/* Upper Arm Bicep */}
              <mesh position={[0, -0.14, 0]} material={materials.suit} castShadow>
                <cylinderGeometry args={[0.065, 0.058, 0.28, 12]} />
              </mesh>
              {/* Elbow Joint Sphere */}
              <mesh position={[0, -0.28, 0]} material={materials.suit}>
                <sphereGeometry args={[0.058, 10, 10]} />
              </mesh>

              {/* Forearm & Wrist */}
              <group ref={leftForearmRef} position={[0, -0.28, 0]}>
                <mesh position={[0, -0.13, 0]} material={materials.suit} castShadow>
                  <cylinderGeometry args={[0.055, 0.048, 0.26, 12]} />
                </mesh>
                {/* White Shirt Cuff Peeking out */}
                <mesh position={[0, -0.25, 0]} material={materials.shirt}>
                  <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
                </mesh>

                {/* Sculpted Hand (Palm + Thumb + Defined Fingers) */}
                <group position={[0, -0.31, 0]}>
                  {/* Palm */}
                  <mesh material={materials.skin} castShadow>
                    <boxGeometry args={[0.065, 0.08, 0.032]} />
                  </mesh>
                  {/* Opposable Thumb */}
                  <mesh position={[0.038, 0.015, 0.01]} rotation={[0, 0, -0.45]} material={materials.skin}>
                    <boxGeometry args={[0.028, 0.05, 0.024]} />
                  </mesh>
                  {/* Finger Knuckle cluster */}
                  <mesh position={[0, -0.05, 0]} material={materials.skin}>
                    <boxGeometry args={[0.06, 0.035, 0.028]} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* Articulated Right Arm (Shoulder -> Elbow -> Forearm -> Hand) */}
            <group ref={rightUpperArmRef} position={[0.30, 0.38, 0]}>
              {/* Upper Arm Bicep */}
              <mesh position={[0, -0.14, 0]} material={materials.suit} castShadow>
                <cylinderGeometry args={[0.065, 0.058, 0.28, 12]} />
              </mesh>
              {/* Elbow Joint Sphere */}
              <mesh position={[0, -0.28, 0]} material={materials.suit}>
                <sphereGeometry args={[0.058, 10, 10]} />
              </mesh>

              {/* Forearm & Wrist */}
              <group ref={rightForearmRef} position={[0, -0.28, 0]}>
                <mesh position={[0, -0.13, 0]} material={materials.suit} castShadow>
                  <cylinderGeometry args={[0.055, 0.048, 0.26, 12]} />
                </mesh>
                {/* White Shirt Cuff Peeking out */}
                <mesh position={[0, -0.25, 0]} material={materials.shirt}>
                  <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
                </mesh>

                {/* Sculpted Hand (Palm + Thumb + Defined Fingers) */}
                <group position={[0, -0.31, 0]}>
                  {/* Palm */}
                  <mesh material={materials.skin} castShadow>
                    <boxGeometry args={[0.065, 0.08, 0.032]} />
                  </mesh>
                  {/* Opposable Thumb */}
                  <mesh position={[-0.038, 0.015, 0.01]} rotation={[0, 0, 0.45]} material={materials.skin}>
                    <boxGeometry args={[0.028, 0.05, 0.024]} />
                  </mesh>
                  {/* Finger Knuckle cluster */}
                  <mesh position={[0, -0.05, 0]} material={materials.skin}>
                    <boxGeometry args={[0.06, 0.035, 0.028]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>

          {/* Articulated Left Leg (Hip Socket -> Thigh -> Knee -> Shin -> Oxford Shoe) */}
          <group ref={leftThighRef} position={[-0.12, -0.08, 0]}>
            {/* Upper Thigh */}
            <mesh position={[0, -0.18, 0]} material={materials.pants} castShadow>
              <cylinderGeometry args={[0.095, 0.082, 0.36, 14]} />
            </mesh>
            {/* Knee Joint */}
            <mesh position={[0, -0.36, 0.01]} material={materials.pants}>
              <sphereGeometry args={[0.082, 12, 12]} />
            </mesh>

            {/* Lower Shin / Calf */}
            <group ref={leftShinRef} position={[0, -0.36, 0]}>
              <mesh position={[0, -0.20, 0]} material={materials.pants} castShadow>
                <cylinderGeometry args={[0.078, 0.068, 0.38, 14]} />
              </mesh>
              {/* Trouser Hem Cuff */}
              <mesh position={[0, -0.38, 0]} material={materials.pants}>
                <cylinderGeometry args={[0.074, 0.076, 0.04, 14]} />
              </mesh>

              {/* Oxford Dress Shoe */}
              <group position={[0, -0.42, 0.05]}>
                {/* Shoe Upper Leather */}
                <mesh position={[0, 0.03, 0.02]} material={materials.shoes} castShadow>
                  <boxGeometry args={[0.13, 0.08, 0.24]} />
                </mesh>
                {/* Tapered Toe Cap */}
                <mesh position={[0, 0.015, 0.11]} material={materials.shoes} castShadow>
                  <cylinderGeometry args={[0.06, 0.065, 0.06, 12]} rotation={[Math.PI / 2, 0, 0]} />
                </mesh>
                {/* Welt & Outer Sole */}
                <mesh position={[0, -0.02, 0.03]} material={materials.shoeSole}>
                  <boxGeometry args={[0.14, 0.03, 0.28]} />
                </mesh>
                {/* Heel Elevation */}
                <mesh position={[0, -0.02, -0.07]} material={materials.shoeSole}>
                  <boxGeometry args={[0.135, 0.045, 0.09]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* Articulated Right Leg (Hip Socket -> Thigh -> Knee -> Shin -> Oxford Shoe) */}
          <group ref={rightThighRef} position={[0.12, -0.08, 0]}>
            {/* Upper Thigh */}
            <mesh position={[0, -0.18, 0]} material={materials.pants} castShadow>
              <cylinderGeometry args={[0.095, 0.082, 0.36, 14]} />
            </mesh>
            {/* Knee Joint */}
            <mesh position={[0, -0.36, 0.01]} material={materials.pants}>
              <sphereGeometry args={[0.082, 12, 12]} />
            </mesh>

            {/* Lower Shin / Calf */}
            <group ref={rightShinRef} position={[0, -0.36, 0]}>
              <mesh position={[0, -0.20, 0]} material={materials.pants} castShadow>
                <cylinderGeometry args={[0.078, 0.068, 0.38, 14]} />
              </mesh>
              {/* Trouser Hem Cuff */}
              <mesh position={[0, -0.38, 0]} material={materials.pants}>
                <cylinderGeometry args={[0.074, 0.076, 0.04, 14]} />
              </mesh>

              {/* Oxford Dress Shoe */}
              <group position={[0, -0.42, 0.05]}>
                {/* Shoe Upper Leather */}
                <mesh position={[0, 0.03, 0.02]} material={materials.shoes} castShadow>
                  <boxGeometry args={[0.13, 0.08, 0.24]} />
                </mesh>
                {/* Tapered Toe Cap */}
                <mesh position={[0, 0.015, 0.11]} material={materials.shoes} castShadow>
                  <cylinderGeometry args={[0.06, 0.065, 0.06, 12]} rotation={[Math.PI / 2, 0, 0]} />
                </mesh>
                {/* Welt & Outer Sole */}
                <mesh position={[0, -0.02, 0.03]} material={materials.shoeSole}>
                  <boxGeometry args={[0.14, 0.03, 0.28]} />
                </mesh>
                {/* Heel Elevation */}
                <mesh position={[0, -0.02, -0.07]} material={materials.shoeSole}>
                  <boxGeometry args={[0.135, 0.045, 0.09]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      )}
    </group>
  );
}
