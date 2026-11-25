import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PrayanaLogo3DProps {
  size?: number;
  theme?: 'light' | 'dark';
  spinSpeed?: number;
  className?: string;
}

class CanvasFallbackBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function LogoSphereMesh({
  theme = 'dark',
  spinSpeed = 0.55,
  hovered,
}: {
  theme: 'light' | 'dark';
  spinSpeed: number;
  hovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let active = true;
    let createdTex: THREE.CanvasTexture | null = null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/prayana-logo.png';

    img.onload = () => {
      if (!active) return;

      // 2:1 equirectangular canvas so the circular emblem stays 1:1 on front & back
      const width = 1024;
      const height = 512;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Base sphere fill matching the active theme
      ctx.fillStyle = theme === 'light' ? '#F2F0EB' : '#111111';
      ctx.fillRect(0, 0, width, height);

      // Subtle architectural equator hairline
      ctx.strokeStyle =
        theme === 'light' ? 'rgba(14, 14, 14, 0.14)' : 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw circular emblem cleanly on front (u=0.25) and back (u=0.75)
      const logoSize = 360;
      const y = (height - logoSize) / 2;

      const drawEmblemAt = (centerX: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, height / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, centerX - logoSize / 2, y, logoSize, logoSize);
        ctx.restore();
      };

      drawEmblemAt(width * 0.25);
      drawEmblemAt(width * 0.75);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      createdTex = tex;
      setTexture(tex);
    };

    return () => {
      active = false;
      createdTex?.dispose();
    };
  }, [theme]);

  const targetTilt = useMemo(() => (hovered ? 0.22 : 0.06), [hovered]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = hovered ? spinSpeed * 1.8 : spinSpeed;
    meshRef.current.rotation.y += delta * speed;
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetTilt,
      Math.min(1, delta * 6)
    );
  });

  return (
    <mesh ref={meshRef} rotation={[0.06, -Math.PI / 2, 0]}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshPhysicalMaterial
        map={texture}
        color="#ffffff"
        roughness={0.28}
        metalness={0.12}
        clearcoat={0.65}
        clearcoatRoughness={0.18}
      />
    </mesh>
  );
}

export const PrayanaLogo3D: React.FC<PrayanaLogo3DProps> = ({
  size = 40,
  theme = 'dark',
  spinSpeed = 0.55,
  className = '',
}) => {
  const [hovered, setHovered] = useState(false);
  const [webglFailed, setWebglFailed] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    try {
      const testCanvas = document.createElement('canvas');
      const gl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      return !gl;
    } catch {
      return true;
    }
  });

  const fallbackLogo = (
    <div
      className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ring-1 ${
        theme === 'light'
          ? 'bg-[#F2F0EB] ring-[#0E0E0E]/20'
          : 'bg-[#0E0E0E] ring-[#F2F0EB]/35'
      }`}
    >
      <img
        src="/prayana-logo.png"
        alt="Prayana"
        className="w-[185%] h-[185%] max-w-none object-cover object-[center_34%] pointer-events-none"
      />
    </div>
  );

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 select-none ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Prayana 3D Logo"
    >
      {webglFailed ? (
        fallbackLogo
      ) : (
        <CanvasFallbackBoundary fallback={fallbackLogo}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 2.75], fov: 38 }}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setWebglFailed(true);
              });
            }}
          >
            <ambientLight intensity={theme === 'light' ? 1.55 : 1.25} />
            <directionalLight position={[3, 4, 5]} intensity={1.45} />
            <directionalLight position={[-3, -2, -4]} intensity={0.45} />
            <LogoSphereMesh theme={theme} spinSpeed={spinSpeed} hovered={hovered} />
          </Canvas>
        </CanvasFallbackBoundary>
      )}
    </div>
  );
};

export default PrayanaLogo3D;
