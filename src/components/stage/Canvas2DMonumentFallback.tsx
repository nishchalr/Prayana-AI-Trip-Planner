import React, { useEffect, useMemo, useRef } from 'react';

interface Canvas2DMonumentFallbackProps {
  destinationId: string;
  accentColor: string;
  isLight: boolean;
  isAutoRotating: boolean;
  resetTrigger: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface QuadFace {
  verts: [Vec3, Vec3, Vec3, Vec3];
  shadeBias?: number;
  isWire?: boolean;
}

function addBox(
  faces: QuadFace[],
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  shadeBias = 0
) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const p = [
    { x: cx - hw, y: cy - hh, z: cz - hd }, // 0
    { x: cx + hw, y: cy - hh, z: cz - hd }, // 1
    { x: cx + hw, y: cy + hh, z: cz - hd }, // 2
    { x: cx - hw, y: cy + hh, z: cz - hd }, // 3
    { x: cx - hw, y: cy - hh, z: cz + hd }, // 4
    { x: cx + hw, y: cy - hh, z: cz + hd }, // 5
    { x: cx + hw, y: cy + hh, z: cz + hd }, // 6
    { x: cx - hw, y: cy + hh, z: cz + hd }, // 7
  ];
  faces.push(
    { verts: [p[4], p[5], p[6], p[7]], shadeBias }, // front
    { verts: [p[1], p[0], p[3], p[2]], shadeBias }, // back
    { verts: [p[0], p[4], p[7], p[3]], shadeBias }, // left
    { verts: [p[5], p[1], p[2], p[6]], shadeBias }, // right
    { verts: [p[3], p[7], p[6], p[2]], shadeBias: shadeBias + 0.12 }, // top
    { verts: [p[0], p[1], p[5], p[4]], shadeBias: shadeBias - 0.15 } // bottom
  );
}

function addCylinder(
  faces: QuadFace[],
  cx: number,
  cy: number,
  cz: number,
  rTop: number,
  rBottom: number,
  h: number,
  segs = 10,
  shadeBias = 0
) {
  const hh = h / 2;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const b0 = { x: cx + Math.cos(a0) * rBottom, y: cy - hh, z: cz + Math.sin(a0) * rBottom };
    const b1 = { x: cx + Math.cos(a1) * rBottom, y: cy - hh, z: cz + Math.sin(a1) * rBottom };
    const t0 = { x: cx + Math.cos(a0) * rTop, y: cy + hh, z: cz + Math.sin(a0) * rTop };
    const t1 = { x: cx + Math.cos(a1) * rTop, y: cy + hh, z: cz + Math.sin(a1) * rTop };
    faces.push({ verts: [b0, b1, t1, t0], shadeBias });
  }
}

function addDome(
  faces: QuadFace[],
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  heightScale = 1,
  segs = 10,
  rings = 4
) {
  for (let r = 0; r < rings; r++) {
    const phi0 = (r / rings) * (Math.PI / 2);
    const phi1 = ((r + 1) / rings) * (Math.PI / 2);
    const y0 = cy + Math.sin(phi0) * radius * heightScale;
    const y1 = cy + Math.sin(phi1) * radius * heightScale;
    const r0 = Math.cos(phi0) * radius;
    const r1 = Math.cos(phi1) * radius;
    for (let s = 0; s < segs; s++) {
      const th0 = (s / segs) * Math.PI * 2;
      const th1 = ((s + 1) / segs) * Math.PI * 2;
      faces.push({
        verts: [
          { x: cx + Math.cos(th0) * r0, y: y0, z: cz + Math.sin(th0) * r0 },
          { x: cx + Math.cos(th1) * r0, y: y0, z: cz + Math.sin(th1) * r0 },
          { x: cx + Math.cos(th1) * r1, y: y1, z: cz + Math.sin(th1) * r1 },
          { x: cx + Math.cos(th0) * r1, y: y1, z: cz + Math.sin(th0) * r1 },
        ],
        shadeBias: 0.08,
      });
    }
  }
}

