import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingTier, ChromeMaterial } from './ThreeStageMonument';

interface MonumentProps {
  time: number;
}

// 5. AGRA — TAJ MAHAL (Chamfered plinth + octagonal tomb + 4 pishtaq iwans + onion dome + 4 corner chhatris + 4 3-tier minarets)
export const AgraTajMahal: React.FC<MonumentProps> = ({ time }) => {
  const onionDomeGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = Math.max(
        0.001,
        0.68 * Math.pow(Math.sin(Math.PI * t), 0.68) * (1 + 0.18 * Math.sin(2.5 * Math.PI * t))
      );
      const y = t * 1.18;
      pts.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(pts, 36);
  }, []);

  return (
    <group scale={[0.56, 0.56, 0.56]}>
      {/* Raised chamfered marble plinth */}
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.36, 3.2]} />
          <ChromeMaterial gunmetal />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 0.06, 3.0]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>

      {/* Octagonal tomb + 4 recessed pishtaq iwan arch frames + 4 three-tier minarets with balcony rings */}
      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.96, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.08, 1.12, 8]} />
          <ChromeMaterial />
        </mesh>
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ry, idx) => (
          <group key={`pishtaq-${idx}`} rotation={[0, ry, 0]}>
            <mesh position={[0, 1.0, 0.96]} castShadow>
              <boxGeometry args={[0.78, 1.18, 0.12]} />
              <ChromeMaterial />
            </mesh>
            <mesh position={[0, 0.92, 1.01]}>
              <boxGeometry args={[0.44, 0.84, 0.06]} />
              <ChromeMaterial gunmetal />
            </mesh>
          </group>
        ))}

        {/* 4 Three-tier minarets with TorusGeometry balcony rings */}
        {[
          [-1.36, 0.38, -1.36],
          [1.36, 0.38, -1.36],
          [-1.36, 0.38, 1.36],
          [1.36, 0.38, 1.36],
        ].map(([mx, my, mz], idx) => (
          <group key={`taj-minaret-${idx}`} position={[mx, my, mz]}>
            <mesh position={[0, 0.32, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.16, 0.64, 14]} />
              <ChromeMaterial />
            </mesh>
            <mesh position={[0, 0.92, 0]} castShadow>
              <cylinderGeometry args={[0.105, 0.13, 0.58, 14]} />
              <ChromeMaterial />
            </mesh>
            <mesh position={[0, 1.44, 0]} castShadow>
              <cylinderGeometry args={[0.085, 0.105, 0.48, 14]} />
              <ChromeMaterial />
            </mesh>
            {[0.64, 1.2, 1.66].map((by, bIdx) => (
              <mesh key={`balc-${idx}-${bIdx}`} position={[0, by, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[0.16 - bIdx * 0.02, 0.025, 8, 18]} />
                <ChromeMaterial gunmetal />
              </mesh>
            ))}
            <mesh position={[0, 1.78, 0]} castShadow>
              <sphereGeometry args={[0.11, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
              <ChromeMaterial />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      {/* Drum + Onion Dome + Lotus Finial + 4 Corner Chhatris */}
      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.68, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.66, 0.34, 28]} />
          <ChromeMaterial />
        </mesh>
        <mesh position={[0, 1.82, 0]} geometry={onionDomeGeo} castShadow>
          <ChromeMaterial />
        </mesh>
        <mesh position={[0, 3.04, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.06, 0.42, 10]} />
          <ChromeMaterial gunmetal />
        </mesh>
        {[
          [-0.68, 1.6, -0.68],
          [0.68, 1.6, -0.68],
          [-0.68, 1.6, 0.68],
          [0.68, 1.6, 0.68],
        ].map(([cx, cy, cz], idx) => (
          <group key={`taj-chhatri-${idx}`} position={[cx, cy, cz]}>
            <mesh position={[0, 0.14, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.18, 0.28, 6]} />
              <ChromeMaterial gunmetal />
            </mesh>
            <mesh position={[0, 0.32, 0]} castShadow>
              <sphereGeometry args={[0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
              <ChromeMaterial />
            </mesh>
          </group>
        ))}
      </BuildingTier>
    </group>
  );
};

// 6. JAIPUR — HAWA MAHAL (5-story pyramidal honeycomb: width_k = 3.1 - 0.48*k with 11,9,7,5,3 jharokha bays)
export const JaipurHawaMahal: React.FC<MonumentProps> = ({ time }) => {
  const tiers = [0, 1, 2, 3, 4];
  const bayCounts = [11, 9, 7, 5, 3];
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.3, 1.4]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>

      {tiers.map((k) => {
        const w = 3.1 - 0.48 * k;
        const y = 0.52 + k * 0.54;
        const bayCount = bayCounts[k];
        const spacing = w / (bayCount + 0.35);
        const depth = 0.9 - k * 0.08;
        return (
          <BuildingTier key={`hawa-tier-${k}`} tierIndex={Math.min(4, k + 1)} time={time}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.46, depth]} />
              <ChromeMaterial />
            </mesh>
            <mesh position={[0, y + 0.25, 0]} castShadow>
              <boxGeometry args={[w + 0.1, 0.06, depth + 0.1]} />
              <ChromeMaterial gunmetal />
            </mesh>
            {Array.from({ length: bayCount }).map((_, bi) => {
              const bx = (bi - (bayCount - 1) / 2) * spacing;
              return (
                <group key={`jharokha-${k}-${bi}`} position={[bx, y, depth * 0.5 + 0.06]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.1, 0.1, 0.34, 8]} />
                    <ChromeMaterial gunmetal />
                  </mesh>
                  <mesh position={[0, 0.22, 0]} castShadow>
                    <sphereGeometry args={[0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
                    <ChromeMaterial />
                  </mesh>
                </group>
              );
            })}
          </BuildingTier>
        );
      })}
    </group>
  );
};

// 7. UDAIPUR — LAKE PALACE (Reflective water disc + marble courtyard + 4 chhatris + lotus dome)
export const UdaipurLakePalace: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[2.4, 2.4, 0.06, 48]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.26, 2.2]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.65, 1.75]} />
          <ChromeMaterial />
