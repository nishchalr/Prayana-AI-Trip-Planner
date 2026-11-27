import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, MotionValue, useMotionValue, useTransform } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
} from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { usePrayana } from '../../context/PrayanaContext';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { RotateCcw } from 'lucide-react';
import {
  AgraTajMahal,
  JaipurHawaMahal,
  UdaipurLakePalace,
  MysuruPalace,
  MunnarTeaRidge,
  AlleppeyHouseboat,
  LehShantiStupa,
  RishikeshBridge,
  GoaAguadaLighthouse,
  KonarkSunChariot,
  DarjeelingPagoda,
  KochiFishingNets,
  ParisEiffelTower,
  SingaporeMarinaSkyPark,
} from './ExtraMonuments';
import {
  AmritsarGoldenTemple,
  KhajurahoShikhara,
  JaisalmerSonarFort,
  OotyNilgiriViaduct,
  ShillongMegaliths,
  KanyakumariRockMemorial,
  MahabalipuramShoreTemple,
  RameswaramCorridor,
  LondonElizabethTower,
  TokyoSkytree,
} from './MoreMonuments';

// Authentic Single-Color Material Map for all 28 Monuments
export const MONUMENT_COLORS: Record<string, string> = {
  hampi: '#C8A882',         // Warm Granite
  coorg: '#B86B4B',         // Laterite Terracotta
  kyoto: '#D4AF37',         // Gold Leaf
  varanasi: '#D29960',      // Ghats Sandstone
  jaipur: '#D97A6C',        // Pink Terracotta
  agra: '#EFECE6',          // Makrana Marble
  udaipur: '#EAE6DF',       // Pearl Marble
  mysuru: '#C9965B',        // Royal Ochre
  munnar: '#3E6B48',        // Tea Emerald
  alleppey: '#9C6B3B',      // Coir Teak
  leh: '#E5E7EB',           // Chalk White
  rishikesh: '#6B8E78',     // Sage Steel
  goa: '#D6C6B2',           // Coastal Laterite
  konark: '#A65E46',        // Khondalite Ochre
  darjeeling: '#9E4747',    // Monastery Crimson
  kochi: '#8B5E3C',         // Seasoned Teak
  paris: '#7A6855',         // Iron Bronze
  singapore: '#8E9BAE',     // Titanium Slate
  amritsar: '#D4AF37',      // Sacred Gold
  khajuraho: '#C9A679',     // Buff Sandstone
  jaisalmer: '#D4A84F',     // Honey Sandstone
  ooty: '#4A6B53',          // Nilgiri Pine
  shillong: '#5D7A8C',      // Slate Blue
  kanyakumari: '#8C857B',   // Coastal Granite
  mahabalipuram: '#A89F91', // Pallava Granite
  rameswaram: '#C78D59',    // Temple Ochre
  london: '#CFC5B4',        // Portland Limestone
  tokyo: '#5B708B',         // Indigo Steel
};

const MonumentColorContext = React.createContext<string>('#C8A882');

// High-Contrast Liquid-Metal Physical Material (single architectural color per destination)
export const ChromeMaterial: React.FC<{ gunmetal?: boolean }> = ({ gunmetal = false }) => {
  const { theme } = usePrayana();
  const baseHex = React.useContext(MonumentColorContext);
  const isLight = theme === 'light';
  const color = useMemo(() => {
    const c = new THREE.Color(baseHex);
    if (gunmetal) {
      c.multiplyScalar(isLight ? 0.72 : 0.68);
    }
    return `#${c.getHexString()}`;
  }, [baseHex, gunmetal, isLight]);

  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.88}
      roughness={gunmetal ? 0.18 : 0.13}
      clearcoat={1.0}
      clearcoatRoughness={0.07}
      envMapIntensity={2.0}
    />
  );
};

// Procedural Architectural Building Tier with Damped Spring Overshoot (always mounted for Box3 normalization)
interface BuildingTierProps {
  tierIndex: number;
  time: number;
  children: React.ReactNode;
}

export const BuildingTier: React.FC<BuildingTierProps> = ({ tierIndex, time, children }) => {
  const startTime = 0.12 + tierIndex * 0.08;
  const duration = 0.34;
  const isVisible = time >= startTime;
  const p = isVisible ? Math.min(1, Math.max(0, (time - startTime) / duration)) : 0;

  // Damped harmonic overshoot spring
  const spring = p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

  const yOffset = !isVisible ? 0 : tierIndex === 0 ? -0.65 * (1 - spring) : 0.45 * (1 - spring);
  const scale = !isVisible ? 1 : tierIndex === 0 ? 1 : Math.max(0.01, 0.05 + 0.95 * spring);

  return (
    <group
      visible={isVisible}
      position={[0, yOffset, 0]}
      scale={[scale, scale, scale]}
      userData={{ isBuildingTier: true }}
    >
      {children}
    </group>
  );
};