function buildMonumentFaces(destinationId: string): QuadFace[] {
  const f: QuadFace[] = [];

  switch (destinationId) {
    case 'jaipur': {
      // Hawa Mahal: curved tiered sandstone honeycomb jharokha facade
      addBox(f, 0, 0.14, 0, 2.3, 0.28, 0.9, -0.05);
      const tiers = [
        { y: 0.54, w: 2.1, h: 0.48, d: 0.72, bays: 5 },
        { y: 1.02, w: 1.85, h: 0.44, d: 0.62, bays: 5 },
        { y: 1.46, w: 1.5, h: 0.4, d: 0.52, bays: 3 },
        { y: 1.86, w: 1.05, h: 0.36, d: 0.42, bays: 3 },
      ];
      tiers.forEach((tier) => {
        addBox(f, 0, tier.y, -0.08, tier.w, tier.h, tier.d * 0.75);
        for (let i = 0; i < tier.bays; i++) {
          const frac = tier.bays === 1 ? 0 : i / (tier.bays - 1) - 0.5;
          const bx = frac * (tier.w * 0.78);
          const bz = 0.22 + (1 - Math.abs(frac) * 1.4) * 0.14;
          addBox(f, bx, tier.y, bz, 0.26, tier.h * 0.85, 0.24, 0.08);
          addDome(f, bx, tier.y + tier.h * 0.42, bz, 0.12, 1.15, 6, 3);
        }
      });
      addDome(f, 0, 2.04, 0, 0.28, 1.25, 8, 3);
      addCylinder(f, 0, 2.48, 0, 0.015, 0.04, 0.22, 6, 0.15);
      break;
    }
    case 'agra': {
      // Taj Mahal: marble plinth, grand onion dome, chhatris & 4 corner minarets
      addBox(f, 0, 0.16, 0, 2.4, 0.32, 2.4, -0.04);
      addBox(f, 0, 0.72, 0, 1.28, 0.82, 1.28, 0.04);
      addCylinder(f, 0, 1.25, 0, 0.44, 0.46, 0.26, 12, 0.08);
      addDome(f, 0, 1.38, 0, 0.46, 1.25, 12, 5);
      addCylinder(f, 0, 2.12, 0, 0.015, 0.04, 0.34, 6, 0.16);
      const corners = [
        [-0.98, -0.98],
        [0.98, -0.98],
        [-0.98, 0.98],
        [0.98, 0.98],
      ];
      corners.forEach(([mx, mz]) => {
        addCylinder(f, mx, 0.92, mz, 0.07, 0.11, 1.24, 8, 0.05);
        addDome(f, mx, 1.54, mz, 0.09, 1.1, 8, 3);
      });
      break;
    }
    case 'hampi': {
      // Vittala Stone Chariot: stepped base, stone wheels, pillared mandapa + dravida vimana
      addBox(f, 0, 0.16, 0, 1.85, 0.24, 1.45, -0.05);
      [-0.72, 0.72].forEach((wx) => {
        [-0.68, 0.68].forEach((wz) => {
          addCylinder(f, wx, 0.28, wz, 0.26, 0.26, 0.14, 10, 0.08);
        });
      });
      addBox(f, 0, 0.72, 0, 1.35, 0.85, 1.08, 0.03);
      addBox(f, 0, 1.28, 0, 1.05, 0.26, 0.85, 0.06);
      addBox(f, 0, 1.55, 0, 0.78, 0.24, 0.65, 0.08);
      addBox(f, 0, 1.8, 0, 0.52, 0.22, 0.45, 0.1);
      addDome(f, 0, 1.91, 0, 0.24, 1.1, 8, 3);
      break;
    }
    case 'paris': {
      // Eiffel Tower: four sloped lattice legs converging into tapering spire
      addBox(f, 0, 0.06, 0, 1.8, 0.12, 1.8, -0.08);
      addCylinder(f, 0, 0.55, 0, 0.52, 0.88, 0.92, 4, 0.02);
      addBox(f, 0, 1.03, 0, 0.96, 0.12, 0.96, 0.08);
      addCylinder(f, 0, 1.48, 0, 0.26, 0.48, 0.82, 4, 0.04);
      addBox(f, 0, 1.92, 0, 0.46, 0.1, 0.46, 0.1);
      addCylinder(f, 0, 2.38, 0, 0.05, 0.22, 0.88, 4, 0.1);
      addCylinder(f, 0, 2.95, 0, 0.01, 0.03, 0.28, 4, 0.18);
      break;
    }
    case 'kyoto':
    case 'darjeeling': {
      // Kinkaku-ji / Pagoda: stepped wide eaves + golden finial spire
      addBox(f, 0, 0.12, 0, 1.9, 0.24, 1.7, -0.04);
      [0.45, 0.92, 1.38, 1.8].forEach((y, idx) => {
        const s = 1 - idx * 0.18;
        addBox(f, 0, y, 0, 1.15 * s, 0.3, 1.0 * s, 0.02 + idx * 0.03);
        addBox(f, 0, y + 0.19, 0, 1.55 * s, 0.1, 1.4 * s, 0.1);
      });
      addCylinder(f, 0, 2.25, 0, 0.02, 0.08, 0.65, 8, 0.18);
      break;
    }
    case 'singapore': {
      // Marina Bay Sands: 3 canted towers crowned by SkyPark cantilevered deck
      [-0.78, 0, 0.78].forEach((tx) => {
        addBox(f, tx - 0.1, 0.85, 0.06, 0.3, 1.7, 0.42, 0.04);
        addBox(f, tx + 0.1, 0.85, -0.06, 0.28, 1.7, 0.4, 0.02);
      });
      addBox(f, 0.05, 1.82, 0, 2.45, 0.18, 0.68, 0.12);
      addBox(f, 0.95, 1.96, 0, 0.55, 0.1, 0.56, 0.16);
      break;
    }
    case 'mysuru':
    case 'udaipur': {
      // Royal Palace facade + multi-domed skyline
      addBox(f, 0, 0.2, 0, 2.4, 0.36, 1.1, -0.04);
      addBox(f, 0, 0.78, 0, 2.2, 0.82, 0.92, 0.04);
      addBox(f, 0, 1.32, 0, 0.85, 0.4, 0.78, 0.08);
      addDome(f, 0, 1.52, 0, 0.36, 1.25, 10, 4);
      [-0.82, 0.82].forEach((dx) => {
        addCylinder(f, dx, 1.34, 0, 0.2, 0.22, 0.32, 8, 0.06);
        addDome(f, dx, 1.5, 0, 0.22, 1.15, 8, 3);
      });
      break;
    }
    case 'london': {
      // Elizabeth Tower (Big Ben)
      addBox(f, 0, 0.92, 0, 0.72, 1.84, 0.72, 0.02);
      addBox(f, 0, 1.96, 0, 0.82, 0.46, 0.82, 0.12);
      addCylinder(f, 0, 2.48, 0, 0.04, 0.42, 0.62, 4, 0.14);
      addCylinder(f, 0, 2.88, 0, 0.01, 0.03, 0.24, 4, 0.2);
      break;
    }
    case 'tokyo': {
      // Tokyo Skytree
      addCylinder(f, 0, 0.62, 0, 0.34, 0.58, 1.24, 6, 0.02);
      addCylinder(f, 0, 1.48, 0, 0.16, 0.32, 0.65, 8, 0.08);
      addCylinder(f, 0, 1.86, 0, 0.42, 0.42, 0.16, 12, 0.14);
      addCylinder(f, 0, 2.22, 0, 0.09, 0.15, 0.58, 8, 0.1);
      addCylinder(f, 0, 2.52, 0, 0.26, 0.26, 0.12, 10, 0.16);
      addCylinder(f, 0, 2.86, 0, 0.015, 0.06, 0.62, 6, 0.18);
      break;
    }
    default: {
      // Balanced stepped heritage monument / tower silhouette
      addBox(f, 0, 0.15, 0, 2.0, 0.3, 1.6, -0.05);
      addBox(f, 0, 0.62, 0, 1.5, 0.64, 1.2, 0.03);
      addBox(f, 0, 1.12, 0, 1.05, 0.42, 0.9, 0.06);
      addBox(f, 0, 1.5, 0, 0.68, 0.36, 0.62, 0.09);
      addDome(f, 0, 1.68, 0, 0.32, 1.15, 10, 4);
      addCylinder(f, 0, 2.15, 0, 0.015, 0.04, 0.28, 6, 0.18);
      break;
    }
  }
  return f;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export const Canvas2DMonumentFallback: React.FC<Canvas2DMonumentFallbackProps> = ({
  destinationId,
  accentColor,
  isLight,
  isAutoRotating,
  resetTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yawRef = useRef<number>(0.42);
  const pitchRef = useRef<number>(0.24);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const autoRotateRef = useRef<boolean>(isAutoRotating);
  autoRotateRef.current = isAutoRotating;

  const faces = useMemo(() => buildMonumentFaces(destinationId), [destinationId]);
  const [baseR, baseG, baseB] = useMemo(() => hexToRgb(accentColor || '#C8A882'), [accentColor]);

  useEffect(() => {
    yawRef.current = 0.42;
    pitchRef.current = 0.24;
  }, [destinationId, resetTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let t = 0;

    const render = () => {
      t += 0.016;
      if (autoRotateRef.current && !dragRef.current.active) {
        yawRef.current += 0.0055;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.66;
      const scale = Math.min(width, height) * 0.22;

      // Rippling steel pedestal rings matching the Three.js stage aesthetic
      const ringCount = 5;
      for (let i = ringCount; i >= 1; i--) {
        const phase = ((t * 0.45 + i / ringCount) % 1);
        const rx = scale * (0.95 + i * 0.25 + phase * 0.14);
        const ry = rx * 0.34;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 8, rx, ry, 0, 0, Math.PI * 2);
        if (i === 1) {
          ctx.fillStyle = isLight ? 'rgba(200, 198, 192, 0.55)' : 'rgba(29, 33, 39, 0.72)';
          ctx.fill();
        }
        ctx.strokeStyle = isLight
          ? `rgba(17, 17, 17, ${0.14 - i * 0.02})`
          : `rgba(255, 255, 255, ${0.16 - i * 0.025})`;
        ctx.lineWidth = i === 1 ? 1.4 : 0.9;
        ctx.stroke();
      }

      const cosY = Math.cos(yawRef.current);
      const sinY = Math.sin(yawRef.current);
      const cosP = Math.cos(pitchRef.current);
      const sinP = Math.sin(pitchRef.current);
      const camDist = 6.2;

      const project = (v: Vec3) => {
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;
        const y2 = (v.y - 0.95) * cosP - z1 * sinP;
        const z2 = (v.y - 0.95) * sinP + z1 * cosP;
        const persp = camDist / Math.max(1.2, camDist - z2);
        return {
          sx: cx + x1 * scale * persp,
          sy: cy - (y2 + 0.85) * scale * persp,
          z: z2,
          rx: x1,
          ry: y2,
          rz: z2,
        };
      };

      const projectedFaces = faces
        .map((face) => {
          const pts = face.verts.map(project);
          const avgZ = (pts[0].z + pts[1].z + pts[2].z + pts[3].z) / 4;
          const ax = pts[1].rx - pts[0].rx;
          const ay = pts[1].ry - pts[0].ry;
          const az = pts[1].rz - pts[0].rz;
          const bx = pts[2].rx - pts[0].rx;
          const by = pts[2].ry - pts[0].ry;
          const bz = pts[2].rz - pts[0].rz;
          let nx = ay * bz - az * by;
          let ny = az * bx - ax * bz;
          let nz = ax * by - ay * bx;
          const len = Math.hypot(nx, ny, nz) || 1;
          nx /= len;
          ny /= len;
          nz /= len;

          // Key + Rim metallic light calculation
          const keyDot = Math.max(0, nx * 0.55 + ny * 0.72 + nz * 0.42);
          const rimDot = Math.max(0, -nx * 0.6 + ny * 0.35 - nz * 0.7) * 0.35;
          const lum = Math.min(1.25, Math.max(0.28, 0.36 + keyDot * 0.72 + rimDot + (face.shadeBias ?? 0)));

          return { pts, avgZ, lum };
        })
        .sort((a, b) => a.avgZ - b.avgZ);

      for (const pf of projectedFaces) {
        const r = Math.min(255, Math.round(baseR * pf.lum));
        const g = Math.min(255, Math.round(baseG * pf.lum));
        const b = Math.min(255, Math.round(baseB * pf.lum));

        ctx.beginPath();
        ctx.moveTo(pf.pts[0].sx, pf.pts[0].sy);
        ctx.lineTo(pf.pts[1].sx, pf.pts[1].sy);
        ctx.lineTo(pf.pts[2].sx, pf.pts[2].sy);
        ctx.lineTo(pf.pts[3].sx, pf.pts[3].sy);
        ctx.closePath();

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(17, 17, 17, 0.22)' : 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [faces, baseR, baseG, baseB, isLight]);

  return (
    <div
      className="relative w-full h-full select-none"
      onPointerDown={(e) => {
        dragRef.current = { active: true, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
        yawRef.current += dx * 0.011;
        pitchRef.current = Math.max(-0.18, Math.min(0.65, pitchRef.current + dy * 0.006));
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
      }}
      onPointerCancel={() => {
        dragRef.current.active = false;
      }}
      onPointerLeave={() => {
        dragRef.current.active = false;
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div
        className={`pointer-events-none absolute top-3 right-3 px-2 py-1 border font-mono text-[8.5px] uppercase tracking-[0.14em] ${
          isLight
            ? 'border-ink/15 bg-paper/85 text-ink/55'
            : 'border-white/15 bg-[#111111]/85 text-white/55'
        }`}
      >
        CANVAS2D PROJECTION // WEBGL SANDBOXED
      </div>
    </div>
  );
};