</mesh>
        {[
          [-0.95, 1.15, -0.78],
          [0.95, 1.15, -0.78],
          [-0.95, 1.15, 0.78],
          [0.95, 1.15, 0.78],
        ].map(([x, y, z], idx) => (
          <group key={`chhatri-${idx}`} position={[x, y, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.32, 8]} />
              <ChromeMaterial gunmetal />
</mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <sphereGeometry args={[0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <ChromeMaterial />
</mesh>
          </group>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.52, 0.36, 20]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 1.33, 0]} castShadow>
          <sphereGeometry args={[0.48, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <coneGeometry args={[0.05, 0.28, 10]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 8. MYSURU — MYSORE PALACE (Symmetrical Indo-Saracenic facade + 5 onion domes + colonnade)
export const MysuruPalace: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.52, 0.52, 0.52]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.9, 0.3, 1.8]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.9, 1.4]} />
          <ChromeMaterial />
</mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`col-${i}`} position={[-1.4 + 0.4 * i, 0.72, 0.74]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.85, 10]} />
            <ChromeMaterial gunmetal />
          </mesh>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* 3-tier central clock tower */}
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[0.95, 0.55, 0.95]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <boxGeometry args={[0.68, 0.45, 0.68]} />
          <ChromeMaterial gunmetal />
</mesh>
        {/* Central + 4 flanking onion domes */}
        <mesh position={[0, 2.28, 0]} castShadow>
          <sphereGeometry args={[0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          <ChromeMaterial />
</mesh>
        {[
          [-1.35, 1.32, 0.25],
          [1.35, 1.32, 0.25],
          [-1.35, 1.32, -0.25],
          [1.35, 1.32, -0.25],
        ].map(([x, y, z], idx) => (
          <mesh key={`dome-${idx}`} position={[x, y, z]} castShadow>
            <sphereGeometry args={[0.26, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
            <ChromeMaterial />
</mesh>
        ))}
      </BuildingTier>
    </group>
  );
};

// 9. MUNNAR — TEA RIDGE (Terraced contour hills + mist halo TorusGeometry + estate pavilion)
export const MunnarTeaRidge: React.FC<MonumentProps> = ({ time }) => {
  const contourTiers = [
    { rTop: 1.95, rBot: 2.25, h: 0.3, x: 0, z: 0, y: 0.15 },
    { rTop: 1.5, rBot: 1.82, h: 0.32, x: 0.12, z: -0.08, y: 0.46 },
    { rTop: 1.08, rBot: 1.38, h: 0.34, x: -0.08, z: 0.1, y: 0.79 },
    { rTop: 0.68, rBot: 0.96, h: 0.34, x: 0.05, z: -0.04, y: 1.12 },
  ];
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      {contourTiers.map((c, idx) => (
        <BuildingTier key={`contour-${idx}`} tierIndex={idx} time={time}>
          <mesh position={[c.x, c.y, c.z]} castShadow receiveShadow>
            <cylinderGeometry args={[c.rTop, c.rBot, c.h, 28]} />
            <ChromeMaterial gunmetal={idx % 2 === 0} />
</mesh>
        </BuildingTier>
      ))}
      <BuildingTier tierIndex={4} time={time}>
        {/* Mist halo */}
        <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2 - 0.12, 0.08, 0]}>
          <torusGeometry args={[2.1, 0.03, 12, 64]} />
          <ChromeMaterial />
        </mesh>
        {/* Summit estate pavilion */}
        <mesh position={[0.05, 1.45, -0.04]} castShadow>
          <boxGeometry args={[0.62, 0.32, 0.52]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0.05, 1.72, -0.04]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.52, 0.28, 4]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>
    </group>
  );
};