// Auto-Normalizes ALL 28 Monuments to ~2.5 max dimension centered on the pedestal (y = 0)
const AutoNormalizedMonument: React.FC<{ destinationId: string; children: React.ReactNode }> = ({
  destinationId,
  children,
}) => {
  const wrapperRef = useRef<THREE.Group>(null);
  const contentRef = useRef<THREE.Group>(null);
  const normRef = useRef<{ scale: number; offsetX: number; offsetY: number; offsetZ: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
  });
  const animScaleRef = useRef<number>(0.88);
  const animYRef = useRef<number>(-0.12);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const wrapper = wrapperRef.current;
    if (!content || !wrapper) return;

    const saved: Array<{ obj: THREE.Object3D; vis: boolean; pos: THREE.Vector3; scl: THREE.Vector3 }> = [];
    content.traverse((obj) => {
      if (obj.userData?.isBuildingTier) {
        saved.push({
          obj,
          vis: obj.visible,
          pos: obj.position.clone(),
          scl: obj.scale.clone(),
        });
        obj.visible = true;
        obj.position.set(0, 0, 0);
        obj.scale.set(1, 1, 1);
      }
    });

    wrapper.scale.set(1, 1, 1);
    wrapper.position.set(0, 0, 0);
    wrapper.rotation.set(0, 0, 0);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(content);
    saved.forEach((s) => {
      s.obj.visible = s.vis;
      s.obj.position.copy(s.pos);
      s.obj.scale.copy(s.scl);
    });

    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const scale = THREE.MathUtils.clamp(2.5 / maxDim, 0.55, 2.2);
      const pedestalSurfaceY = -1.455; // Monument sits grounded flush ON the pool surface
      normRef.current = {
        scale,
        offsetX: -center.x * scale,
        offsetY: pedestalSurfaceY - box.min.y * scale,
        offsetZ: -center.z * scale,
      };
    }

    const { scale, offsetX, offsetY, offsetZ } = normRef.current;
    animScaleRef.current = scale * 0.88;
    animYRef.current = offsetY - 0.14;

    wrapper.position.set(offsetX, animYRef.current, offsetZ);
    wrapper.scale.setScalar(animScaleRef.current);

    const animProxy = {
      scale: animScaleRef.current,
      y: animYRef.current,
      rotY: -0.22,
    };

    const tween = gsap.to(animProxy, {
      scale,
      y: offsetY,
      rotY: 0,
      duration: 0.72,
      ease: 'power3.out',
      onUpdate: () => {
        if (!wrapperRef.current) return;
        animScaleRef.current = animProxy.scale;
        animYRef.current = animProxy.y;
        wrapperRef.current.scale.setScalar(animProxy.scale);
        wrapperRef.current.position.set(offsetX, animProxy.y, offsetZ);
        wrapperRef.current.rotation.y = animProxy.rotY;
      },
    });

    return () => {
      tween.kill();
    };
  }, [destinationId]);

  // Monument is grounded on the pool — no hover float needed.
  // GSAP entrance tween already drives animYRef.current → offsetY via onUpdate.

  return (
    <group ref={wrapperRef}>
      <group ref={contentRef}>{children}</group>
    </group>
  );
};

// 1. HAMPI STONE CHARIOT IN LIQUID SILVER CHROME & STEEL
const HampiStoneChariot: React.FC<{ time: number }> = ({ time }) => {
  return (
    <group scale={[0.50, 0.50, 0.50]}>
      {/* 01: Stepped Plinth Base (Adhisthana) */}
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.3, 3.6]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.25, 3.2]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.9, 0.25, 2.9]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      {/* 02: Monolithic Carved Wheels & Axles */}
      <BuildingTier tierIndex={1} time={time}>
        {[
          [-1.6, 0.45, 1.3],
          [1.6, 0.45, 1.3],
          [-1.6, 0.45, -1.3],
          [1.6, 0.45, -1.3],
        ].map((pos, idx) => (
          <group key={`wheel-${idx}`} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.42, 0.42, 0.18, 24]} />
              <ChromeMaterial />
</mesh>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.22, 16]} />
              <ChromeMaterial gunmetal />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 03: Mandapa Sanctum Body & Pillars */}
      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 1.1, 2.5]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 1.15, 1.26]}>
          <boxGeometry args={[0.9, 0.9, 0.1]} />
          <ChromeMaterial gunmetal />
        </mesh>
        {[
          [-1.15, 1.3, 1.15],
          [1.15, 1.3, 1.15],
          [-1.15, 1.3, -1.15],
          [1.15, 1.3, -1.15],
          [-1.15, 1.3, 0],
          [1.15, 1.3, 0],
        ].map((pos, idx) => (
          <group key={`pillar-${idx}`} position={pos as [number, number, number]}>
            <mesh castShadow>
              <boxGeometry args={[0.22, 1.1, 0.22]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.32, 0.1, 0.32]} />
              <ChromeMaterial gunmetal />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 04: Intermediate Cornice (Kapota) & Tala 1 */}
      <BuildingTier tierIndex={3} time={time}>
        <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.18, 2.8]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.12, 2.4]} />
          <ChromeMaterial gunmetal />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.7, 2.1]} />
          <ChromeMaterial />
