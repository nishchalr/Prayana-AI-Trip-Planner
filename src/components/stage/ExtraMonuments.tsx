import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingTier, ChromeMaterial, ThemeEdges } from './ThreeStageMonument';

interface MonumentProps {
  time: number;
}

// 5. AGRA — TAJ MAHAL (Elevated plinth + LatheGeometry onion dome + 4 corner minarets)
export const AgraTajMahal: React.FC<MonumentProps> = ({ time }) => {
  const onionDomeGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = Math.max(0.001, 0.72 * Math.pow(Math.sin(Math.PI * t), 0.75) + 0.15 * Math.sin(2 * Math.PI * t));
      const y = t * 1.15;
      pts.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(pts, 32);
  }, []);

  return (
    <group scale={[0.55, 0.55, 0.55]}>
      {/* Elevated square plinth */}
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.35, 3.2]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      {/* Central octagonal-feel chamfered chamber + 4 corner minarets */}
      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.65, 1.1, 1.65]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {/* Pishtaq iwan portal frames */}
        <mesh position={[0, 0.9, 0.85]} castShadow>
          <boxGeometry args={[0.72, 1.15, 0.1]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
        {[
          [-1.35, 1.25, -1.35],
          [1.35, 1.25, -1.35],
          [-1.35, 1.25, 1.35],
          [1.35, 1.25, 1.35],
        ].map(([x, y, z], idx) => (
          <group key={`minaret-${idx}`} position={[x, y, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.11, 0.16, 1.8, 12]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
            <mesh position={[0, 0.98, 0]} castShadow>
              <sphereGeometry args={[0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      {/* Drum + LatheGeometry onion dome + finial */}
      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.62, 0]} castShadow>
          <cylinderGeometry args={[0.64, 0.68, 0.36, 24]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 1.78, 0]} geometry={onionDomeGeo} castShadow>
          <ChromeMaterial />
          <ThemeEdges threshold={22} />
        </mesh>
        <mesh position={[0, 3.05, 0]} castShadow>
          <coneGeometry args={[0.05, 0.38, 10]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 6. JAIPUR — HAWA MAHAL (5-tiered pyramidal honeycomb facade with jharokha bays)
export const JaipurHawaMahal: React.FC<MonumentProps> = ({ time }) => {
  const tiers = [0, 1, 2, 3, 4];
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.3, 1.5]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      {tiers.map((k) => {
        const w = 3.0 - 0.45 * k;
        const y = 0.55 + k * 0.56;
        const bayCount = Math.max(2, 5 - k);
        const spacing = w / (bayCount + 0.4);
        return (
          <BuildingTier key={`hawa-tier-${k}`} tierIndex={Math.min(4, k + 1)} time={time}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.48, 0.9 - k * 0.08]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
            {Array.from({ length: bayCount }).map((_, bi) => {
              const bx = (bi - (bayCount - 1) / 2) * spacing;
              return (
                <group key={`jharokha-${k}-${bi}`} position={[bx, y, 0.48 - k * 0.04]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.14, 0.14, 0.32, 6]} />
                    <ChromeMaterial gunmetal />
                    <ThemeEdges />
                  </mesh>
                  <mesh position={[0, 0.24, 0]} castShadow>
                    <coneGeometry args={[0.16, 0.18, 6]} />
                    <ChromeMaterial />
                    <ThemeEdges />
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
          <ThemeEdges threshold={25} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.26, 2.2]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.65, 1.75]} />
          <ChromeMaterial />
          <ThemeEdges />
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
              <ThemeEdges />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <sphereGeometry args={[0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.52, 0.36, 20]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 1.33, 0]} castShadow>
          <sphereGeometry args={[0.48, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial />
          <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.9, 1.4]} />
          <ChromeMaterial />
          <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <boxGeometry args={[0.68, 0.45, 0.68]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
        {/* Central + 4 flanking onion domes */}
        <mesh position={[0, 2.28, 0]} castShadow>
          <sphereGeometry args={[0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          <ChromeMaterial />
          <ThemeEdges />
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
            <ThemeEdges />
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
            <ThemeEdges threshold={18} />
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
          <ThemeEdges />
        </mesh>
        <mesh position={[0.05, 1.72, -0.04]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.52, 0.28, 4]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Deck */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[2.6, 0.1, 0.95]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {/* Woven bamboo-arch canopy */}
        <mesh position={[-0.1, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 1.9, 16, 1, false, 0, Math.PI]} />
          <ChromeMaterial />
          <ThemeEdges threshold={16} />
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
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 0.53, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.22, 1.32, 0.35, 32]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial />
          <ThemeEdges threshold={20} />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.75, 0]} castShadow>
          <boxGeometry args={[0.52, 0.24, 0.52]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 2.3, 0]} castShadow>
          <coneGeometry args={[0.28, 0.85, 16]} />
          <ChromeMaterial />
          <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {[-1.45, 1.45].map((tx, idx) => (
          <group key={`tower-${idx}`} position={[tx, 0.85, 0]}>
            <mesh position={[0, 0, -0.24]} castShadow>
              <cylinderGeometry args={[0.08, 0.13, 1.5, 8]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
            <mesh position={[0, 0, 0.24]} castShadow>
              <cylinderGeometry args={[0.08, 0.13, 1.5, 8]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
            <mesh position={[0, 0.62, 0]} castShadow>
              <boxGeometry args={[0.16, 0.16, 0.65]} />
              <ChromeMaterial gunmetal />
              <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 1.48, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.48, 2.1, 24]} />
          <ChromeMaterial />
          <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 2.94, 0]} castShadow>
          <sphereGeometry args={[0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 14. KONARK — SUN TEMPLE CHARIOT (Sculpted platform + 12 TorusGeometry spoked wheels + 6-slab rekha-deul)
export const KonarkSunChariot: React.FC<MonumentProps> = ({ time }) => {
  const wheelZ = [-0.9, -0.54, -0.18, 0.18, 0.54, 0.9];
  return (
    <group scale={[0.54, 0.54, 0.54]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.5, 2.2]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {[-1.44, 1.44].map((wx, sideIdx) =>
          wheelZ.map((wz, wi) => (
            <group key={`kwheel-${sideIdx}-${wi}`} position={[wx, 0.34, wz]} rotation={[0, Math.PI / 2, 0]}>
              <mesh castShadow>
                <torusGeometry args={[0.34, 0.06, 10, 24]} />
                <ChromeMaterial />
              </mesh>
              <mesh>
                <boxGeometry args={[0.62, 0.04, 0.04]} />
                <ChromeMaterial gunmetal />
              </mesh>
              <mesh>
                <boxGeometry args={[0.04, 0.62, 0.04]} />
                <ChromeMaterial gunmetal />
              </mesh>
            </group>
          ))
        )}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {[0, 1, 2, 3, 4, 5].map((s) => {
          const size = 1.65 - s * 0.22;
          return (
            <mesh key={`rekha-${s}`} position={[0, 0.72 + s * 0.26, 0]} castShadow>
              <boxGeometry args={[size, 0.24, size]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          );
        })}
        <mesh position={[0, 2.25, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.22, 0.16, 16]} />
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
          <ThemeEdges />
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
              <ThemeEdges />
            </mesh>
            <mesh position={[0, y + 0.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[eaveR, 0.28, 4]} />
              <ChromeMaterial gunmetal />
              <ThemeEdges />
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
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Cantilevered 35° A-frame poles */}
        {[-0.45, 0.45].map((z, i) => (
          <mesh key={`pole-${i}`} position={[0.25, 1.0, z]} rotation={[0, 0, -Math.PI / 5.1]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 2.3, 8]} />
            <ChromeMaterial />
            <ThemeEdges />
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

// 17. PARIS — EIFFEL LATTICE TOWER (4 curved-profile legs + 2 square decks + spire)
export const ParisEiffelTower: React.FC<MonumentProps> = ({ time }) => {
  const legs = [
    [-0.75, -0.75, 0.28, -0.28],
    [0.75, -0.75, -0.28, -0.28],
    [-0.75, 0.75, 0.28, 0.28],
    [0.75, 0.75, -0.28, 0.28],
  ];
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        {legs.map(([x, z, rz, rx], i) => (
          <mesh key={`leg-${i}`} position={[x * 0.7, 0.6, z * 0.7]} rotation={[rx, 0, rz]} castShadow>
            <cylinderGeometry args={[0.12, 0.22, 1.3, 4]} />
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
        {/* 1st observation deck */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[1.18, 0.14, 1.18]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 1.62, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.52, 0.82, 4]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {/* 2nd observation deck */}
        <mesh position={[0, 2.02, 0]} castShadow>
          <boxGeometry args={[0.56, 0.12, 0.56]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 2.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.24, 1.12, 4]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 3.25, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.025, 0.38, 8]} />
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
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {[-1.1, 0, 1.1].map((tx, i) => (
          <group key={`mbs-tower-${i}`} position={[tx, 1.15, 0]}>
            <mesh position={[0, 0, -0.18]} rotation={[0.14, 0, 0]} castShadow>
              <boxGeometry args={[0.5, 1.9, 0.18]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
            <mesh position={[0, 0, 0.18]} rotation={[-0.14, 0, 0]} castShadow>
              <boxGeometry args={[0.5, 1.9, 0.18]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          </group>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Cantilevered boat-shaped SkyPark deck */}
        <mesh position={[0.15, 2.15, 0]} castShadow>
          <boxGeometry args={[3.5, 0.16, 0.72]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[2.08, 2.16, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.36, 0.65, 4]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>
    </group>
  );
};