// 10. ALLEPPEY — KERALA KETTUVALLAM HOUSEBOAT (Curved hull + bamboo-arch canopy + ripple rings)
export const AlleppeyHouseboat: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.58, 0.58, 0.58]}>
      <BuildingTier tierIndex={0} time={time}>
        {[1.6, 2.15].map((r, i) => (
          <mesh key={`ripple-${i}`} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 0.04, 48]} />
            <ChromeMaterial />
          </mesh>
        ))}
        {/* Curved wooden hull */}
        <mesh position={[0, 0.25, 0]} scale={[1.85, 0.45, 0.72]} castShadow receiveShadow>
          <cylinderGeometry args={[0.95, 0.65, 0.65, 24]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Deck */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[2.6, 0.1, 0.95]} />
          <ChromeMaterial />
</mesh>
        {/* Woven bamboo-arch canopy */}
        <mesh position={[-0.1, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 1.9, 16, 1, false, 0, Math.PI]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>
    </group>
  );
};

// 11. LEH-LADAKH — SHANTI STUPA (2 medhi drums + white hemisphere + harmika + 13-ring spire)
export const LehShantiStupa: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.6, 0.35, 32]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 0.53, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.22, 1.32, 0.35, 32]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.75, 0]} castShadow>
          <boxGeometry args={[0.52, 0.24, 0.52]} />
          <ChromeMaterial gunmetal />
</mesh>
        <mesh position={[0, 2.3, 0]} castShadow>
          <coneGeometry args={[0.28, 0.85, 16]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>
    </group>
  );
};

// 12. RISHIKESH — LAKSHMAN JHULA SUSPENSION BRIDGE (Twin towers + deck + parabolic TubeGeometry cables)
export const RishikeshBridge: React.FC<MonumentProps> = ({ time }) => {
  const { cableLeft, cableRight } = useMemo(() => {
    const mkCable = (zOffset: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = -1.7 + 3.4 * t;
        const y = 0.35 + 1.1 * Math.pow(2 * t - 1, 2);
        pts.push(new THREE.Vector3(x, y, zOffset));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.025, 8, false);
    };
    return { cableLeft: mkCable(-0.26), cableRight: mkCable(0.26) };
  }, []);

  return (
    <group scale={[0.6, 0.6, 0.6]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.08, 0.55]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {[-1.45, 1.45].map((tx, idx) => (
          <group key={`tower-${idx}`} position={[tx, 0.85, 0]}>
            <mesh position={[0, 0, -0.24]} castShadow>
              <cylinderGeometry args={[0.08, 0.13, 1.5, 8]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0, 0.24]} castShadow>
              <cylinderGeometry args={[0.08, 0.13, 1.5, 8]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0.62, 0]} castShadow>
              <boxGeometry args={[0.16, 0.16, 0.65]} />
              <ChromeMaterial gunmetal />
</mesh>
          </group>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh geometry={cableLeft} castShadow>
          <ChromeMaterial />
        </mesh>
        <mesh geometry={cableRight} castShadow>
          <ChromeMaterial />
        </mesh>
        {[-1.0, -0.6, -0.2, 0.2, 0.6, 1.0].map((hx, idx) => {
          const t = (hx + 1.7) / 3.4;
          const cy = 0.35 + 1.1 * Math.pow(2 * t - 1, 2);
          const h = Math.max(0.08, cy - 0.32);
          return (
            <group key={`hanger-${idx}`}>
              <mesh position={[hx, 0.32 + h / 2, -0.26]}>
                <cylinderGeometry args={[0.012, 0.012, h, 6]} />
                <ChromeMaterial gunmetal />
              </mesh>
              <mesh position={[hx, 0.32 + h / 2, 0.26]}>
                <cylinderGeometry args={[0.012, 0.012, h, 6]} />
                <ChromeMaterial gunmetal />
              </mesh>
            </group>
          );
        })}
      </BuildingTier>
    </group>
  );
};

