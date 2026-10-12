import React, { useRef, useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ProjectileSystem:
 * 1. Renders rapid 3D projectile trajectories (Tomato, Egg, Water Balloon)
 * 2. Spawns colored puddles on walls / floors that automatically clean up after 5-10 seconds
 * 3. Handles crosshair raycasting for hover effects over seats in Aim Mode
 * 4. Exposes throw(type) method for aiming and trajectory calculations
 */
export const ProjectileSystem = forwardRef(function ProjectileSystem({
  activeProjectiles = [],
  onProjectileImpact = () => {},
  puddles = [],
  onRemovePuddle = () => {},
  isCursorFree = false,
  viewMode = 'fpp',
  isSitting = false,
  onHoverSeat = () => {}
}, ref) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const centerPointer = useMemo(() => new THREE.Vector2(0, 0), []);

  // Expose throw calculation method to parent
  useImperativeHandle(ref, () => ({
    throw: (type) => {
      const origin = camera.position.clone();
      const direction = camera.getWorldDirection(new THREE.Vector3());
      const throwRaycaster = new THREE.Raycaster(origin, direction);
      const intersects = throwRaycaster.intersectObjects(scene.children, true);

      let hitType = 'environment';
      let hitPlayerId = null;
      let target = null;
      let hitNormal = [0, 1, 0];

      for (const hit of intersects) {
        if (hit.distance < 0.4) continue; // Skip camera near plane

        let curr = hit.object;
        let foundPlayerId = null;
        while (curr) {
          if (curr.userData && curr.userData.playerId) {
            foundPlayerId = curr.userData.playerId;
            break;
          }
          curr = curr.parent;
        }

        if (foundPlayerId) {
          hitType = 'player';
          hitPlayerId = foundPlayerId;
          target = hit.point.toArray();
          hitNormal = [0, 1, 0];
          break;
        }

        if (hit.point) {
          hitType = 'environment';
          target = hit.point.toArray();
          if (hit.face) {
            const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
            hitNormal = [worldNormal.x, worldNormal.y, worldNormal.z];
          }
          break;
        }
      }

      if (!target) {
        target = origin.clone().add(direction.clone().multiplyScalar(22)).toArray();
      }

      return {
        type,
        origin: origin.toArray(),
        target,
        hitType,
        hitPlayerId,
        hitNormal
      };
    }
  }));

  // Raycast from crosshair (0,0 NDC) every frame to detect if aiming at a chair
  useFrame(() => {
    // If in mouse free mode, presentation mode, or already sitting, do NOT hover seats!
    if (isCursorFree || viewMode === 'presentation' || isSitting) {
      onHoverSeat(null, null);
      return;
    }

    raycaster.setFromCamera(centerPointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let foundSeatId = null;
    let foundSeatOccupied = false;

    for (const hit of intersects) {
      if (hit.distance > 6.0) continue; // Maximum 6m reach for chair interaction
      let curr = hit.object;
      while (curr) {
        if (curr.userData && curr.userData.seatId) {
          foundSeatId = curr.userData.seatId;
          foundSeatOccupied = !!curr.userData.isOccupied;
          break;
        }
        curr = curr.parent;
      }
      if (foundSeatId) break;
    }

    onHoverSeat(foundSeatId, foundSeatOccupied);
  });

  return (
    <group>
      {/* 1. Flying Projectiles */}
      {activeProjectiles.map((proj) => (
        <FlyingProjectile
          key={proj.id}
          projectile={proj}
          onImpact={() => onProjectileImpact(proj)}
        />
      ))}

      {/* 2. Impact Puddles on Floor / Walls (Auto-removed in 5-10s) */}
      {puddles.map((puddle) => (
        <ImpactPuddle
          key={puddle.id}
          puddle={puddle}
          onExpire={() => onRemovePuddle(puddle.id)}
        />
      ))}
    </group>
  );
});

/**
 * Individual Flying Projectile
 */
function FlyingProjectile({ projectile, onImpact }) {
  const meshRef = useRef();
  const origin = useMemo(() => new THREE.Vector3(...projectile.origin), [projectile.origin]);
  const target = useMemo(() => new THREE.Vector3(...projectile.target), [projectile.target]);
  const startTime = useMemo(() => projectile.startTime || Date.now(), [projectile.startTime]);
  const duration = 0.22; // Quick, responsive 220ms flight time
  const hasImpacted = useRef(false);

  useFrame(() => {
    if (!meshRef.current || hasImpacted.current) return;
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min(1, elapsed / duration);

    // Linear interpolation towards target
    const currentPos = new THREE.Vector3().lerpVectors(origin, target, progress);
    // Slight aerodynamic arc
    currentPos.y += Math.sin(progress * Math.PI) * 0.35;

    meshRef.current.position.copy(currentPos);

    if (progress >= 1 && !hasImpacted.current) {
      hasImpacted.current = true;
      onImpact();
    }
  });

  const { type } = projectile;

  return (
    <group ref={meshRef} position={origin}>
      {/* Tomato: Bright red ball with green stem */}
      {type === 'tomato' && (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.05, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* Egg: Off-white oblong sphere */}
      {type === 'egg' && (
        <mesh castShadow scale={[1, 1.25, 1]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#fef08a" roughness={0.5} metalness={0.05} />
        </mesh>
      )}

      {/* Water Balloon: Translucent blue rubber balloon */}
      {type === 'water_balloon' && (
        <mesh castShadow>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial
            color="#0284c7"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Impact Puddle Decal on Floor / Walls
 * Stays for 7 seconds (within the 5-10 second requirement) then smoothly fades out
 */
function ImpactPuddle({ puddle, onExpire }) {
  const [opacity, setOpacity] = useState(1);
  const meshRef = useRef();

  const normal = useMemo(() => {
    const n = puddle.hitNormal ? new THREE.Vector3(...puddle.hitNormal) : new THREE.Vector3(0, 1, 0);
    return n.normalize();
  }, [puddle.hitNormal]);

  const position = useMemo(() => {
    const pos = new THREE.Vector3(...puddle.position);
    // Push slightly outward along the surface normal by 0.012 to prevent z-fighting
    return pos.add(normal.clone().multiplyScalar(0.012));
  }, [puddle.position, normal]);

  const orientation = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 0, 1);
    q.setFromUnitVectors(up, normal);
    return q;
  }, [normal]);

  const puddleDuration = 7000; // 7 seconds lifetime
  const fadeDuration = 1500;   // Fade out over final 1.5 seconds

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= puddleDuration) {
        clearInterval(interval);
        onExpire();
      } else if (elapsed > puddleDuration - fadeDuration) {
        const remaining = puddleDuration - elapsed;
        setOpacity(Math.max(0, remaining / fadeDuration));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [puddleDuration, fadeDuration, onExpire]);

  const { type } = puddle;

  return (
    <group position={position} quaternion={orientation} ref={meshRef}>
      {/* 1. Tomato Puddle (Red Splat) */}
      {type === 'tomato' && (
        <group>
          {/* Main puddle blob */}
          <mesh receiveShadow>
            <circleGeometry args={[0.38, 24]} />
            <meshStandardMaterial
              color="#dc2626"
              roughness={0.3}
              metalness={0.05}
              transparent
              opacity={0.88 * opacity}
              depthWrite={false}
            />
          </mesh>
          {/* Splatter droplets */}
          <mesh position={[0.32, 0.22, 0]}>
            <circleGeometry args={[0.09, 12]} />
            <meshStandardMaterial
              color="#b91c1c"
              transparent
              opacity={0.85 * opacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[-0.28, 0.3, 0]}>
            <circleGeometry args={[0.07, 12]} />
            <meshStandardMaterial
              color="#b91c1c"
              transparent
              opacity={0.85 * opacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[-0.15, -0.32, 0]}>
            <circleGeometry args={[0.11, 12]} />
            <meshStandardMaterial
              color="#b91c1c"
              transparent
              opacity={0.85 * opacity}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* 2. Egg Puddle (Light Grey / Creamy Egg White with Yolk) */}
      {type === 'egg' && (
        <group>
          {/* Egg White Base (Light Grey) */}
          <mesh receiveShadow>
            <circleGeometry args={[0.42, 24]} />
            <meshStandardMaterial
              color="#f1f5f9"
              roughness={0.25}
              transparent
              opacity={0.78 * opacity}
              depthWrite={false}
            />
          </mesh>
          {/* Yellow Yolk Center */}
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[0.17, 20]} />
            <meshStandardMaterial
              color="#facc15"
              roughness={0.2}
              transparent
              opacity={0.92 * opacity}
              depthWrite={false}
            />
          </mesh>
          {/* Outer egg droplets */}
          <mesh position={[0.34, -0.22, 0]}>
            <circleGeometry args={[0.08, 12]} />
            <meshStandardMaterial
              color="#e2e8f0"
              transparent
              opacity={0.7 * opacity}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* 3. Water Balloon Puddle (Translucent Blue Water Splash) */}
      {type === 'water_balloon' && (
        <group>
          {/* Water Splash Ring */}
          <mesh receiveShadow>
            <ringGeometry args={[0.15, 0.46, 24]} />
            <meshStandardMaterial
              color="#38bdf8"
              roughness={0.08}
              metalness={0.15}
              transparent
              opacity={0.65 * opacity}
              depthWrite={false}
            />
          </mesh>
          {/* Center wet pool */}
          <mesh position={[0, 0, 0.001]}>
            <circleGeometry args={[0.32, 24]} />
            <meshStandardMaterial
              color="#0284c7"
              roughness={0.1}
              metalness={0.1}
              transparent
              opacity={0.75 * opacity}
              depthWrite={false}
            />
          </mesh>
          {/* Splash Droplets */}
          <mesh position={[0.42, 0.25, 0]}>
            <circleGeometry args={[0.06, 12]} />
            <meshStandardMaterial
              color="#0284c7"
              transparent
              opacity={0.6 * opacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[-0.38, -0.28, 0]}>
            <circleGeometry args={[0.07, 12]} />
            <meshStandardMaterial
              color="#0284c7"
              transparent
              opacity={0.6 * opacity}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
