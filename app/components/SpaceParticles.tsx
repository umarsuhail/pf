"use client";

import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  MathUtils,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  STARFIELD,
  STARFIELD_GATHER_EVENT,
  STARFIELD_RELEASE_EVENT,
  STARFIELD_SEED_EVENT,
  type StarfieldGatherDetail,
  type StarfieldSeedDetail,
} from "../lib/starfield";

const PARTICLE_COUNT = 620;
const INITIAL_PARTICLES = 240;
const FIELD_DEPTH = STARFIELD.depth;
const FIELD_WIDTH = 44;
const CAMERA_Z = STARFIELD.cameraZ;
const PHASE_SCROLL_SCREENS = 3;
const MOBILE_BREAKPOINT = 768;
const IDLE_FPS = 20;
const IDLE_FRAME_MS = 1000 / IDLE_FPS;
const IDLE_FRAME_SLACK_MS = 4;
const GLAZE_FIRST_DELAY_MIN_MS = 700;
const GLAZE_FIRST_DELAY_MAX_MS = 1050;
const GLAZE_GAP_MIN_MS = 220;
const GLAZE_GAP_MAX_MS = 360;
const GLAZE_DURATION_MIN_MS = 600;
const GLAZE_DURATION_MAX_MS = 760;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createCircleTexture(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

function createGlazeTexture(): Texture {
  const size = 128;
  const centre = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const bloom = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre);
  bloom.addColorStop(0, "rgba(255,255,255,1)");
  bloom.addColorStop(0.1, "rgba(255,255,255,0.9)");
  bloom.addColorStop(0.32, "rgba(255,255,255,0.2)");
  bloom.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, size, size);

  const horizontal = ctx.createLinearGradient(0, centre, size, centre);
  horizontal.addColorStop(0, "rgba(255,255,255,0)");
  horizontal.addColorStop(0.38, "rgba(255,255,255,0.04)");
  horizontal.addColorStop(0.49, "rgba(255,255,255,0.72)");
  horizontal.addColorStop(0.5, "rgba(255,255,255,1)");
  horizontal.addColorStop(0.51, "rgba(255,255,255,0.72)");
  horizontal.addColorStop(0.62, "rgba(255,255,255,0.04)");
  horizontal.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, centre - 1.5, size, 3);

  const vertical = ctx.createLinearGradient(centre, 0, centre, size);
  vertical.addColorStop(0, "rgba(255,255,255,0)");
  vertical.addColorStop(0.38, "rgba(255,255,255,0.04)");
  vertical.addColorStop(0.49, "rgba(255,255,255,0.72)");
  vertical.addColorStop(0.5, "rgba(255,255,255,1)");
  vertical.addColorStop(0.51, "rgba(255,255,255,0.72)");
  vertical.addColorStop(0.62, "rgba(255,255,255,0.04)");
  vertical.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = vertical;
  ctx.fillRect(centre - 1.5, 0, 3, size);

  return new CanvasTexture(canvas);
}

