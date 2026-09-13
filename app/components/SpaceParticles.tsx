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
  WebGLRenderer,
} from "three";

const PARTICLE_COUNT = 130;
const INITIAL_PARTICLES = 60; // Reduced initial load
const FIELD_DEPTH = 60;
const FIELD_WIDTH = 44;
const CAMERA_Z = 18;
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
    const initialCount = isMobile ? 30 : INITIAL_PARTICLES;
    const finalCount = isMobile ? 70 : PARTICLE_COUNT;
    const fieldWidth = isMobile ? 34 : FIELD_WIDTH;

    const scene = new Scene();
    const camera = new PerspectiveCamera(
      60,
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Reduced from 2
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
      color: new Color("#93c5fd"),
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.70,
      depthWrite: false,
    });
    const field = new Points(geometry, material);
    scene.add(field);

    const normalColor = new Color("#93c5fd");
    const skyBlueColor = new Color("#9ad6ff");
    const endWhiteColor = new Color("#f8fbff");
    const phaseColor = new Color();

    const mouse = { x: 0, y: 0 };
    const rotation = { x: 0, y: 0 };
    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;
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

    const handleWheel = (e: WheelEvent) => {
      scrollVelocity += e.deltaY * 0.001;
      lastActivity = performance.now();
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      scrollVelocity += (currentY - lastScrollY) * 0.006;
      lastScrollY = currentY;
      blueProgress = getBlueProgress(currentY);
      lastActivity = performance.now();
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

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

    const animate = (time: number) => {
      rafId = requestAnimationFrame(animate);
      frameCount++;

      // Idle throttle — see lastActivity above. 2s after the last input,
      // only every third frame renders; the slow drift/twinkle is
      // indistinguishable at 20fps and the other two frames cost nothing.
      if (time - lastActivity > 2000 && frameCount % 3 !== 0) return;

      addParticlesGradually();

      rotation.x += (mouse.y * 0.08 - rotation.x) * 0.04;
      rotation.y += (mouse.x * 0.08 - rotation.y) * 0.04;
      field.rotation.x = rotation.x;
      field.rotation.y = rotation.y;

      // Particles drift forward only in response to scroll/wheel input
      scrollVelocity *= 0.9;
      const warp = MathUtils.clamp(scrollVelocity, -2, 2);
      const t = time * 0.001;

      const blueMix = Math.min(blueProgress / 0.72, 1);
      const endPhaseMix = MathUtils.clamp((blueProgress - 0.72) / 0.28, 0, 1);

      phaseColor.lerpColors(normalColor, skyBlueColor, blueMix);
      phaseColor.lerp(endWhiteColor, endPhaseMix);
      material.color.lerp(phaseColor, 0.06);
      const targetOpacity = MathUtils.lerp(0.6, 0.3, endPhaseMix);
      material.opacity += (targetOpacity - material.opacity) * 0.06;

      // Slow whole-field drift keeps the stars alive without per-particle math
      field.rotation.z = t * 0.004;

      // Only rewrite positions while scroll warp is actually moving the field
      if (Math.abs(warp) > 0.001) {
        for (let i = 0; i < currentParticleCount; i++) {
          const base = i * 3 + 2;
          let z = posArray[base];
          z += warp * speeds[i];
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
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
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

