import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { CharacterAvatar } from './CharacterAvatar';

/**
 * Bounds checking and collision obstacles:
 * - Room boundaries: [-10.5, 10.5] on X and Z
 * - Central Conference Table: [-1.9, 1.9] on X and [-3.6, 3.6] on Z
 * - Table height is ~1.1m. When the character is above 1.05m, they can freely traverse on top of the table.
 */
function isPositionBlocked(x, z, y) {
  if (x < -10.5 || x > 10.5 || z < -10.5 || z > 10.5) return true;

  if (y < 1.05) {
    if (x > -1.9 && x < 1.9 && z > -3.6 && z < 3.6) {
      return true;
    }
  }

  return false;
}

export function LocalPlayer({
  avatarConfig,
  name,
  isSitting,
  seatData,
  onPositionChange,
  viewMode = 'fpp',
  onStandUp,
  isCursorFree = false,
  videoStream = null,
  isCamActive = false,
  camZoom = 1.2
}) {
  const keys = useKeyboardControls();
  const playerPos = useRef(new THREE.Vector3(0, 0, 5.0));
  const velocityY = useRef(0);
  const isGrounded = useRef(true);

  const playerRot = useRef(Math.PI); // Continuous horizontal yaw angle
  const seatedYawOffset = useRef(0);
  const currentAnimState = useRef('idle');
  const { camera, gl, scene, pointer, raycaster: r3fRaycaster } = useThree();

  const lastBroadcast = useRef(0);
  const mouseLook = useRef({ pitch: 0 });

  // Direct FPS Mouse Look & Locked Cursor Raycasting:
  useEffect(() => {
    const canvas = gl.domElement;

    // Center R3F internal pointer immediately when in Aim Mode
    if (!isCursorFree) {
      pointer.set(0, 0);
    }

    const handleMouseMove = (e) => {
      // If user freed their mouse cursor, or in presentation TV mode, freeze camera look
      if (isCursorFree || viewMode === 'presentation') return;

      // Keep R3F pointer pinned to center screen
      pointer.set(0, 0);

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      const sensitivity = 0.0035;

      if (isSitting) {
        seatedYawOffset.current = Math.max(
          -Math.PI / 2, // -90 deg
          Math.min(Math.PI / 2, seatedYawOffset.current - movementX * sensitivity) // +90 deg
        );
      } else {
        // Continuous 360-degree rotation
        playerRot.current -= movementX * sensitivity;
      }

      // Vertical tilt
      mouseLook.current.pitch = Math.max(
        -Math.PI / 2.3, // ~78 deg down
        Math.min(Math.PI / 2.3, mouseLook.current.pitch - movementY * sensitivity) // ~78 deg up
      );
    };

    // When Aim Mode is active, clicking canvas triggers center-screen raycast for clicking chairs!
    const handleClick = (e) => {
      if (isCursorFree || viewMode === 'presentation') return;

      // Make sure R3F's raycaster also targets exact screen center
      pointer.set(0, 0);
      r3fRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      // Lock cursor if not already locked
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }

      // Cast ray from exact screen center (0, 0 in NDC)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      for (const hit of intersects) {
        // Only allow interacting within a reasonable distance (e.g. 6 meters)
        if (hit.distance > 6.5) continue;

        let curr = hit.object;
        while (curr) {
          if (curr.userData && typeof curr.userData.onSelect === 'function') {
            curr.userData.onSelect();
            return;
          }
          curr = curr.parent;
        }
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement === canvas) {
        // Just locked: snap pointer to center
        pointer.set(0, 0);
      }
    };

    if (isCursorFree && document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    } else if (!isCursorFree && viewMode !== 'presentation' && document.pointerLockElement !== canvas) {
      pointer.set(0, 0);
      canvas.requestPointerLock?.();
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    // Use capture phase so we run before R3F synthetic event system
    canvas.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      canvas.removeEventListener('click', handleClick, true);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock?.();
      }
    };
  }, [gl, isCursorFree, isSitting, viewMode, camera, scene, pointer, r3fRaycaster]);

  useFrame((_, delta) => {
    // 1. Presentation TV Close-Up Mode:
    // When presentation mode is activated via the button, smoothly position camera directly in front of the TV
    if (viewMode === 'presentation') {
      // TV center is at [0, 4.2, -11.6]. Place camera at [0, 4.2, -6.8] looking straight at [0, 4.2, -11.6]
      const tvCamPos = new THREE.Vector3(0, 4.2, -6.8);
      camera.position.lerp(tvCamPos, 0.08);
      camera.lookAt(new THREE.Vector3(0, 4.2, -11.6));
      return;
    }

    // 2. Seated State:
    if (isSitting && seatData) {
      playerPos.current.set(seatData.position[0], seatData.position[1], seatData.position[2]);
      velocityY.current = 0;
      isGrounded.current = true;
      currentAnimState.current = 'sitting';

      const currentYaw = seatData.rotation + seatedYawOffset.current;

      if (viewMode === 'fpp') {
        camera.position.set(
          playerPos.current.x,
          playerPos.current.y + 1.35,
          playerPos.current.z
        );

        const lookTarget = new THREE.Vector3(
          playerPos.current.x + Math.sin(currentYaw) * 5,
          playerPos.current.y + 1.35 + mouseLook.current.pitch * 3.5,
          playerPos.current.z + Math.cos(currentYaw) * 5
        );
        camera.lookAt(lookTarget);
      } else if (viewMode === 'tpp') {
        const camTarget = new THREE.Vector3(
          playerPos.current.x - Math.sin(seatData.rotation) * 3.2,
          playerPos.current.y + 2.4,
          playerPos.current.z - Math.cos(seatData.rotation) * 3.2
        );
        camera.position.lerp(camTarget, 0.08);
        camera.lookAt(playerPos.current.x, playerPos.current.y + 1.2, playerPos.current.z);
      }
      return;
    }

    seatedYawOffset.current = 0;

    // 3. Physics & Jump Mechanics (SPACEBAR exclusively for jumping):
    const gravity = 22.0;
    const isOnTable =
      playerPos.current.x > -1.8 &&
      playerPos.current.x < 1.8 &&
      playerPos.current.z > -3.5 &&
      playerPos.current.z < 3.5;

    const floorHeight = isOnTable ? 1.15 : 0;

    // Spacebar Jump
    if (keys.current.jump && isGrounded.current) {
      velocityY.current = 8.6; // High jump power to leap onto the 1.1m table
      isGrounded.current = false;
    }

    // Apply gravity
    if (!isGrounded.current || playerPos.current.y > floorHeight) {
      velocityY.current -= gravity * delta;
      playerPos.current.y += velocityY.current * delta;

      if (playerPos.current.y <= floorHeight) {
        playerPos.current.y = floorHeight;
        velocityY.current = 0;
        isGrounded.current = true;
      }
    }

    // 4. Walking & Sprinting (Shift):
    const isRunning = keys.current.shift;
    const baseSpeed = isRunning ? 13.5 : 4.8;
    const moveSpeed = baseSpeed * delta;

    let forwardStep = 0;
    let strafeStep = 0;
    let moved = false;

    if (keys.current.forward) {
      forwardStep += moveSpeed;
      moved = true;
    }
    if (keys.current.backward) {
      forwardStep -= moveSpeed * 0.75;
      moved = true;
    }
    if (keys.current.left) {
      strafeStep -= moveSpeed * 0.85;
      moved = true;
    }
    if (keys.current.right) {
      strafeStep += moveSpeed * 0.85;
      moved = true;
    }

    if (moved) {
      const targetX =
        playerPos.current.x +
        Math.sin(playerRot.current) * forwardStep -
        Math.cos(playerRot.current) * strafeStep;

      const targetZ =
        playerPos.current.z +
        Math.cos(playerRot.current) * forwardStep +
        Math.sin(playerRot.current) * strafeStep;

      if (!isPositionBlocked(targetX, targetZ, playerPos.current.y)) {
        playerPos.current.x = targetX;
        playerPos.current.z = targetZ;
      }
      currentAnimState.current = isGrounded.current ? 'walking' : 'jumping';
    } else {
      currentAnimState.current = isGrounded.current ? 'idle' : 'jumping';
    }

    // Dynamic FOV rush on sprint
    if (camera.isPerspectiveCamera) {
      const targetFov = isRunning && moved ? 75 : 60;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
      camera.updateProjectionMatrix();
    }

    // 5. Camera handling in FPP
    if (viewMode === 'fpp') {
      camera.position.set(
        playerPos.current.x,
        playerPos.current.y + 1.62,
        playerPos.current.z
      );

      const lookTarget = new THREE.Vector3(
        playerPos.current.x + Math.sin(playerRot.current) * 5,
        playerPos.current.y + 1.62 + mouseLook.current.pitch * 3.5,
        playerPos.current.z + Math.cos(playerRot.current) * 5
      );
      camera.lookAt(lookTarget);
    } else if (viewMode === 'tpp') {
      const distance = 4.0;
      const height = 2.6;

      const desiredCamPos = new THREE.Vector3(
        playerPos.current.x - Math.sin(playerRot.current) * distance,
        playerPos.current.y + height,
        playerPos.current.z - Math.cos(playerRot.current) * distance
      );

      camera.position.lerp(desiredCamPos, 0.1);
      const lookTarget = new THREE.Vector3(
        playerPos.current.x,
        playerPos.current.y + 1.35,
        playerPos.current.z
      );
      camera.lookAt(lookTarget);
    }

    // 6. Multiplayer sync
    const now = performance.now();
    if (now - lastBroadcast.current > 50) {
      lastBroadcast.current = now;
      if (onPositionChange) {
        onPositionChange({
          position: [playerPos.current.x, playerPos.current.y, playerPos.current.z],
          rotation: playerRot.current,
          state: currentAnimState.current
        });
      }
    }
  });

  return (
    <CharacterAvatar
      position={[playerPos.current.x, playerPos.current.y, playerPos.current.z]}
      rotation={playerRot.current}
      state={currentAnimState.current}
      avatarConfig={avatarConfig}
      name={name}
      isLocal={true}
      hideModelInFpp={viewMode === 'fpp'}
      videoStream={videoStream}
      isCamActive={isCamActive}
      camZoom={camZoom}
    />
  );
}