// 13. GOA — AGUADA LIGHTHOUSE & STAR FORT (Octagonal bastion + tapered lighthouse + gallery ring + beacon)
export const GoaAguadaLighthouse: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.7, 1.85, 0.45, 8]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 1.48, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.48, 2.1, 24]} />
          <ChromeMaterial />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 2.55, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.4, 0.05, 10, 28]} />
          <ChromeMaterial gunmetal />
        </mesh>
        <mesh position={[0, 2.75, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.34, 16]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[0, 2.94, 0]} castShadow>
          <sphereGeometry args={[0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 14. KONARK — SUN TEMPLE CHARIOT (Stepped pidha-deul w_k = 2.1*0.92^k + 12 pairs of spoked wheels + stepped approach)
export const KonarkSunChariot: React.FC<MonumentProps> = ({ time }) => {
  const wheelZ = [-0.92, -0.55, -0.18, 0.18, 0.55, 0.92];
  return (
    <group scale={[0.54, 0.54, 0.54]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.52, 2.3]} />
          <ChromeMaterial gunmetal />
        </mesh>
        {/* Front stepped approach */}
        {[0, 1, 2].map((st) => (
          <mesh key={`kstep-${st}`} position={[0, 0.08 + st * 0.12, 1.38 - st * 0.18]} castShadow>
            <boxGeometry args={[0.9, 0.12, 0.28]} />
            <ChromeMaterial />
          </mesh>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {[-1.44, 1.44].map((wx, sideIdx) =>
          wheelZ.map((wz, wi) => (
            <group key={`kwheel-${sideIdx}-${wi}`} position={[wx, 0.34, wz]} rotation={[0, Math.PI / 2, 0]}>
              <mesh castShadow>
                <torusGeometry args={[0.32, 0.055, 10, 24]} />
                <ChromeMaterial />
              </mesh>
              {[0, 1, 2, 3].map((sp) => (
                <mesh key={`ksp-${sp}`} rotation={[0, 0, (sp * Math.PI) / 4]}>
                  <boxGeometry args={[0.58, 0.032, 0.032]} />
                  <ChromeMaterial gunmetal />
                </mesh>
              ))}
            </group>
          ))
        )}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {Array.from({ length: 8 }).map((_, k) => {
          const wk = 2.1 * Math.pow(0.92, k);
          return (
            <mesh key={`pidha-${k}`} position={[0, 0.72 + k * 0.21, 0]} castShadow receiveShadow>
              <boxGeometry args={[wk, 0.18, wk]} />
              <ChromeMaterial gunmetal={k % 2 === 1} />
            </mesh>
          );
        })}
        <mesh position={[0, 2.48, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.26, 0.16, 18]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 15. DARJEELING — HIMALAYAN PAGODA (Stepped stone base + 3 upturned eaves roofs + golden spire)
export const DarjeelingPagoda: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.32, 2.6]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      {[0, 1, 2].map((t) => {
        const y = 0.55 + t * 0.62;
        const body = 1.5 - t * 0.32;
        const eaveR = 1.32 - t * 0.25;
        return (
          <BuildingTier key={`dpag-${t}`} tierIndex={t + 1} time={time}>
            <mesh position={[0, y, 0]} castShadow>
              <boxGeometry args={[body, 0.42, body]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, y + 0.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[eaveR, 0.28, 4]} />
              <ChromeMaterial gunmetal />
</mesh>
          </BuildingTier>
        );
      })}

      <BuildingTier tierIndex={4} time={time}>
        <mesh position={[0, 2.45, 0]} castShadow>
          <coneGeometry args={[0.07, 0.6, 10]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 16. KOCHI — CHINESE FISHING NETS (Pier deck + 35° A-frame teak poles + pyramid net + counterweight boulders)
export const KochiFishingNets: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.58, 0.58, 0.58]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[-0.7, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.24, 1.6]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Cantilevered 35° A-frame poles */}
        {[-0.45, 0.45].map((z, i) => (
          <mesh key={`pole-${i}`} position={[0.25, 1.0, z]} rotation={[0, 0, -Math.PI / 5.1]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 2.3, 8]} />
            <ChromeMaterial />
</mesh>
        ))}
        {/* Counterweight boulders */}
        {[-0.3, 0.3].map((z, i) => (
          <mesh key={`boulder-${i}`} position={[-0.75, 0.45, z]} castShadow>
            <sphereGeometry args={[0.18, 12, 10]} />
            <ChromeMaterial gunmetal />
          </mesh>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Suspended pyramid net frame */}
        <mesh position={[1.1, 0.95, 0]} rotation={[Math.PI, Math.PI / 4, 0]}>
          <coneGeometry args={[0.92, 0.85, 4]} />
          <meshStandardMaterial wireframe color="#D8DCE2" />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 17. PARIS — EIFFEL TOWER (4 curved exponential-taper legs x(y)=0.88*e^(-0.78*y)+0.07 + 4 piers + 2 decks + spire)
export const ParisEiffelTower: React.FC<MonumentProps> = ({ time }) => {
  const segs = [0.25, 0.65, 1.15, 1.75, 2.35];
  const signs: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        {/* 4 masonry piers */}
        {signs.map(([sx, sz], i) => (
          <mesh key={`pier-${i}`} position={[sx * 0.92, 0.12, sz * 0.92]} castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.24, 0.38]} />
            <ChromeMaterial gunmetal />
          </mesh>
        ))}
        {/* Curved exponential-taper lattice legs */}
        {segs.slice(0, -1).map((y0, si) => {
          const y1 = segs[si + 1];
          const ym = (y0 + y1) / 2;
          const x0 = 0.88 * Math.exp(-0.78 * y0) + 0.07;
          const x1 = 0.88 * Math.exp(-0.78 * y1) + 0.07;
          const xm = (x0 + x1) / 2;
          const dx = x0 - x1;
          const dy = y1 - y0;
          const len = Math.hypot(dx * 1.414, dy);
          const tilt = Math.atan2(dx, dy);
          return signs.map(([sx, sz], li) => (
            <mesh
              key={`eseg-${si}-${li}`}
              position={[sx * xm, ym, sz * xm]}
              rotation={[sz * tilt, 0, -sx * tilt]}
              castShadow
            >
              <cylinderGeometry args={[0.07 - si * 0.01, 0.095 - si * 0.01, len, 4]} />
              <ChromeMaterial />
            </mesh>
          ));
        })}
        {/* 1st observation deck with railings */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[1.18, 0.14, 1.18]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* 2nd observation deck */}
        <mesh position={[0, 1.75, 0]} castShadow>
          <boxGeometry args={[0.64, 0.12, 0.64]} />
          <ChromeMaterial gunmetal />
        </mesh>
        {/* Cross-braces */}
        <mesh position={[0, 1.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.42, 0.82, 4]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 2.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.16, 0.95, 4]} />
          <ChromeMaterial />
        </mesh>
        <mesh position={[0, 3.32, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.025, 0.36, 8]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 18. SINGAPORE — MARINA BAY SANDS SKYPARK (3 canted twin-leg towers + boat-shaped SkyPark deck)
export const SingaporeMarinaSkyPark: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.55, 0.55, 0.55]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.5, 0.24, 1.5]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {[-1.1, 0, 1.1].map((tx, i) => (
          <group key={`mbs-tower-${i}`} position={[tx, 1.15, 0]}>
            <mesh position={[0, 0, -0.18]} rotation={[0.14, 0, 0]} castShadow>
              <boxGeometry args={[0.5, 1.9, 0.18]} />
              <ChromeMaterial />
</mesh>
            <mesh position={[0, 0, 0.18]} rotation={[-0.14, 0, 0]} castShadow>
              <boxGeometry args={[0.5, 1.9, 0.18]} />
              <ChromeMaterial />
</mesh>
          </group>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Cantilevered boat-shaped SkyPark deck */}
        <mesh position={[0.15, 2.15, 0]} castShadow>
          <boxGeometry args={[3.5, 0.16, 0.72]} />
          <ChromeMaterial />
</mesh>
        <mesh position={[2.08, 2.16, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.36, 0.65, 4]} />
          <ChromeMaterial gunmetal />
</mesh>
      </BuildingTier>
    </group>
  );
};
