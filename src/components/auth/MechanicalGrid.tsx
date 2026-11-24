import React, { useEffect, useRef } from 'react';

/**
 * PRAYANA — Mechanical Coordinate Grid Canvas
 * 
 * High-performance 60fps GPU drafting table simulation.
 * Calculates magnetic nodal rotation, line illumination, and live coordinate reticles
 * using a pure requestAnimationFrame canvas loop (Zero React re-renders on mousemove).
 */
export const MechanicalGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    const GRID_SIZE = 48;
    const INFLUENCE_RADIUS = 220;

    const render = () => {
      const mouse = mouseRef.current;

      // Smooth pointer damping
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.35;
        mouse.y += (mouse.targetY - mouse.y) * 0.35;
      }

      // Background: Matte Obsidian #0E0E0E
      ctx.fillStyle = '#0E0E0E';
      ctx.fillRect(0, 0, width, height);

      const cols = Math.ceil(width / GRID_SIZE) + 1;
      const rows = Math.ceil(height / GRID_SIZE) + 1;

      // 1. Draw Architectural Grid Hairlines with Dynamic Optical Illumination
      ctx.lineWidth = 1;

      // Vertical hairlines
      for (let i = 0; i <= cols; i++) {
        const x = i * GRID_SIZE;
        let lineAlpha = 0.045;

        if (mouse.active) {
          const distX = Math.abs(x - mouse.x);
          if (distX < INFLUENCE_RADIUS) {
            const factor = 1 - distX / INFLUENCE_RADIUS;
            lineAlpha = 0.045 + 0.12 * (factor * factor);
          }
        }

        ctx.strokeStyle = `rgba(242, 240, 235, ${lineAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }

      // Horizontal hairlines
      for (let j = 0; j <= rows; j++) {
        const y = j * GRID_SIZE;
        let lineAlpha = 0.045;

        if (mouse.active) {
          const distY = Math.abs(y - mouse.y);
          if (distY < INFLUENCE_RADIUS) {
            const factor = 1 - distY / INFLUENCE_RADIUS;
            lineAlpha = 0.045 + 0.12 * (factor * factor);
          }
        }

        ctx.strokeStyle = `rgba(242, 240, 235, ${lineAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      // 2. Draw Magnetic Nodal Intersections
      for (let i = 0; i <= cols; i++) {
        const x = i * GRID_SIZE;
        for (let j = 0; j <= rows; j++) {
          const y = j * GRID_SIZE;

          let dist = 9999;
          if (mouse.active) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            dist = Math.sqrt(dx * dx + dy * dy);
          }

          if (mouse.active && dist < INFLUENCE_RADIUS) {
            // Mechanical rotation, scaling and brightness modulation
            const t = 1 - dist / INFLUENCE_RADIUS;
            const ease = t * t * (3 - 2 * t); // Smooth hermite curve

            // Mechanically rotate towards 45° with slight cursor azimuth lock
            const azimuth = Math.atan2(mouse.y - y, mouse.x - x);
            const rotation = (Math.PI / 4) * ease + azimuth * 0.28 * ease;
            const scale = 1.0 + 0.65 * ease;
            const alpha = 0.12 + 0.88 * ease;

            ctx.save();
            ctx.translate(x + 0.5, y + 0.5);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);

            // Precision Crosshair Arms
            ctx.strokeStyle = `rgba(242, 240, 235, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(4, 0);
            ctx.moveTo(0, -4);
            ctx.lineTo(0, 4);
            ctx.stroke();

            // Core micro-square for closest nodes
            if (dist < 85) {
              const coreAlpha = (1 - dist / 85) * 0.95;
              ctx.fillStyle = `rgba(242, 240, 235, ${coreAlpha.toFixed(3)})`;
              ctx.fillRect(-1.5, -1.5, 3, 3);
            }

            ctx.restore();
          } else {
            // Resting Hairline Intersection Crossmark (+)
            ctx.strokeStyle = 'rgba(242, 240, 235, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 2.5, y + 0.5);
            ctx.lineTo(x + 3.5, y + 0.5);
            ctx.moveTo(x + 0.5, y - 2.5);
            ctx.lineTo(x + 0.5, y + 3.5);
            ctx.stroke();
          }
        }
      }

      // 3. Live Cursor Drafting Reticle & Monospace Coordinates Badge
      if (mouse.active && mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height) {
        ctx.save();

        // Subtle Tracking Hairlines
        ctx.strokeStyle = 'rgba(242, 240, 235, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(0, mouse.y + 0.5);
        ctx.lineTo(width, mouse.y + 0.5);
        ctx.moveTo(mouse.x + 0.5, 0);
        ctx.lineTo(mouse.x + 0.5, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Precision 4-Corner Crosshair Brackets
        ctx.strokeStyle = '#F2F0EB';
        ctx.lineWidth = 1.2;
        const bRadius = 14;
        const bArm = 4;

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(mouse.x - bRadius, mouse.y - bRadius + bArm);
        ctx.lineTo(mouse.x - bRadius, mouse.y - bRadius);
        ctx.lineTo(mouse.x - bRadius + bArm, mouse.y - bRadius);
        // Top-Right
        ctx.moveTo(mouse.x + bRadius - bArm, mouse.y - bRadius);
        ctx.lineTo(mouse.x + bRadius, mouse.y - bRadius);
        ctx.lineTo(mouse.x + bRadius, mouse.y - bRadius + bArm);
        // Bottom-Right
        ctx.moveTo(mouse.x + bRadius, mouse.y + bRadius - bArm);
        ctx.lineTo(mouse.x + bRadius, mouse.y + bRadius);
        ctx.lineTo(mouse.x + bRadius - bArm, mouse.y + bRadius);
        // Bottom-Left
        ctx.moveTo(mouse.x - bRadius + bArm, mouse.y + bRadius);
        ctx.lineTo(mouse.x - bRadius, mouse.y + bRadius);
        ctx.lineTo(mouse.x - bRadius, mouse.y + bRadius - bArm);
        ctx.stroke();

        // Monospace Live Coordinate Readout Badge
        const coordText = `[ X: ${Math.round(mouse.x).toString().padStart(4, '0')} · Y: ${Math.round(mouse.y).toString().padStart(4, '0')} ]`;
        ctx.font = '9px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(coordText).width;

        // Keep badge cleanly on screen
        const badgeX = Math.min(width - textWidth - 28, mouse.x + 20);
        const badgeY = Math.min(height - 24, mouse.y + 20);

        ctx.fillStyle = 'rgba(14, 14, 14, 0.92)';
        ctx.fillRect(badgeX - 4, badgeY - 10, textWidth + 8, 16);
        ctx.strokeStyle = 'rgba(242, 240, 235, 0.22)';
        ctx.strokeRect(badgeX - 4, badgeY - 10, textWidth + 8, 16);

        ctx.fillStyle = '#F2F0EB';
        ctx.fillText(coordText, badgeX, badgeY + 2);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 w-full h-full select-none"
      aria-hidden="true"
    />
  );
};