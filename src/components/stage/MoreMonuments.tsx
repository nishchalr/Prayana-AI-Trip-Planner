import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingTier, ChromeMaterial, ThemeEdges } from './ThreeStageMonument';

interface MonumentProps {
  time: number;
}

// 19. AMRITSAR — GOLDEN TEMPLE (Reflective Sarovar + Causeway + Sanctum + Fluted Golden Dome)
export const AmritsarGoldenTemple: React.FC<MonumentProps> = ({ time }) => {
  const domeGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const r = 0.48 * Math.sin(Math.PI * Math.pow(t, 0.72)) + 0.08 * Math.sin(2 * Math.PI * t);
      pts.push(new THREE.Vector2(Math.max(0.01, r), t * 0.72));
    }
    return new THREE.LatheGeometry(pts, 20);
  }, []);

  return (
    <group scale={[0.58, 0.58, 0.58]}>
      {/* Tier 0: Amrit Sarovar reflective water plane */}
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[2.35, 2.35, 0.08, 48]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges threshold={20} />
        </mesh>
        {/* Marble Causeway Bridge */}
        <mesh position={[0, 0.14, 1.15]} castShadow>
          <boxGeometry args={[0.42, 0.1, 2.0]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      {/* Tier 1: Sanctum Main Block */}
      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.55, -0.15]} castShadow>
          <boxGeometry args={[1.35, 0.8, 1.35]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      {/* Tier 2: Upper Pavilion & Corner Chhatris */}
      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.12, -0.15]} castShadow>
          <boxGeometry args={[0.92, 0.35, 0.92]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {[[-0.5, -0.65], [0.5, -0.65], [-0.5, 0.35], [0.5, 0.35]].map(([x, z], i) => (
          <mesh key={`amr-chhatri-${i}`} position={[x, 1.08, z]} castShadow>
            <coneGeometry args={[0.14, 0.28, 10]} />
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>

      {/* Tier 3: Fluted Golden Onion Dome + Kalasha Finial */}
      <BuildingTier tierIndex={3} time={time}>
        <mesh geometry={domeGeo} position={[0, 1.28, -0.15]} castShadow>
          <ChromeMaterial />
          <ThemeEdges threshold={18} />
        </mesh>
        <mesh position={[0, 2.15, -0.15]} castShadow>
          <coneGeometry args={[0.06, 0.32, 8]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 20. KHAJURAHO — KANDARIYA MAHADEVA (Stepped Plinth + Cluster of 5 Rising Parabolic Shikhara Spires)
export const KhajurahoShikhara: React.FC<MonumentProps> = ({ time }) => {
  const spireGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = 0.55 * Math.pow(1 - t, 0.65);
      pts.push(new THREE.Vector2(Math.max(0.02, r), t * 2.2));
    }
    return new THREE.LatheGeometry(pts, 12);
  }, []);

  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.36, 2.2]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[2.6, 0.2, 1.8]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[2.0, 0.62, 1.4]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Main central parabolic Shikhara + 4 clustered urushringa spires */}
        <mesh geometry={spireGeo} position={[-0.25, 1.15, 0]} castShadow>
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {[
          { pos: [0.4, 1.15, 0] as [number, number, number], s: 0.72 },
          { pos: [-0.75, 1.15, 0.32] as [number, number, number], s: 0.58 },
          { pos: [-0.75, 1.15, -0.32] as [number, number, number], s: 0.58 },
          { pos: [0.85, 1.15, 0] as [number, number, number], s: 0.5 },
        ].map((sp, i) => (
          <mesh key={`khaj-spire-${i}`} geometry={spireGeo} position={sp.pos} scale={[sp.s, sp.s, sp.s]} castShadow>
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>
    </group>
  );
};

// 21. JAISALMER — SONAR QUILA (Tapered Desert Hillock + Crenellated Circular Bastions + Palace Turrets)
export const JaisalmerSonarFort: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.65, 2.15, 0.7, 12]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.92, 0]} castShadow>
          <cylinderGeometry args={[1.45, 1.55, 0.5, 12]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {/* Crenellated circular fort bastions */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const ang = (i * Math.PI * 2) / 6;
          return (
            <mesh key={`jais-bastion-${i}`} position={[Math.cos(ang) * 1.48, 1.0, Math.sin(ang) * 1.48]} castShadow>
              <cylinderGeometry args={[0.22, 0.26, 0.75, 12]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          );
        })}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Palace turrets crowning Trikuta Hill */}
        <mesh position={[0, 1.42, 0]} castShadow>
          <boxGeometry args={[1.35, 0.55, 1.1]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {[[-0.45, -0.35], [0.45, -0.35], [0, 0.35]].map(([x, z], i) => (
          <mesh key={`jais-turret-${i}`} position={[x, 1.9, z]} castShadow>
            <coneGeometry args={[0.2, 0.45, 8]} />
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>
    </group>
  );
};

// 22. OOTY — NILGIRI RAILWAY VIADUCT (Multi-Arch Stone Railway Viaduct + Stepped Hillside Contours)
export const OotyNilgiriViaduct: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[-1.4, 0.25, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.85, 1.15, 0.5, 10]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
        <mesh position={[1.4, 0.3, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 1.2, 0.6, 10]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Multi-arch viaduct piers */}
        {[-1.2, -0.6, 0, 0.6, 1.2].map((px, i) => (
          <mesh key={`ooty-pier-${i}`} position={[px, 0.75, 0.1]} castShadow>
            <boxGeometry args={[0.22, 1.4, 0.48]} />
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Continuous stone railway deck + arch spandrels */}
        <mesh position={[0, 1.52, 0.1]} castShadow>
          <boxGeometry args={[3.4, 0.2, 0.58]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 1.68, 0.1]} castShadow>
          <boxGeometry args={[0.7, 0.16, 0.24]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 23. SHILLONG — KHASI MEGALITHS (Lake Basin + 3 Tapered Khasi Standing Megaliths + Pine Ridge)
export const ShillongMegaliths: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.58, 0.58, 0.58]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <cylinderGeometry args={[2.25, 2.35, 0.14, 40]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges threshold={20} />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Pine ridge behind the basin */}
        <mesh position={[0, 0.45, -1.05]} castShadow>
          <coneGeometry args={[1.2, 0.8, 7]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* 3 Tapered Khasi standing monoliths */}
        {[
          { x: 0, h: 1.85, w: 0.34, z: 0.1 },
          { x: -0.68, h: 1.35, w: 0.28, z: 0.22 },
          { x: 0.68, h: 1.48, w: 0.28, z: 0.18 },
        ].map((m, i) => (
          <mesh key={`shil-mono-${i}`} position={[m.x, 0.15 + m.h / 2, m.z]} castShadow>
            <cylinderGeometry args={[m.w * 0.55, m.w, m.h, 6]} />
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>
    </group>
  );
};

// 24. KANYAKUMARI — VIVEKANANDA ROCK MEMORIAL (Stepped Ocean Rock Island + Mandapam Colonnade + Curved Chola Dome)
export const KanyakumariRockMemorial: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.58, 0.58, 0.58]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.65, 2.15, 0.44, 10]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[1.75, 0.32, 1.35]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {/* Mandapam colonnade */}
        {[-0.65, -0.22, 0.22, 0.65].map((px, i) => (
          <mesh key={`kan-col-${i}`} position={[px, 1.0, 0.5]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.52, 8]} />
            <ChromeMaterial />
          </mesh>
        ))}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[1.3, 0.52, 0.95]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        <mesh position={[0, 1.48, 0]} castShadow>
          <sphereGeometry args={[0.46, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 2.02, 0]} castShadow>
          <coneGeometry args={[0.07, 0.26, 8]} />
          <ChromeMaterial />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 25. MAHABALIPURAM — SHORE TEMPLE (Twin Stepped Pyramidal Dravidian Vimana Towers)
export const MahabalipuramShoreTemple: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.9, 0.32, 1.8]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      {/* Tall East Vimana */}
      <BuildingTier tierIndex={1} time={time}>
        {[0, 1, 2, 3, 4].map((k) => {
          const w = 1.18 - k * 0.2;
          return (
            <mesh key={`mah-tall-${k}`} position={[-0.45, 0.48 + k * 0.32, 0]} castShadow>
              <boxGeometry args={[w, 0.28, w]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          );
        })}
        <mesh position={[-0.45, 2.15, 0]} castShadow>
          <coneGeometry args={[0.24, 0.32, 8]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      {/* Shorter West Vimana */}
      <BuildingTier tierIndex={2} time={time}>
        {[0, 1, 2, 3].map((k) => {
          const w = 0.9 - k * 0.18;
          return (
            <mesh key={`mah-short-${k}`} position={[0.72, 0.46 + k * 0.28, 0]} castShadow>
              <boxGeometry args={[w, 0.25, w]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          );
        })}
        <mesh position={[0.72, 1.62, 0]} castShadow>
          <coneGeometry args={[0.18, 0.24, 8]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 26. RAMESWARAM — CORRIDOR PILLARS (Rhythmic Colonnade along Z-axis + Gopuram Gateway)
export const RameswaramCorridor: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.24, 3.4]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        {/* Paired carved corridor pillars along the Z-axis */}
        {[-1.25, -0.75, -0.25, 0.25, 0.75, 1.25].map((pz, i) => (
          <group key={`ram-pair-${i}`}>
            <mesh position={[-0.65, 0.78, pz]} castShadow>
              <boxGeometry args={[0.18, 1.08, 0.18]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
            <mesh position={[0.65, 0.78, pz]} castShadow>
              <boxGeometry args={[0.18, 1.08, 0.18]} />
              <ChromeMaterial />
              <ThemeEdges />
            </mesh>
          </group>
        ))}
        {/* Corridor lintel beams */}
        <mesh position={[-0.65, 1.38, 0]} castShadow>
          <boxGeometry args={[0.26, 0.14, 3.0]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0.65, 1.38, 0]} castShadow>
          <boxGeometry args={[0.26, 0.14, 3.0]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Gopuram gateway at rear Z */}
        {[0, 1, 2, 3].map((k) => (
          <mesh key={`ram-gop-${k}`} position={[0, 1.65 + k * 0.26, -1.25]} castShadow>
            <boxGeometry args={[1.55 - k * 0.24, 0.24, 0.65 - k * 0.08]} />
            <ChromeMaterial />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>
    </group>
  );
};

// 27. LONDON — ELIZABETH TOWER (Square Gothic Tower + 4 Recessed Clock Dials + Steep Pyramidal Spire)
export const LondonElizabethTower: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.3, 1.6]} />
          <ChromeMaterial gunmetal />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.88, 1.85, 0.88]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Clock Housing + 4 Clock Discs */}
        <mesh position={[0, 2.35, 0]} castShadow>
          <boxGeometry args={[0.98, 0.56, 0.98]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {[
          { pos: [0, 2.35, 0.51] as [number, number, number], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
          { pos: [0, 2.35, -0.51] as [number, number, number], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
          { pos: [0.51, 2.35, 0] as [number, number, number], rot: [0, 0, Math.PI / 2] as [number, number, number] },
          { pos: [-0.51, 2.35, 0] as [number, number, number], rot: [0, 0, Math.PI / 2] as [number, number, number] },
        ].map((d, i) => (
          <mesh key={`lon-clock-${i}`} position={d.pos} rotation={d.rot}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
            <ChromeMaterial gunmetal />
            <ThemeEdges />
          </mesh>
        ))}
      </BuildingTier>

      <BuildingTier tierIndex={3} time={time}>
        {/* Steep Gothic Pyramidal Spire */}
        <mesh position={[0, 3.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.62, 1.05, 4]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>
    </group>
  );
};

// 28. TOKYO — TOKYO SKYTREE (Tripod Lattice Base + Tapering Spire + Two Circular Observation Decks)
export const TokyoSkytree: React.FC<MonumentProps> = ({ time }) => {
  return (
    <group scale={[0.56, 0.56, 0.56]}>
      <BuildingTier tierIndex={0} time={time}>
        {/* Tripod Lattice Base */}
        {[0, 1, 2].map((i) => {
          const ang = (i * Math.PI * 2) / 3;
          return (
            <mesh
              key={`tok-leg-${i}`}
              position={[Math.cos(ang) * 0.45, 0.55, Math.sin(ang) * 0.45]}
              rotation={[Math.sin(ang) * 0.24, 0, -Math.cos(ang) * 0.24]}
              castShadow
            >
              <cylinderGeometry args={[0.14, 0.24, 1.2, 8]} />
              <ChromeMaterial gunmetal />
              <ThemeEdges />
            </mesh>
          );
        })}
      </BuildingTier>

      <BuildingTier tierIndex={1} time={time}>
        <mesh position={[0, 1.55, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.34, 1.5, 16]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        {/* Tembo Deck 1 */}
        <mesh position={[0, 2.05, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.38, 0.22, 24]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
      </BuildingTier>

      <BuildingTier tierIndex={2} time={time}>
        {/* Upper Spire + Tembo Galleria Deck 2 + Antenna */}
        <mesh position={[0, 2.65, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.18, 1.05, 16]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 2.75, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.15, 24]} />
          <ChromeMaterial />
          <ThemeEdges />
        </mesh>
        <mesh position={[0, 3.4, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.05, 0.55, 8]} />
          <ChromeMaterial gunmetal />
        </mesh>
      </BuildingTier>
    </group>
  );
};