export default function SpaceParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const initialCount = isMobile ? 120 : INITIAL_PARTICLES;
    const finalCount = isMobile ? 300 : PARTICLE_COUNT;
    const fieldWidth = isMobile ? 34 : FIELD_WIDTH;

    const scene = new Scene();
    const camera = new PerspectiveCamera(
      STARFIELD.fovDeg,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.z = CAMERA_Z;

    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const positions = new Float32Array(finalCount * 3);
    const speeds = new Float32Array(finalCount);

    for (let i = 0; i < finalCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * fieldWidth;
      positions[i * 3 + 1] = (Math.random() - 0.5) * fieldWidth * 0.6;
      positions[i * 3 + 2] = -Math.random() * FIELD_DEPTH;
      speeds[i] = 0.4 + Math.random() * 0.8;
    }

    const geometry = new BufferGeometry();
    const posAttr = new BufferAttribute(positions, 3);
    geometry.setAttribute("position", posAttr);
    geometry.setDrawRange(0, initialCount);
    const posArray = posAttr.array as Float32Array;
    let currentParticleCount = initialCount;

    const material = new PointsMaterial({
      map: createCircleTexture(),
      color: new Color(STARFIELD.color),
      size: STARFIELD.pointSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: STARFIELD.opacity,
      depthWrite: false,
    });
    const field = new Points(geometry, material);
    scene.add(field);

    const glazeGeometry = new BufferGeometry();
    glazeGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0]), 3),
    );
    const glazeTexture = createGlazeTexture();
    const glazeMaterial = new PointsMaterial({
      map: glazeTexture,
      color: new Color("#eaf8ff"),
      size: 1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const glazePoint = new Points(glazeGeometry, glazeMaterial);
    glazePoint.frustumCulled = false;
    glazePoint.visible = false;
    glazePoint.renderOrder = 1;
    field.add(glazePoint);

    const normalColor = new Color("#3b82f6");
    const skyBlueColor = new Color("#9ad6ff");
    const endWhiteColor = new Color("#f8fbff");
    const phaseColor = new Color();

    const mouse = { x: 0, y: 0 };
    const rotation = { x: 0, y: 0 };
    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;
    let isAutopilotRunning = false;
    const getBlueProgress = (y: number) => {
      const start = window.innerHeight * PHASE_SCROLL_SCREENS;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const span = Math.max(maxScroll - start, window.innerHeight);
      return MathUtils.clamp((y - start) / span, 0, 1);
    };

    let blueProgress = getBlueProgress(window.scrollY);

    let lastActivity = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      lastActivity = performance.now();
    };

    const handleWheel = (e: WheelEvent) => {
      if (isAutopilotRunning) return;
      scrollVelocity += e.deltaY * 0.0006;
      lastActivity = performance.now();
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const deltaY = currentY - lastScrollY;
      lastScrollY = currentY;
      if (Math.abs(deltaY) > window.innerHeight * 2) {
        blueProgress = getBlueProgress(currentY);
        return;
      }
      if (isAutopilotRunning) {
        scrollVelocity = 0;
        return;
      }
      scrollVelocity += deltaY * 0.0035;
      blueProgress = getBlueProgress(currentY);
      lastActivity = performance.now();
    };

    const handleAutopilotState = (event: Event) => {
      const running = Boolean((event as CustomEvent<{ running?: boolean }>).detail?.running);
      isAutopilotRunning = running;
      scrollVelocity = 0;
      lastScrollY = window.scrollY;
      if (!running) blueProgress = getBlueProgress(lastScrollY);
    };

    const handleAutopilotLaunch = () => {
      isAutopilotRunning = true;
      scrollVelocity = 0;
      lastScrollY = window.scrollY;
    };

    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width === lastWidth && Math.abs(height - lastHeight) < 140) return;
      lastWidth = width;
      lastHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const handoffPoint = new Vector3();
    const glazeWorldPoint = new Vector3();
    const glazeNdcPoint = new Vector3();
    const halfHeightAt = (distance: number) =>
      Math.tan(MathUtils.degToRad(camera.fov / 2)) * distance;

    const PARKED_X = 1e5;
    const gathered: { index: number; x: number }[] = [];
    let activeGlazeIndex = -1;
    let glazeStart = 0;
    let glazeDuration = 0;
    let glazeBaseSize = 1;
    let glazeLastZ = 0;
    let glazePaused = false;
    let nextGlazeAt = reduceMotion
      ? Number.POSITIVE_INFINITY
      : performance.now() +
        randomBetween(GLAZE_FIRST_DELAY_MIN_MS, GLAZE_FIRST_DELAY_MAX_MS);

    const scheduleNextGlaze = (time: number) => {
      nextGlazeAt = time + randomBetween(GLAZE_GAP_MIN_MS, GLAZE_GAP_MAX_MS);
    };

    const stopGlaze = (time: number, reschedule = true) => {
      activeGlazeIndex = -1;
      glazePoint.visible = false;
      glazeMaterial.opacity = 0;
      if (reschedule && !reduceMotion && !glazePaused) scheduleNextGlaze(time);
    };

    const startGlaze = (time: number) => {
      field.updateMatrixWorld(true);
      camera.updateMatrixWorld();
      const attempts = Math.min(currentParticleCount, 36);

      for (let attempt = 0; attempt < attempts; attempt++) {
        const index = Math.floor(Math.random() * currentParticleCount);
        const x = posArray[index * 3];
        const y = posArray[index * 3 + 1];
        const z = posArray[index * 3 + 2];
        if (x === PARKED_X) continue;

        glazeWorldPoint.set(x, y, z);
        field.localToWorld(glazeWorldPoint);
        const viewDepth = CAMERA_Z - glazeWorldPoint.z;
        if (viewDepth < 10 || viewDepth > 55) continue;

        glazeNdcPoint.copy(glazeWorldPoint).project(camera);
        if (
          Math.abs(glazeNdcPoint.x) > 0.82 ||
          Math.abs(glazeNdcPoint.y) > 0.76 ||
          glazeNdcPoint.z < -1 ||
          glazeNdcPoint.z > 1
        ) {
          continue;
        }

        const screenX = ((glazeNdcPoint.x + 1) / 2) * window.innerWidth;
        const screenY = ((1 - glazeNdcPoint.y) / 2) * window.innerHeight;
        if (
          document
            .elementFromPoint(screenX, screenY)
            ?.closest(".mission-flight-card")
        ) {
          continue;
        }

        activeGlazeIndex = index;
        glazeStart = time;
        glazeDuration = randomBetween(GLAZE_DURATION_MIN_MS, GLAZE_DURATION_MAX_MS);
        const targetPixels = isMobile ? 26 : 34;
        glazeBaseSize =
          (targetPixels * viewDepth) / Math.max(window.innerHeight / 2, 1);
        glazeLastZ = z;
        glazePoint.position.set(x, y, z);
        glazeMaterial.opacity = 0;
        glazePoint.visible = true;
        nextGlazeAt = Number.POSITIVE_INFINITY;
        return;
      }

      nextGlazeAt = time + 250;
    };

    const handleSeed = (event: Event) => {
      const stars = (event as CustomEvent<StarfieldSeedDetail>).detail?.stars;
      if (!stars?.length) return;
      const now = performance.now();
      stopGlaze(now, false);
      if (!reduceMotion) {
        nextGlazeAt =
          now + randomBetween(GLAZE_FIRST_DELAY_MIN_MS, GLAZE_FIRST_DELAY_MAX_MS);
      }
      field.updateMatrixWorld();
      const count = Math.min(stars.length, finalCount);
      for (let i = 0; i < count; i++) {
        const star = stars[i];
        const halfH = halfHeightAt(star.distance);
        const halfW = halfH * camera.aspect;
        handoffPoint.set(
          (star.nx * 2 - 1) * halfW,
          (1 - star.ny * 2) * halfH,
          CAMERA_Z - star.distance,
        );
        field.worldToLocal(handoffPoint);
        posArray[i * 3] = handoffPoint.x;
        posArray[i * 3 + 1] = handoffPoint.y;
        posArray[i * 3 + 2] = handoffPoint.z;
      }
      posAttr.needsUpdate = true;
      currentParticleCount = Math.max(currentParticleCount, count);
      geometry.setDrawRange(0, currentParticleCount);
      material.opacity = STARFIELD.opacity;
      lastActivity = performance.now();
      renderer.render(scene, camera);
    };

    const handleGather = (event: Event) => {
      const detail = (event as CustomEvent<StarfieldGatherDetail>).detail;
      if (!detail) return;
      glazePaused = true;
      stopGlaze(performance.now(), false);
      field.updateMatrixWorld();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < currentParticleCount && points.length < detail.count; i++) {
        if (posArray[i * 3] === PARKED_X) continue;
        handoffPoint.set(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]);
        field.localToWorld(handoffPoint);
        if (handoffPoint.z > CAMERA_Z - 1) continue;
        handoffPoint.project(camera);
        const x = ((handoffPoint.x + 1) / 2) * width;
        const y = ((1 - handoffPoint.y) / 2) * height;
        const { within } = detail;
        if (x < within.left || x > within.right || y < within.top || y > within.bottom) {
          continue;
        }
        points.push({ x, y });
        gathered.push({ index: i, x: posArray[i * 3] });
        posArray[i * 3] = PARKED_X;
      }
      posAttr.needsUpdate = true;
      detail.respond(points);
    };

    const handleRelease = () => {
      for (const star of gathered) posArray[star.index * 3] = star.x;
      gathered.length = 0;
      posAttr.needsUpdate = true;
      glazePaused = false;
      if (!reduceMotion) scheduleNextGlaze(performance.now());
    };

    const handleLoopRush = () => {
      if (isAutopilotRunning) return;
      scrollVelocity = 5;
      lastActivity = performance.now();
    };

    window.addEventListener(STARFIELD_SEED_EVENT, handleSeed);
    window.addEventListener("flight-loop-rush", handleLoopRush);
    window.addEventListener(STARFIELD_GATHER_EVENT, handleGather);
    window.addEventListener(STARFIELD_RELEASE_EVENT, handleRelease);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("flight-autopilot-state", handleAutopilotState as EventListener);
    window.addEventListener("flight-autopilot-launch", handleAutopilotLaunch);

    let rafId: number;

    let lastParticleAddTime = 0;
    const addParticlesGradually = () => {
      const now = Date.now();
      if (now - lastParticleAddTime > 1000 && currentParticleCount < finalCount) {
        const increment = Math.min(100, finalCount - currentParticleCount);
        currentParticleCount += increment;
        geometry.setDrawRange(0, currentParticleCount);
        lastParticleAddTime = now;
      }
    };

    let lastParticleFrame = 0;

    const animate = (time: number) => {
      rafId = requestAnimationFrame(animate);

      if (
        time - lastActivity > 2000 &&
        time - lastParticleFrame < IDLE_FRAME_MS - IDLE_FRAME_SLACK_MS
      ) {
        return;
      }

      const elapsedSeconds = lastParticleFrame
        ? Math.min((time - lastParticleFrame) / 1000, 0.08)
        : 0;
      lastParticleFrame = time;

      addParticlesGradually();

      rotation.x += (mouse.y * 0.08 - rotation.x) * 0.04;
      rotation.y += (mouse.x * 0.08 - rotation.y) * 0.04;
      field.rotation.x = rotation.x;
      field.rotation.y = rotation.y;

      scrollVelocity *= 0.87;
      const warp = MathUtils.clamp(scrollVelocity, -1.1, 1.1);
      const t = time * 0.001;

      const blueMix = Math.min(blueProgress / 0.72, 1);
      const endPhaseMix = MathUtils.clamp((blueProgress - 0.72) / 0.28, 0, 1);

      phaseColor.lerpColors(normalColor, skyBlueColor, blueMix);
      phaseColor.lerp(endWhiteColor, endPhaseMix);
      material.color.lerp(phaseColor, 0.06);
      const targetOpacity = MathUtils.lerp(0.4, 0.16, endPhaseMix);
      material.opacity += (targetOpacity - material.opacity) * 0.06;

      field.rotation.z = t * 0.004;

      const ambientStep = (isAutopilotRunning ? 0.46 : 0.14) * elapsedSeconds;
      const particleStep = warp + ambientStep;
      if (Math.abs(particleStep) > 0.0001) {
        for (let i = 0; i < currentParticleCount; i++) {
          const base = i * 3 + 2;
          let z = posArray[base];
          z += particleStep * speeds[i];
          if (z > CAMERA_Z - 3) z -= FIELD_DEPTH;
          else if (z < CAMERA_Z - FIELD_DEPTH - 3) z += FIELD_DEPTH;
          posArray[base] = z;
        }
        posAttr.needsUpdate = true;
      }

      if (!reduceMotion && !glazePaused) {
        if (activeGlazeIndex >= 0) {
          const x = posArray[activeGlazeIndex * 3];
          const y = posArray[activeGlazeIndex * 3 + 1];
          const z = posArray[activeGlazeIndex * 3 + 2];
          const progress = (time - glazeStart) / glazeDuration;

          if (
            x === PARKED_X ||
            progress >= 1 ||
            Math.abs(z - glazeLastZ) > FIELD_DEPTH / 2
          ) {
            stopGlaze(time);
          } else {
            glazeLastZ = z;
            glazePoint.position.set(x, y, z);
            const pulse = Math.sin(Math.PI * MathUtils.clamp(progress, 0, 1));
            const brilliance = Math.pow(pulse, 1.25);
            glazeMaterial.color.copy(phaseColor).lerp(endWhiteColor, 0.78);
            glazeMaterial.opacity =
              brilliance * MathUtils.lerp(0.92, 0.36, endPhaseMix);
            glazeMaterial.size = glazeBaseSize * (0.68 + pulse * 0.58);
          }
        } else if (time >= nextGlazeAt) {
          startGlaze(time);
        }
      }

      renderer.render(scene, camera);
    };
    animate(0);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener(STARFIELD_SEED_EVENT, handleSeed);
      window.removeEventListener("flight-loop-rush", handleLoopRush);
      window.removeEventListener(STARFIELD_GATHER_EVENT, handleGather);
      window.removeEventListener(STARFIELD_RELEASE_EVENT, handleRelease);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("flight-autopilot-state", handleAutopilotState as EventListener);
      window.removeEventListener("flight-autopilot-launch", handleAutopilotLaunch);
      renderer.dispose();
      geometry.dispose();
      glazeGeometry.dispose();
      glazeTexture.dispose();
      glazeMaterial.dispose();
      material.map?.dispose();
      material.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