</mesh>
        {[-0.85, 0, 0.85].map((x, idx) => (
          <mesh key={`kuta-1-${idx}`} position={[x, 2.5, 1.08]} castShadow>
            <boxGeometry args={[0.3, 0.55, 0.12]} />
            <ChromeMaterial gunmetal />
          </mesh>
        ))}
      </BuildingTier>

      {/* 05: Upper Tala 2 & Shikhara Dome */}
      <BuildingTier tierIndex={4} time={time}>
        <mesh position={[0, 2.92, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 0.15, 2.3]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 3.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.6, 1.6]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 3.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.75, 0.12, 1.75]} />
          <ChromeMaterial gunmetal />
        </mesh>
        <mesh position={[0, 3.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.5, 1.3]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 4.3, 0]} castShadow>
          <sphereGeometry args={[0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>

      {/* 06: Kalasha Finial */}
      <BuildingTier tierIndex={5} time={time}>
        <mesh position={[0, 4.65, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.12, 0.45, 12]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>
    </group>
  );
};

// 2. COORG RAJA'S SEAT IN LIQUID SILVER CHROME & STEEL
const CoorgRajasSeat: React.FC<{ time: number }> = ({ time }) => {
  return (
    <group scale={[0.55, 0.55, 0.55]}>
      {/* 01: Octagonal Plinth Base */}
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.4, 2.7, 0.4, 8]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      {/* 02: Plinth Step 2 */}
      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.1, 2.4, 0.3, 8]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      {/* 03: Surrounding Arched Colonnade Pillars */}
      <BuildingTier tierIndex={2} time={time}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * Math.PI) / 4;
          const x = Math.sin(angle) * 1.75;
          const z = Math.cos(angle) * 1.75;
          return (
            <group key={`col-${i}`} position={[x, 1.45, z]}>
              <mesh position={[0, -0.75, 0]} castShadow>
                <boxGeometry args={[0.26, 0.2, 0.26]} />
                <ChromeMaterial gunmetal />
              </mesh>
              <mesh castShadow>
                <cylinderGeometry args={[0.1, 0.12, 1.5, 16]} />
                <ChromeMaterial />
</mesh>
              <mesh position={[0, 0.75, 0]} castShadow>
                <boxGeometry args={[0.3, 0.18, 0.3]} />
                <ChromeMaterial gunmetal />
              </mesh>
            </group>
          );
        })}
      </BuildingTier>

      {/* 04: Arch Lintel Ring & Projecting Royal Eaves */}
      <BuildingTier tierIndex={3} time={time}>
        <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.9, 1.9, 0.2, 8]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.15, 1.85, 0.18, 8]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 2.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.65, 0.32, 16]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>

      {/* 05: Hemispherical Kodagu Royal Dome */}
      <BuildingTier tierIndex={4} time={time}>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[1.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>

      {/* 06: Brass / Chrome Kalasha Finial */}
      <BuildingTier tierIndex={5} time={time}>
        <mesh position={[0, 3.85, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.18, 0.55, 12]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>
    </group>
  );
};

