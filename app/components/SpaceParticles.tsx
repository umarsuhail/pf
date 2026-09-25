"use client";

import { useEffect, useRef } from "react";
// Named imports (not `import * as THREE`) so bundlers can tree-shake the
// rest of three.js — a wildcard namespace import forces the whole library
// into the chunk since every property access is reachable.
import {
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

// A THREE.Points field is a single draw call no matter how many points are
// in it, so the count here is a purely visual decision, not a performance
// one — the real per-frame cost is the position rewrite loop below (already
// gated on actual scroll warp) and fragment shading, which is governed by
// pixel ratio. This sits deliberately sparse: a denser field read as
// texture behind the closing mark and competed with the logo's own
// particles for the eye, which is the opposite of what it is for.
const PARTICLE_COUNT = 620;
const INITIAL_PARTICLES = 240;
// Shared with the loader and the closing mark (lib/starfield), which hand
// particles to and from this field and have to agree with it to the pixel.
const FIELD_DEPTH = STARFIELD.depth;
const FIELD_WIDTH = 44;
const CAMERA_Z = STARFIELD.cameraZ;
const PHASE_SCROLL_SCREENS = 3;
const MOBILE_BREAKPOINT = 768;

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

export default function SpaceParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
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
      antialias: false, // Disabled for better performance
      powerPreference: "high-performance",
    });
    // Deliberately 1.0. This is a full-viewport pass, so pixel ratio is the
    // one setting here that scales cost quadratically — and the payoff is
    // nil, because the points are soft round sprites with no hard edges to
    // sharpen. Density and colour (above) are what make the field read; they
    // cost almost nothing by comparison.
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Rounded, faded-blue starfield drifting through the z axis
    const positions = new Float32Array(finalCount * 3);
    const speeds = new Float32Array(finalCount);

    for (let i = 0; i < finalCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * fieldWidth;
      positions[i * 3 + 1] = (Math.random() - 0.5) * fieldWidth * 0.6;
      positions[i * 3 + 2] = -Math.random() * FIELD_DEPTH;
      speeds[i] = 0.4 + Math.random() * 0.8;
    }
    
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setDrawRange(0, initialCount); // Start with fewer particles
    
    const material = new PointsMaterial({
      map: createCircleTexture(),
      // Saturated blue at departure rather than the washed-out #93c5fd — the
      // pale tint is where the field ends up late in the flight (see the
      // lerp toward skyBlue/white below), so starting there meant the colour
      // journey had nowhere to travel from.
      color: new Color(STARFIELD.color),
      size: STARFIELD.pointSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: STARFIELD.opacity,
      depthWrite: false,
    });
    const field = new Points(geometry, material);
    scene.add(field);

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

    // Timestamp of the last real input. While the visitor is idle the
    // starfield's only motion is the barely-perceptible z-drift and
    // twinkle, so the render loop drops to a third of the frame rate —
    // freeing the GPU/compositor budget for the rest of the page — and
    // snaps back to full rate the instant anything moves.
    let lastActivity = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      lastActivity = performance.now();
    };

    // Gains cut roughly 40%: this warp is driven by raw wheel/scroll deltas
    // while the camera itself now glides on a soft spring, so at the old
    // gains a fast flick rocketed the starfield past a camera that was still
    // easing — the two read as different speeds in the same shot. Slower
    // input response keeps the field travelling with the camera.
    const handleWheel = (e: WheelEvent) => {
      if (isAutopilotRunning) return;
      scrollVelocity += e.deltaY * 0.0006;
      lastActivity = performance.now();
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const deltaY = currentY - lastScrollY;
      lastScrollY = currentY;
      // A jump, not travel: the loop wrapping from the end to the top (or any
      // instant scrollTo). Read as a delta it is a scroll of tens of screens
      // backwards and flung the whole field the wrong way; the loop brings
      // its own forward rush (flight-loop-rush) instead.
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

    // renderer.setSize() reallocates the WebGL drawing buffer — the most
    // expensive thing on this page that a scroll can trigger. A mobile
    // browser fires `resize` on every URL-bar slide, which is exactly during
    // a scroll, and only reports a height change of ~60-100px. The canvas
    // itself is laid out at 100vh (stable across that slide) and the field is
    // a soft, depth-faded star wash with no hard edges, so a vertical
    // mismatch that small is invisible. An orientation change or a desktop
    // window drag clears the threshold and resizes properly.
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

    // --- Hand-offs ---------------------------------------------------------
    // The field is where the loader's shattered US ends up, and where the
    // closing US is gathered from. See lib/starfield.
    const handoffPoint = new Vector3();
    const halfHeightAt = (distance: number) =>
      Math.tan(MathUtils.degToRad(camera.fov / 2)) * distance;

    // Seed: put stars exactly where the loader's dots are, at the depth each
    // was drawn for. Built in camera space and taken into the field's own
    // (rotated) space, so the mouse tilt and the slow roll do not shift them.
    const handleSeed = (event: Event) => {
      const stars = (event as CustomEvent<StarfieldSeedDetail>).detail?.stars;
      if (!stars?.length) return;
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
      // The loader takes its canvas away on the next frames; this one has
      // to be drawn by then, idle throttle or not.
      material.opacity = STARFIELD.opacity;
      lastActivity = performance.now();
      renderer.render(scene, camera);
    };

    // Gather: hand the closing mark the stars on screen right now, and take
    // them out of the field while they are the mark. Parked far to the side
    // (the drift loop only moves z) and remembered for release.
    const gathered: { index: number; x: number }[] = [];
    const PARKED_X = 1e5;
    const handleGather = (event: Event) => {
      const detail = (event as CustomEvent<StarfieldGatherDetail>).detail;
      if (!detail) return;
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
    };

    // The loop arriving back at the beginning: a hard forward warp that
    // decays on the usual 0.87/frame, held at the clamp for the first beat.
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
    const posAttr = geometry.getAttribute("position") as BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    let currentParticleCount = initialCount;

    // Gradually add more particles after initial load
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

    let frameCount = 0;
    let lastParticleFrame = 0;

    const animate = (time: number) => {
      rafId = requestAnimationFrame(animate);
      frameCount++;

      // Idle throttle — see lastActivity above. 2s after the last input,
      // only every third frame renders; the slow drift/twinkle is
      // indistinguishable at 20fps and the other two frames cost nothing.
      if (time - lastActivity > 2000 && frameCount % 3 !== 0) return;

      // The renderer deliberately idles at 20fps after input settles. Use
      // elapsed time rather than a per-frame increment so the ambient field
      // keeps the same slow pace during autoplay narration and on phones.
      const elapsedSeconds = lastParticleFrame
        ? Math.min((time - lastParticleFrame) / 1000, 0.08)
        : 0;
      lastParticleFrame = time;

      addParticlesGradually();

      rotation.x += (mouse.y * 0.08 - rotation.x) * 0.04;
      rotation.y += (mouse.x * 0.08 - rotation.y) * 0.04;
      field.rotation.x = rotation.x;
      field.rotation.y = rotation.y;

      // Manual input adds a stronger warp on top of the ambient drift below.
      // Decays a little faster and tops out a little lower than it used to
      // (+-2 -> +-1.1): the ceiling is what a hard flick actually hits, so it,
      // not the gain, is what set how violent fast scrolling looked.
      scrollVelocity *= 0.87;
      const warp = MathUtils.clamp(scrollVelocity, -1.1, 1.1);
      const t = time * 0.001;

      const blueMix = Math.min(blueProgress / 0.72, 1);
      const endPhaseMix = MathUtils.clamp((blueProgress - 0.72) / 0.28, 0, 1);

      phaseColor.lerpColors(normalColor, skyBlueColor, blueMix);
      phaseColor.lerp(endWhiteColor, endPhaseMix);
      material.color.lerp(phaseColor, 0.06);
      // Dimmer than the field was, and dimmer still by the end of the
      // flight: the starfield sits directly behind the closing mark, and at
      // full strength its own points competed with the logo's particles so
      // the glyph shapes stopped reading as a logo at all.
      const targetOpacity = MathUtils.lerp(0.4, 0.16, endPhaseMix);
      material.opacity += (targetOpacity - material.opacity) * 0.06;

      // Slow whole-field drift keeps the stars alive without per-particle math
      field.rotation.z = t * 0.004;

      // Manual scrolling supplies the flight warp. A quieter, time-based
      // drift remains underneath it at all times, with a touch more presence
      // during the narration-driven autoplay so space never freezes there.
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