// 3. KYOTO FIVE-STORY PAGODA IN LIQUID SILVER CHROME & STEEL
const KyotoPagoda: React.FC<{ time: number }> = ({ time }) => {
  const tiers = [
    { scale: 1.0, y: 0.6 },
    { scale: 0.88, y: 1.35 },
    { scale: 0.76, y: 2.1 },
    { scale: 0.65, y: 2.85 },
    { scale: 0.54, y: 3.6 },
  ];

  return (
    <group scale={[0.46, 0.46, 0.46]}>
      {/* 01: Stone Foundation Base */}
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.3, 3.2]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.7, 0.2, 2.7]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      {/* 02: Tier 1 & 2 */}
      <BuildingTier tierIndex={1} time={time}>
        {tiers.slice(0, 2).map((t, idx) => (
          <group key={`k-tier-${idx}`} position={[0, t.y, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5 * t.scale, 0.55, 1.5 * t.scale]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[1.75 * t.scale, 0.1, 1.75 * t.scale]} />
              <ChromeMaterial gunmetal />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
              <coneGeometry args={[2.2 * t.scale, 0.35, 4]} />
              <ChromeMaterial />
</mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 03: Tier 3 */}
      <BuildingTier tierIndex={2} time={time}>
        {tiers.slice(2, 3).map((t, idx) => (
          <group key={`k-tier-3`} position={[0, t.y, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5 * t.scale, 0.55, 1.5 * t.scale]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[1.75 * t.scale, 0.1, 1.75 * t.scale]} />
              <ChromeMaterial gunmetal />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
              <coneGeometry args={[2.2 * t.scale, 0.35, 4]} />
              <ChromeMaterial />
</mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 04: Tier 4 */}
      <BuildingTier tierIndex={3} time={time}>
        {tiers.slice(3, 4).map((t) => (
          <group key={`k-tier-4`} position={[0, t.y, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5 * t.scale, 0.55, 1.5 * t.scale]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[1.75 * t.scale, 0.1, 1.75 * t.scale]} />
              <ChromeMaterial gunmetal />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
              <coneGeometry args={[2.2 * t.scale, 0.35, 4]} />
              <ChromeMaterial />
</mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 05: Tier 5 */}
      <BuildingTier tierIndex={4} time={time}>
        {tiers.slice(4, 5).map((t) => (
          <group key={`k-tier-5`} position={[0, t.y, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5 * t.scale, 0.55, 1.5 * t.scale]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[1.75 * t.scale, 0.1, 1.75 * t.scale]} />
              <ChromeMaterial gunmetal />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
              <coneGeometry args={[2.2 * t.scale, 0.35, 4]} />
              <ChromeMaterial />
</mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 06: Sacred Top Sorin Spire */}
      <BuildingTier tierIndex={5} time={time}>
        <group position={[0, 4.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.08, 1.4, 12]} />
            <ChromeMaterial gunmetal />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={`ring-${i}`} position={[0, -0.4 + i * 0.11, 0]} castShadow>
              <torusGeometry args={[0.16 - i * 0.007, 0.024, 8, 20]} />
              <ChromeMaterial />
            </mesh>
          ))}
          <mesh position={[0, 0.65, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 12]} />
            <ChromeMaterial />
          </mesh>
        </group>
      </BuildingTier>
    </group>
  );
};

// 4. VARANASI GHAT TEMPLE IN LIQUID SILVER CHROME & STEEL
const VaranasiGhatTemple: React.FC<{ time: number }> = ({ time }) => {
  return (
    <group scale={[0.48, 0.48, 0.48]}>
      {/* 01: Stepped Ghat Steps */}
      <BuildingTier tierIndex={0} time={time}>
        {[0, 1, 2, 3].map((step, idx) => (
          <mesh key={`ghat-${idx}`} position={[0, 0.1 + idx * 0.18, 0.8 + idx * 0.4]} castShadow receiveShadow>
            <boxGeometry args={[3.8 - idx * 0.3, 0.18, 0.55]} />
            <ChromeMaterial gunmetal />
</mesh>
        ))}
      </BuildingTier>

      {/* 02: Main Temple Plinth */}
      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.75, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.5, 2.4]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      {/* 03: Pillared Mandapa Porch */}
      <BuildingTier tierIndex={2} time={time}>
        {[-0.9, 0.9].map((x, idx) => (
          <group key={`m-col-${idx}`} position={[x, 1.5, 0.4]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.1, 0.14, 1.2, 12]} />
              <ChromeMaterial />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[0.28, 0.12, 0.28]} />
              <ChromeMaterial gunmetal />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      {/* 04: Sanctum Cubicle */}
      <BuildingTier tierIndex={3} time={time}>
        <mesh position={[0, 1.55, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 1.3, 1.8]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      {/* 05: Towering Curvilinear Shikhara Spire (Nagara Style) */}
      <BuildingTier tierIndex={4} time={time}>
        <mesh position={[0, 2.7, -0.6]} castShadow receiveShadow>
          <coneGeometry args={[1.1, 1.6, 8]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 3.6, -0.6]} castShadow receiveShadow>
          <coneGeometry args={[0.7, 1.0, 8]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      {/* 06: Ribbed Circular Amalaka & Kalasha Finial */}
      <BuildingTier tierIndex={5} time={time}>
        <mesh position={[0, 4.15, -0.6]} castShadow>
          <cylinderGeometry args={[0.38, 0.34, 0.18, 20]} />
          <ChromeMaterial gunmetal />
        </mesh>
        <mesh position={[0, 4.38, -0.6]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// Upward Sweeping Silver Wireframe Scan Grid Ring (0.0s – 0.25s)
const ScanGridRing: React.FC<{ time: number }> = ({ time }) => {
  if (time > 0.32) return null;
  const p = Math.min(1, time / 0.28);
  const y = p * 2.8; // Sweeps from 0.0 (pedestal surface) to 2.8 in local space
  const opacity = Math.sin(p * Math.PI) * 0.85;

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.8, 1.86, 64]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

// Spatial Metrics per Destination for the Top-Left HUD Strip
const DESTINATION_SPATIAL_METRICS: Record<string, { elev: string; window: string; slope: string }> = {
  hampi: { elev: '467m', window: '06:15 DAWN', slope: '0.8°' },
  coorg: { elev: '1,170m', window: '17:45 SUNSET', slope: '1.2°' },
  kyoto: { elev: '54m', window: '07:00 SOLITUDE', slope: '0.2°' },
  varanasi: { elev: '80m', window: '05:45 DAWN', slope: '1.5°' },
  jaipur: { elev: '431m', window: '06:30 DAWN', slope: '1.5°' },
  agra: { elev: '171m', window: '06:00 DAWN', slope: '0.4°' },
  udaipur: { elev: '598m', window: '17:30 DUSK', slope: '1.8°' },
  mysuru: { elev: '763m', window: '09:30 MORNING', slope: '0.4°' },
  munnar: { elev: '1,600m', window: '05:45 CLOUDLINE', slope: '7.4°' },
  alleppey: { elev: '2m', window: '09:00 BACKWATER', slope: '0.1°' },
  leh: { elev: '3,524m', window: '07:30 CLEAR', slope: '7.5°' },
  rishikesh: { elev: '372m', window: '07:00 GORGE', slope: '2.8°' },
  goa: { elev: '42m', window: '17:45 COAST', slope: '4.2°' },
  konark: { elev: '12m', window: '06:30 DAWN', slope: '0.8°' },
  darjeeling: { elev: '2,042m', window: '05:15 ALPENGLOW', slope: '6.4°' },
  kochi: { elev: '4m', window: '17:30 HARBOUR', slope: '0.2°' },
  paris: { elev: '35m', window: '08:30 SEINE', slope: '0.5°' },
  singapore: { elev: '200m', window: '19:30 SKYLINE', slope: '0.2°' },
  amritsar: { elev: '234m', window: '05:30 SAROVAR', slope: '0.3°' },
  khajuraho: { elev: '283m', window: '07:00 DAWN', slope: '2.1°' },
  jaisalmer: { elev: '225m', window: '17:30 DUNE', slope: '5.5°' },
  ooty: { elev: '2,240m', window: '08:30 SHOLA', slope: '7.2°' },
  shillong: { elev: '1,496m', window: '08:00 MIST', slope: '6.2°' },
  kanyakumari: { elev: '14m', window: '05:50 TRI-SEA', slope: '2.8°' },
  mahabalipuram: { elev: '12m', window: '06:00 SHORE', slope: '0.7°' },
  rameswaram: { elev: '10m', window: '06:00 CORRIDOR', slope: '0.3°' },
  london: { elev: '11m', window: '08:30 THAMES', slope: '0.5°' },
  tokyo: { elev: '40m', window: '09:00 KANTO', slope: '0.4°' },
};

// Monument Model Selector Grounded Flush on Pedestal Top (y = -1.45)
const MonumentStageContent: React.FC<{ destinationId: string; time: number }> = ({ destinationId, time }) => {
  const monumentHex = MONUMENT_COLORS[destinationId] || '#C8A882';
  return (
    <MonumentColorContext.Provider value={monumentHex}>
      <group position={[0, -1.45, 0]}>
        <ScanGridRing time={time} />
      </group>
      <AutoNormalizedMonument destinationId={destinationId}>
        {destinationId === 'hampi' && <HampiStoneChariot time={time} />}
        {destinationId === 'coorg' && <CoorgRajasSeat time={time} />}
        {destinationId === 'kyoto' && <KyotoPagoda time={time} />}
        {destinationId === 'varanasi' && <VaranasiGhatTemple time={time} />}
        {destinationId === 'jaipur' && <JaipurHawaMahal time={time} />}
        {destinationId === 'agra' && <AgraTajMahal time={time} />}
        {destinationId === 'udaipur' && <UdaipurLakePalace time={time} />}
        {destinationId === 'mysuru' && <MysuruPalace time={time} />}
        {destinationId === 'munnar' && <MunnarTeaRidge time={time} />}
        {destinationId === 'alleppey' && <AlleppeyHouseboat time={time} />}
        {destinationId === 'leh' && <LehShantiStupa time={time} />}
        {destinationId === 'rishikesh' && <RishikeshBridge time={time} />}
        {destinationId === 'goa' && <GoaAguadaLighthouse time={time} />}
        {destinationId === 'konark' && <KonarkSunChariot time={time} />}
        {destinationId === 'darjeeling' && <DarjeelingPagoda time={time} />}
        {destinationId === 'kochi' && <KochiFishingNets time={time} />}
        {destinationId === 'paris' && <ParisEiffelTower time={time} />}
        {destinationId === 'singapore' && <SingaporeMarinaSkyPark time={time} />}
        {destinationId === 'amritsar' && <AmritsarGoldenTemple time={time} />}
        {destinationId === 'khajuraho' && <KhajurahoShikhara time={time} />}
        {destinationId === 'jaisalmer' && <JaisalmerSonarFort time={time} />}
        {destinationId === 'ooty' && <OotyNilgiriViaduct time={time} />}
        {destinationId === 'shillong' && <ShillongMegaliths time={time} />}
        {destinationId === 'kanyakumari' && <KanyakumariRockMemorial time={time} />}
        {destinationId === 'mahabalipuram' && <MahabalipuramShoreTemple time={time} />}
        {destinationId === 'rameswaram' && <RameswaramCorridor time={time} />}
        {destinationId === 'london' && <LondonElizabethTower time={time} />}
        {destinationId === 'tokyo' && <TokyoSkytree time={time} />}
      </AutoNormalizedMonument>
    </MonumentColorContext.Provider>
  );
};

// Rippling Liquid Chromatic Steel Base with Subtle Blurry Reflection & Smooth Normal Waves
const REFLECTOR_BLUR: [number, number] = [192, 64];

const LiquidSteelReflector: React.FC<{ isLight: boolean }> = ({ isLight }) => {
  const texSize = 128;
  const rippleData = useMemo(() => new Uint8Array(texSize * texSize * 4), []);
  const rippleTexture = useMemo(() => {
    const tex = new THREE.DataTexture(rippleData, texSize, texSize, THREE.RGBAFormat);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [rippleData]);
  const normalScale = useMemo(() => new THREE.Vector2(0.22, 0.22), []);
  const phaseRef = useRef(0);
  const accumRef = useRef(0);

  useEffect(() => {
    return () => {
      rippleTexture.dispose();
    };
  }, [rippleTexture]);

  useFrame((_, delta) => {
    accumRef.current += delta;
    if (accumRef.current < 0.033) return; // ~30fps concentric ripple update
    phaseRef.current += accumRef.current * 2.0;
    accumRef.current = 0;

    const half = texSize * 0.5;
    for (let y = 0; y < texSize; y++) {
      const dy = (y - half) / half;
      for (let x = 0; x < texSize; x++) {
        const dx = (x - half) / half;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let nx = 0;
        let ny = 0;
        if (dist > 0.001 && dist < 1.0) {
          const coreTaper = Math.min(1, dist / 0.06);
          const wave = Math.cos(dist * 22.0 - phaseRef.current) * Math.exp(-dist * 1.45) * 0.42 * coreTaper;
          nx = (dx / dist) * wave;
          ny = (dy / dist) * wave;
        }
        const idx = (y * texSize + x) * 4;
        rippleData[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        rippleData[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        rippleData[idx + 2] = 245;
        rippleData[idx + 3] = 255;
      }
    }
    rippleTexture.needsUpdate = true;
  });

  return (
    <group>
      {/* Smooth Liquid Mercury Surface with Subtle Faded Blurry Reflection (No Shadows) */}
      <mesh position={[0, -1.455, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <circleGeometry args={[3.1, 64]} />
        <MeshReflectorMaterial
          mirror={0.52}
          mixBlur={4.5}
          mixStrength={0.78}
          roughness={0.17}
          metalness={0.9}
          resolution={256}
          blur={REFLECTOR_BLUR}
          depthScale={0}
          color={isLight ? '#CECFD4' : '#2C323B'}
          normalMap={rippleTexture}
          normalScale={normalScale}
        />
      </mesh>
      {/* Chamfered Liquid-Metal Rim Bezel */}
      <mesh position={[0, -1.505, 0]} receiveShadow={false}>
        <cylinderGeometry args={[3.14, 3.26, 0.09, 64]} />
        <meshPhysicalMaterial
          color={isLight ? '#A9AEB8' : '#282C34'}
          metalness={0.9}
          roughness={0.18}
          clearcoat={0.9}
          envMapIntensity={1.6}
        />
      </mesh>
    </group>
  );
};

// Specular Key Light with 0.95s – 1.15s GSAP Lock Flash
const SpecularLockLight: React.FC<{ destinationId: string }> = ({ destinationId }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const proxy = { intensity: 2.4 };
    const tl = gsap.timeline();
    tl.to(proxy, {
      intensity: 2.4,
      duration: 0.95,
      ease: 'none',
    })
      .to(proxy, {
        intensity: 5.4,
        duration: 0.11,
        ease: 'sine.out',
        onUpdate: () => {
          if (lightRef.current) lightRef.current.intensity = proxy.intensity;
        },
      })
      .to(proxy, {
        intensity: 2.4,
        duration: 0.12,
        ease: 'sine.in',
        onUpdate: () => {
          if (lightRef.current) lightRef.current.intensity = proxy.intensity;
        },
      });
    return () => {
      tl.kill();
    };
  }, [destinationId]);

  return (
    <directionalLight
      ref={lightRef}
      position={[8, 10, 6]}
      intensity={2.4}
      color="#F2F0EB"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-far={24}
      shadow-camera-left={-5}
      shadow-camera-right={5}
      shadow-camera-top={5}
      shadow-camera-bottom={-5}
    />
  );
};

// GSAP Camera Reset Controller
const CameraResetController: React.FC<{
  resetTrigger: number;
  isMobileViewport: boolean;
  controlsRef: React.MutableRefObject<any>;
}> = ({
  resetTrigger,
  isMobileViewport,
  controlsRef,
}) => {
  const { camera } = useThree();

  useEffect(() => {
    if (resetTrigger > 0) {
      const targetPos = isMobileViewport ? { x: 0, y: 0.25, z: 7.3 } : { x: 0, y: 0.35, z: 8.8 };
      const tl = gsap.timeline();
      tl.to(
        camera.position,
        {
          ...targetPos,
          duration: 0.65,
          ease: 'power3.out',
          onUpdate: () => {
            if (controlsRef.current) controlsRef.current.update();
          },
        },
        0
      );
      if (controlsRef.current?.target) {
        tl.to(
          controlsRef.current.target,
          {
            x: 0,
            y: -0.28,
            z: 0,
            duration: 0.65,
            ease: 'power3.out',
          },
          0
        );
      }
      return () => {
        tl.kill();
      };
    }
  }, [resetTrigger, camera, isMobileViewport, controlsRef]);

  return null;
};

// GSAP Assembly Time Accumulator (stops React re-renders once built at 1.6s)
const TimeTick: React.FC<{
  destinationId: string;
  setTime: React.Dispatch<React.SetStateAction<number>>;
  isActive?: boolean;
}> = ({ destinationId, setTime, isActive = true }) => {
  useEffect(() => {
    if (!isActive) return;
    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1.6,
      duration: 1.6,
      ease: 'none',
      onUpdate: () => {
        setTime(proxy.t);
      },
    });
    return () => {
      tween.kill();
    };
  }, [destinationId, isActive, setTime]);
  return null;
};

interface MonumentCanvasStageProps {
  destinationId: string;
  isLight: boolean;
  isMobileViewport: boolean;
  isPreloaderActive: boolean;
  isAutoRotating: boolean;
  resetTrigger: number;
  controlsRef: React.MutableRefObject<any>;
}

const MonumentCanvasStage: React.FC<MonumentCanvasStageProps> = React.memo(({
  destinationId,
  isLight,
  isMobileViewport,
  isPreloaderActive,
  isAutoRotating,
  resetTrigger,
  controlsRef,
}) => {
  const [time, setTime] = useState<number>(0);
  const glConfig = useMemo(
    () => ({
      antialias: true,
      alpha: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      powerPreference: 'default' as const,
      failIfMajorPerformanceCaveat: false,
    }),
    []
  );

  // Reset build animation without unmounting WebGL Canvas (prevents swipe flash)
  useEffect(() => {
    setTime(0);
  }, [destinationId]);

  return (
    <Canvas
      key="persistent-monument-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0, isMobileViewport ? 0.25 : 0.35, isMobileViewport ? 7.3 : 8.8], fov: isMobileViewport ? 40 : 38 }}
      shadows
      gl={glConfig}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('[Prayana 3D] WebGL context lost handled gracefully');
        });
        gl.domElement.addEventListener('webglcontextrestored', () => {
          console.info('[Prayana 3D] WebGL context restored');
        });
      }}
      className="w-full h-full"
    >
      <color attach="background" args={[isLight ? '#F4F3EF' : '#0E0E0E']} />
      <fog attach="fog" args={[isLight ? '#F4F3EF' : '#0E0E0E', 14, 26]} />
      <TimeTick destinationId={destinationId} setTime={setTime} isActive={!isPreloaderActive} />

      {/* Moody Dark Liquid-Chrome Studio Lighting (b3f3dc2 Aesthetic) */}
      <ambientLight intensity={0.28} />
      <SpecularLockLight destinationId={destinationId} />
      <directionalLight position={[-7, 5, -6]} intensity={1.65} color="#D8E2F0" />
      <directionalLight position={[0, 8, -7]} intensity={1.2} color="#F2F0EB" />

      {/* Studio Lightformer Environment (Static Single-Frame Sculpted Specular Highlights) */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={5.2} position={[0, 8, 1]} scale={[14, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={5.5} position={[6, 2.5, 4]} scale={[3.5, 11, 1]} rotation-y={-Math.PI / 3} />
        <Lightformer form="rect" intensity={4.4} position={[-6, 3, -4]} scale={[3.5, 9, 1]} rotation-y={Math.PI / 4} />
        <Lightformer form="rect" intensity={2.6} position={[0, 2, 7]} scale={[8, 3, 1]} rotation-y={Math.PI} />
      </Environment>

      {/* Auto-Normalized Liquid-Metal Monument Grounded On Rippling Mercury Pool */}
      <MonumentStageContent destinationId={destinationId} time={time} />

      {/* Rippling Liquid Chromatic Steel Reflector Pool (Subtle Blurry Reflection, No Shadows) */}
      <LiquidSteelReflector isLight={isLight} />

      {/* Orbit Controls with Damping & Auto-Rotate after 1.15s Assembly */}
      <OrbitControls
        ref={controlsRef}
        target={[0, -0.28, 0]}
        enableZoom={true}
        minDistance={5.0}
        maxDistance={14}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.05}
        autoRotate={time >= 1.15 && isAutoRotating}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2 + 0.05}
        minPolarAngle={Math.PI / 8}
      />

      <CameraResetController resetTrigger={resetTrigger} isMobileViewport={isMobileViewport} controlsRef={controlsRef} />
    </Canvas>
  );
});

MonumentCanvasStage.displayName = 'MonumentCanvasStage';

interface ThreeStageMonumentProps {
  dragX?: MotionValue<number>;
}

export const ThreeStageMonument: React.FC<ThreeStageMonumentProps> = React.memo(({ dragX: externalDragX }) => {
  const {
    activeDestination,
    isPreloaderActive,
    setIsWizardOpen,
    setActiveView,
    hasPlannedTrip,
    activeTrip,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';
  const controlsRef = useRef<any>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const fallbackDragX = useMotionValue(0);
  const dragX = externalDragX ?? fallbackDragX;
  const stageTranslateX = useTransform(dragX, [-260, 0, 260], [-64, 0, 64]);
  const stageScale = useTransform(dragX, [-260, 0, 260], [0.95, 1, 0.95]);
  const stageOpacity = useTransform(dragX, [-260, 0, 260], [0.7, 1, 0.7]);

  const destinationId = activeDestination?.id ?? 'hampi';
  const monumentName = activeDestination?.monumentName ?? 'MONUMENT';
  const metrics = DESTINATION_SPATIAL_METRICS[destinationId] || DESTINATION_SPATIAL_METRICS.hampi;

  // Reset auto-rotation and run crisp GSAP HUD entrance on corridor switch
  useEffect(() => {
    setIsAutoRotating(true);
    if (hudRef.current) {
      gsap.fromTo(
        hudRef.current,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power3.out', force3D: true, clearProps: 'transform,opacity,visibility' }
      );
    }
  }, [destinationId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button')) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setIsAutoRotating(false);
    tapStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsAutoRotating(true);
    }, 3000);

    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const dur = Date.now() - start.time;
    const targetEl = e.target as HTMLElement | null;
    if (dist < 6 && dur < 280 && !targetEl?.closest('button')) {
      if (hasPlannedTrip && activeTrip.destinationId === destinationId) {
        setActiveView('ITINERARY_OUTPUT');
      } else {
        setIsWizardOpen(true);
      }
    }
  };

  const handleReset = () => {
    setResetTrigger(prev => prev + 1);
    setIsAutoRotating(true);
  };

  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div 
      className="relative w-full h-[48vh] min-h-[340px] lg:h-full lg:min-h-[420px] flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <ErrorBoundary
        fallbackTitle={activeDestination?.name ? `${activeDestination.name} Monument Stage` : 'Architectural Stage'}
        onReset={handleReset}
      >
        {/* Isolate OrbitControls wheel/touch inside the 3D Canvas box while translating smoothly with dragX */}
        <motion.div
          style={{ x: stageTranslateX, scale: stageScale, opacity: stageOpacity }}
          className="w-full h-full"
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Persistent Memoized Canvas avoids WebGL teardown flash and parent re-renders */}
          <MonumentCanvasStage
            destinationId={destinationId}
            isLight={isLight}
            isMobileViewport={isMobileViewport}
            isPreloaderActive={isPreloaderActive}
            isAutoRotating={isAutoRotating}
            resetTrigger={resetTrigger}
            controlsRef={controlsRef}
          />
        </motion.div>
      </ErrorBoundary>

      {/* Top Left Spatial Tag & Compact Monospace Metrics Readout Strip */}
      <div
        ref={hudRef}
        className="pointer-events-none absolute top-2 left-2 sm:top-3 sm:left-4 flex flex-col space-y-1 z-20 max-w-[calc(100%-16px)]"
      >
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-muted hidden sm:block">
          [LIQUID CHROME 3D ENGINE] // {monumentName.toUpperCase()}
        </div>
        <div className="font-mono text-[10px] sm:text-[11px] tracking-wideHud uppercase text-ink-secondary bg-[#121212]/90 border border-[rgba(242,240,235,0.15)] px-2 sm:px-2.5 py-0.5 sm:py-1 backdrop-blur-xs flex items-center space-x-1.5 sm:space-x-2 w-fit whitespace-nowrap">
          <span className="text-[#F2F0EB]">ELEV: {metrics.elev}</span>
          <span className="text-[rgba(242,240,235,0.25)] hidden sm:inline">·</span>
          <span className="text-[#F2F0EB] hidden sm:inline">WINDOW: {metrics.window}</span>
          <span className="text-[rgba(242,240,235,0.25)]">·</span>
          <span className="text-[#F2F0EB]">SLOPE: {metrics.slope}</span>
        </div>
      </div>

      {/* Bottom Center Controls & Reset Button */}
      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 sm:space-x-2 z-20 whitespace-nowrap">
        <div className="pointer-events-none font-mono text-[10px] sm:text-[11px] tracking-wideHud uppercase text-ink-muted bg-[#151515]/80 px-2 sm:px-2.5 py-1 border border-[rgba(242,240,235,0.1)] backdrop-blur-xs flex items-center space-x-1.5 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-primary/70 inline-block animate-pulse-subtle" />
          <span className="hidden sm:inline">TAP TO PLAN · DRAG TO ORBIT</span>
          <span className="sm:hidden">TAP PLAN · DRAG ORBIT</span>
        </div>

        <button
          onClick={handleReset}
          className="font-mono text-[10px] sm:text-[11px] tracking-widest uppercase text-ink-secondary hover:text-ink-primary bg-[#181818] hover:bg-[#222222] px-2 sm:px-2.5 py-1 border border-[rgba(242,240,235,0.18)] hover:border-ink-primary transition-colors duration-100 flex items-center space-x-1 cursor-pointer shadow-lg whitespace-nowrap"
          title="Reset Camera Framing"
        >
          <RotateCcw className="w-3 h-3 shrink-0" />
          <span>RESET VIEW</span>
        </button>
      </div>
    </div>
  );
});
