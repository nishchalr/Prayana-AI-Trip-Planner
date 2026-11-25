import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { MonolithStop, StrainLevel } from '../../types';
import { PopButton } from '../ui/InteractivePrimitives';
import { LeafletRouteCanvas } from './LeafletRouteCanvas';
import { 
  Network, 
  Map as MapIcon, 
  Pin, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Check, 
  X, 
  Mountain, 
  Clock, 
  Activity,
  Compass,
  AlertTriangle 
} from 'lucide-react';

const DEST_COORDS: Record<string, { lat: string; lng: string; gridX: string[]; gridY: string[] }> = {
  hampi: { 
    lat: '15.3350° N', 
    lng: '76.4600° E',
    gridX: ["76°27'00\"E", "76°27'30\"E", "76°28'00\"E", "76°28'30\"E", "76°29'00\"E"],
    gridY: ["15°21'00\"N", "15°20'30\"N", "15°20'00\"N", "15°19'30\"N"]
  },
  coorg: { 
    lat: '12.4244° N', 
    lng: '75.7382° E',
    gridX: ["75°43'00\"E", "75°43'45\"E", "75°44'30\"E", "75°45'15\"E", "75°46'00\"E"],
    gridY: ["12°26'00\"N", "12°25'30\"N", "12°25'00\"N", "12°24'30\"N"]
  },
  kyoto: { 
    lat: '35.0116° N', 
    lng: '135.7681° E',
    gridX: ["135°45'00\"E", "135°46'00\"E", "135°47'00\"E", "135°48'00\"E", "135°49'00\"E"],
    gridY: ["35°01'30\"N", "35°01'00\"N", "35°00'30\"N", "35°00'00\"N"]
  },
  varanasi: { 
    lat: '25.3176° N', 
    lng: '82.9739° E',
    gridX: ["82°58'00\"E", "82°59'00\"E", "83°00'00\"E", "83°01'00\"E", "83°02'00\"E"],
    gridY: ["25°19'30\"N", "25°19'00\"N", "25°18'30\"N", "25°18'00\"N"]
  },
};

const getStrainColor = (strain: StrainLevel) => {
  switch (strain) {
    case 'LOW':
      return '#10B981'; // Emerald
    case 'MODERATE':
      return '#D97706'; // Amber
    case 'ELEVATED':
      return '#DC2626'; // Crimson
  }
};

export const DualModeRouteMap: React.FC = () => {
  const { 
    routeStops, 
    activeMapMode, 
    setActiveMapMode, 
    reorderRouteStops, 
    updateRouteStop, 
    removeRouteStop,
    activeStopId,
    setActiveStopId,
    hoveredStopId,
    setHoveredStopId,
    activeDestination,
    activeTrip 
  } = usePrayana();

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');

  const destSpatial = DEST_COORDS[activeDestination.id] || DEST_COORDS.hampi;

  const handleStartEdit = (stop: MonolithStop) => {
    setEditingNodeId(stop.id);
    setEditedTitle(stop.title);
  };

  const handleSaveEdit = (stopId: string) => {
    if (editedTitle.trim()) {
      updateRouteStop(stopId, { title: editedTitle.trim() });
    }
    setEditingNodeId(null);
  };

  // Node position calculation for SVG route path
  const nodeCount = routeStops.length;
  const svgWidth = 860;
  const svgHeight = 250;
  const paddingX = 90;
  const stepX = (svgWidth - paddingX * 2) / Math.max(1, nodeCount - 1);

  const getNodeCoords = (idx: number) => {
    const x = paddingX + idx * stepX;
    // Topographic elevation variance
    const y = 125 + Math.sin(idx * 1.25) * 38;
    return { x, y };
  };

  // Generate smooth continuous SVG curve path string through all node coordinates
  const fullPathD = useMemo(() => {
    if (routeStops.length === 0) return '';
    const points = routeStops.map((_, i) => getNodeCoords(i));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const pCurrent = points[i];
      const pNext = points[i + 1];
      const cx = (pCurrent.x + pNext.x) / 2;
      d += ` C ${cx} ${pCurrent.y}, ${cx} ${pNext.y}, ${pNext.x} ${pNext.y}`;
    }
    return d;
  }, [routeStops, stepX]);

  // Elevation Profile calculations for bottom chart strip
  const profileData = useMemo(() => {
    if (routeStops.length === 0) return { min: 0, max: 100, points: [] };
    const elevs = routeStops.map(s => s.elevationDeltaM);
    const min = Math.min(0, ...elevs);
    const max = Math.max(80, ...elevs);
    const range = Math.max(1, max - min);

    const chartWidth = 860;
    const chartHeight = 44;
    const pad = 90;
    const w = (chartWidth - pad * 2) / Math.max(1, routeStops.length - 1);

    const points = routeStops.map((s, i) => {
      const px = pad + i * w;
      const normalized = (s.elevationDeltaM - min) / range;
      const py = chartHeight - 8 - normalized * (chartHeight - 16);
      return { x: px, y: py, stop: s };
    });

    let pathD = '';
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const cx = (p1.x + p2.x) / 2;
        pathD += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
      }
    }

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
      : '';

    return { min, max, points, pathD, areaD };
  }, [routeStops]);

  return (
    <div className="relative w-full bg-[#121212] border border-[rgba(242,240,235,0.12)] p-4 select-none flex flex-col justify-between">
      {/* Top Header: Corridor Topology & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(242,240,235,0.08)] mb-2 font-mono text-[10px]">
        <div className="flex items-center space-x-2">
          <span className="text-ink-muted uppercase tracking-widest">
            CORRIDOR TOPOLOGY //
          </span>
          <span className="text-ink-primary font-bold">
            {activeDestination.name.toUpperCase()} (DAY 01)
          </span>
          <span className="text-ink-muted hidden md:inline">
            [{destSpatial.lat}, {destSpatial.lng}]
          </span>
        </div>

        {/* Dual Mode Switcher Toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-[#121212] p-1 border border-[rgba(242,240,235,0.16)] self-start sm:self-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveMapMode('NODE_GRAPH')}
            className={`px-2.5 sm:px-3 py-1.5 flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap text-[10px] sm:text-xs font-mono tracking-wider uppercase ${
              activeMapMode === 'NODE_GRAPH'
                ? 'bg-[#F2F0EB] text-[#0E0E0E] font-bold'
                : 'bg-[#151515] text-[#F2F0EB] hover:bg-[#1E1E1E]'
            }`}
          >
            <Network className="w-3 h-3 shrink-0" />
            <span>ARCHITECTURAL SVG GRAPH</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMapMode('GOOGLE_MAPS')}
            className={`px-2.5 sm:px-3 py-1.5 flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap text-[10px] sm:text-xs font-mono tracking-wider uppercase ${
              activeMapMode === 'GOOGLE_MAPS'
                ? 'bg-[#F2F0EB] text-[#0E0E0E] font-bold'
                : 'bg-[#151515] text-[#F2F0EB] hover:bg-[#1E1E1E]'
            }`}
          >
            <MapIcon className="w-3 h-3 shrink-0" />
            <span>LIVE STREET MAP (OSRM)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: ARCHITECTURAL NODE GRAPH (SVG) WITH CARTOGRAPHIC BACKDROP */}
      {activeMapMode === 'NODE_GRAPH' && (
        <div className="relative w-full overflow-x-auto py-1">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[270px] min-w-[760px] overflow-visible"
          >
            <defs>
              <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F2F0EB" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#F2F0EB" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Cartographic Coordinate Hairline Grid */}
            <g opacity="0.35">
              {[60, 230, 430, 630, 800].map((gx, i) => (
                <line
                  key={`gx-${i}`}
                  x1={gx}
                  y1={12}
                  x2={gx}
                  y2={svgHeight - 12}
                  stroke="rgba(242, 240, 235, 0.08)"
                  strokeWidth="0.75"
                  strokeDasharray="2 4"
                />
              ))}
              {[45, 125, 205].map((gy, i) => (
                <line
                  key={`gy-${i}`}
                  x1={20}
                  y1={gy}
                  x2={svgWidth - 20}
                  y2={gy}
                  stroke="rgba(242, 240, 235, 0.08)"
                  strokeWidth="0.75"
                  strokeDasharray="2 4"
                />
              ))}

              {/* Coordinate Edge Ticks & Labels */}
              {destSpatial.gridX.slice(0, 4).map((label, idx) => (
                <text
                  key={`grid-x-lbl-${idx}`}
                  x={120 + idx * 190}
                  y="20"
                  fill="rgba(242, 240, 235, 0.28)"
                  fontSize="7"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {label}
                </text>
              ))}
              {destSpatial.gridY.slice(0, 3).map((label, idx) => (
                <text
                  key={`grid-y-lbl-${idx}`}
                  x="24"
                  y={50 + idx * 75}
                  fill="rgba(242, 240, 235, 0.28)"
                  fontSize="7"
                  fontFamily="JetBrains Mono"
                >
                  {label}
                </text>
              ))}
            </g>

            {/* SVG Topographic Elevation Contour Rings */}
            <g opacity="0.18">
              <path
                d="M 120 70 C 180 30, 280 40, 320 80 C 360 120, 260 190, 190 180 C 140 170, 80 120, 120 70 Z"
                fill="none"
                stroke="#F2F0EB"
                strokeWidth="0.75"
                strokeDasharray="3 3"
              />
              <path
                d="M 145 85 C 190 55, 260 65, 295 95 C 330 125, 245 170, 195 160 C 155 150, 110 115, 145 85 Z"
                fill="none"
                stroke="#F2F0EB"
                strokeWidth="0.75"
              />
              <path
                d="M 170 100 C 200 80, 240 85, 265 110 C 290 135, 230 155, 200 148 C 175 140, 135 120, 170 100 Z"
                fill="none"
                stroke="#F2F0EB"
                strokeWidth="0.75"
                strokeDasharray="2 2"
              />

              <path
                d="M 520 80 C 580 40, 680 50, 720 100 C 760 150, 660 210, 590 190 C 530 175, 470 130, 520 80 Z"
                fill="none"
                stroke="#F2F0EB"
                strokeWidth="0.75"
                strokeDasharray="3 3"
              />
              <path
                d="M 545 95 C 595 65, 660 75, 695 115 C 725 150, 645 185, 595 170 C 550 155, 500 125, 545 95 Z"
                fill="none"
                stroke="#F2F0EB"
                strokeWidth="0.75"
              />
            </g>

            {/* North Compass Rose (Top Right) */}
            <g transform="translate(815, 34)">
              <circle r="14" fill="#141414" stroke="rgba(242,240,235,0.22)" strokeWidth="1" />
              <path d="M 0 -11 L 3.5 0 L 0 11 L -3.5 0 Z" fill="#F2F0EB" />
              <path d="M 0 0 L 3.5 0 L 0 11 Z" fill="#666666" />
              <text
                textAnchor="middle"
                y="-15"
                fill="#F2F0EB"
                fontSize="7.5"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
              >
                N
              </text>
            </g>

            {/* Cartographic Scale Bar (Bottom Right) */}
            <g transform="translate(745, 236)">
              <line x1="0" y1="0" x2="70" y2="0" stroke="rgba(242,240,235,0.4)" strokeWidth="1.5" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(242,240,235,0.4)" strokeWidth="1.5" />
              <line x1="35" y1="-2" x2="35" y2="2" stroke="rgba(242,240,235,0.4)" strokeWidth="1" />
              <line x1="70" y1="-3" x2="70" y2="3" stroke="rgba(242,240,235,0.4)" strokeWidth="1.5" />
              <text
                textAnchor="middle"
                x="35"
                y="-5"
                fill="#8A8882"
                fontSize="7"
                fontFamily="JetBrains Mono"
              >
                1.0 KM / 0.62 MI
              </text>
            </g>

            {/* Animated Smooth Topological Route Spine */}
            <motion.path
              d={fullPathD}
              fill="none"
              stroke="#F2F0EB"
              strokeWidth="1.75"
              strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 } as any}
              animate={{ pathLength: 1, opacity: 0.7 } as any}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Traveling Transit Pulse Dot along Route Spine */}
            <motion.path
              d={fullPathD}
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="2.5"
              strokeDasharray="16 260"
              animate={{ strokeDashoffset: [276, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'linear' }}
            />

            {/* Connecting Route Segments & Distance Badges */}
            {routeStops.map((stop, idx) => {
              if (idx === routeStops.length - 1) return null;
              const p1 = getNodeCoords(idx);
              const p2 = getNodeCoords(idx + 1);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const nextStop = routeStops[idx + 1];

              return (
                <g key={`edge-${stop.id}-${nextStop.id}`}>
                  {/* Hairline Direct Leg Path */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="rgba(242, 240, 235, 0.2)"
                    strokeWidth="1"
                    strokeDasharray={nextStop.effortRating === 'ELEVATED' ? '4 4' : 'none'}
                  />

                  {/* Inter-Stop Transit Duration & Effort Badge */}
                  <g transform={`translate(${midX}, ${midY - 14})`}>
                    <rect
                      x="-42"
                      y="-9"
                      width="84"
                      height="18"
                      fill="#141414"
                      stroke="rgba(242, 240, 235, 0.16)"
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      y="3.5"
                      fill="#8A8882"
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                      letterSpacing="0.05em"
                    >
                      {nextStop.distanceKm}KM · {nextStop.slopeDeg}°
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Individual Route Waypoint Nodes (01–08) */}
            {routeStops.map((stop, idx) => {
              const { x, y } = getNodeCoords(idx);
              const isSelected = activeStopId === stop.id;
              const isHovered = hoveredStopId === stop.id;
              const strainColor = getStrainColor(stop.effortRating);

              return (
                <g
                  key={stop.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => setActiveStopId(isSelected ? null : stop.id)}
                  onMouseEnter={() => setHoveredStopId(stop.id)}
                  onMouseLeave={() => setHoveredStopId(null)}
                  className="cursor-pointer group select-none"
                >
                  {/* Outer Pulsing Halo when active or hovered */}
                  <circle
                    r={isSelected ? 24 : isHovered ? 21 : 16}
                    fill={isHovered ? '#222222' : '#141414'}
                    stroke={isSelected || isHovered ? '#F2F0EB' : strainColor}
                    strokeWidth={isSelected || isHovered ? 2 : 1}
                    className="transition-colors duration-150"
                  />

                  {/* Inner Core Circle */}
                  <circle
                    r={isSelected || isHovered ? 11 : 7}
                    fill={stop.isPinned || isHovered ? '#F2F0EB' : '#222222'}
                    stroke={strainColor}
                    strokeWidth="1.5"
                  />

                  {/* Node Index Text */}
                  <text
                    textAnchor="middle"
                    y="3"
                    fill={stop.isPinned || isHovered ? '#0E0E0E' : '#F2F0EB'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                  >
                    0{stop.index}
                  </text>

                  {/* Node Label Below */}
                  <text
                    textAnchor="middle"
                    y="34"
                    fill={isSelected || isHovered ? '#F2F0EB' : '#8A8882'}
                    fontSize="10"
                    fontFamily="Instrument Serif"
                    className="group-hover:fill-white transition-colors"
                  >
                    {stop.title.length > 20 ? `${stop.title.slice(0, 18)}...` : stop.title}
                  </text>

                  {/* Terrain Delta Tag Above */}
                  <text
                    textAnchor="middle"
                    y="-24"
                    fill={strainColor}
                    fontSize="8"
                    fontFamily="JetBrains Mono"
                  >
                    +{stop.elevationDeltaM}M · {stop.dwellMinutes}M
                  </text>

                  {/* Interactive Floating Dark Tooltip Card on Hover or Select */}
                  <AnimatePresence>
                    {(isHovered || isSelected) && (
                      <g transform="translate(0, -78)">
                        <rect
                          x="-80"
                          y="-24"
                          width="160"
                          height="48"
                          fill="#0E0E0E"
                          stroke="#F2F0EB"
                          strokeWidth="1"
                          filter="drop-shadow(0 8px 16px rgba(0,0,0,0.8))"
                        />
                        <text
                          x="0"
                          y="-10"
                          textAnchor="middle"
                          fill="#F2F0EB"
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                          fontWeight="bold"
                        >
                          {stop.title.length > 22 ? `${stop.title.slice(0, 20)}...` : stop.title}
                        </text>
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#8A8882"
                          fontSize="7.5"
                          fontFamily="JetBrains Mono"
                        >
                          ELEV: +{stop.elevationDeltaM}M · SLOPE: {stop.slopeDeg}°
                        </text>
                        <text
                          x="0"
                          y="16"
                          textAnchor="middle"
                          fill={strainColor}
                          fontSize="7.5"
                          fontFamily="JetBrains Mono"
                          fontWeight="bold"
                        >
                          STRAIN: {stop.effortRating} · DWELL: {stop.dwellMinutes}M
                        </text>
                      </g>
                    )}
                  </AnimatePresence>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* MODE 2: INTERACTIVE LEAFLET DARK MAP + OSRM ROUTING */}
      {activeMapMode === 'GOOGLE_MAPS' && (
        <LeafletRouteCanvas
          routeStops={routeStops}
          activeStopId={activeStopId}
          hoveredStopId={hoveredStopId}
          onSelectStop={setActiveStopId}
          onHoverStop={setHoveredStopId}
          transitMode={activeTrip.transitMode}
          destinationName={activeDestination.name}
        />
      )}

      {/* ELEVATION & EFFORT STRAIN PROFILE CHART STRIP */}
      <div className="mt-3 pt-2.5 border-t border-[rgba(242,240,235,0.1)]">
        <div className="flex items-center justify-between text-[9px] font-mono text-ink-muted mb-1.5">
          <div className="flex items-center space-x-2">
            <Mountain className="w-3 h-3 text-ink-primary" />
            <span className="uppercase tracking-wider font-bold text-ink-primary">ELEVATION & EFFORT STRAIN PROFILE</span>
            <span className="text-[rgba(242,240,235,0.2)]">|</span>
            <span>BASE: +{profileData.min}M · PEAK: +{profileData.max}M</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>LOW</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span>MODERATE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span>ELEVATED</span>
            </span>
          </div>
        </div>

        {/* Height Curve Area SVG Strip */}
        <div className="w-full bg-[#0C0C0C] border border-[rgba(242,240,235,0.08)] px-2 py-1 relative">
          <svg viewBox="0 0 860 48" className="w-full h-11 overflow-visible">
            {/* Horizontal Grid Hairlines */}
            <line x1="0" y1="12" x2="860" y2="12" stroke="rgba(242, 240, 235, 0.05)" strokeWidth="0.75" />
            <line x1="0" y1="28" x2="860" y2="28" stroke="rgba(242, 240, 235, 0.05)" strokeWidth="0.75" />
            <line x1="0" y1="44" x2="860" y2="44" stroke="rgba(242, 240, 235, 0.08)" strokeWidth="0.75" />

            {/* Elevation Area Fill */}
            {profileData.areaD && (
              <path d={profileData.areaD} fill="url(#elevationAreaGrad)" />
            )}

            {/* Profile Stroke Path */}
            {profileData.pathD && (
              <path
                d={profileData.pathD}
                fill="none"
                stroke="rgba(242, 240, 235, 0.6)"
                strokeWidth="1.5"
              />
            )}

            {/* Waypoint Peak Strain Dots */}
            {profileData.points.map((pt, idx) => {
              const isHovered = hoveredStopId === pt.stop.id;
              const isSelected = activeStopId === pt.stop.id;
              const strainColor = getStrainColor(pt.stop.effortRating);

              return (
                <g
                  key={`pt-${pt.stop.id}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer"
                  onClick={() => setActiveStopId(isSelected ? null : pt.stop.id)}
                  onMouseEnter={() => setHoveredStopId(pt.stop.id)}
                  onMouseLeave={() => setHoveredStopId(null)}
                >
                  <circle
                    r={isSelected || isHovered ? 5 : 3.5}
                    fill={strainColor}
                    stroke="#0E0E0E"
                    strokeWidth="1.5"
                  />
                  <text
                    y="-7"
                    textAnchor="middle"
                    fill={isSelected || isHovered ? '#F2F0EB' : '#8A8882'}
                    fontSize="7"
                    fontFamily="JetBrains Mono"
                  >
                    0{pt.stop.index} (+{pt.stop.elevationDeltaM}m)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* INLINE ARCHITECTURAL NODE EDITOR (Shows when a node is selected) */}
      {activeStopId && (() => {
        const selectedStop = routeStops.find(s => s.id === activeStopId);
        if (!selectedStop) return null;
        const stopIndex = routeStops.findIndex(s => s.id === activeStopId);

        return (
          <div className="mt-3 p-3 bg-[#181818] border border-ink-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px]">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className="font-bold text-ink-primary">
                NODE 0{selectedStop.index} //
              </span>

              {editingNodeId === selectedStop.id ? (
                <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="bg-[#121212] border border-[rgba(242,240,235,0.2)] px-2 py-0.5 text-ink-primary text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveEdit(selectedStop.id)}
                    className="p-1 bg-ink-primary text-[#0E0E0E] cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingNodeId(null)}
                    className="p-1 border border-[rgba(242,240,235,0.2)] text-ink-muted cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="font-serif text-lg text-ink-primary">
                    {selectedStop.title}
                  </span>
                  <button
                    onClick={() => handleStartEdit(selectedStop)}
                    className="text-ink-muted hover:text-ink-primary cursor-pointer"
                    title="Rename stop"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Node Controls: Earlier, Later, Pin, Remove */}
            <div className="flex items-center space-x-2 shrink-0">
              <PopButton
                size="sm"
                variant="outline"
                disabled={stopIndex === 0}
                onClick={() => reorderRouteStops(stopIndex, stopIndex - 1)}
                className="flex items-center gap-1"
                title="Move stop earlier"
              >
                <ArrowUp className="w-3 h-3" />
                <span>EARLIER</span>
              </PopButton>

              <PopButton
                size="sm"
                variant="outline"
                disabled={stopIndex === routeStops.length - 1}
                onClick={() => reorderRouteStops(stopIndex, stopIndex + 1)}
                className="flex items-center gap-1"
                title="Move stop later"
              >
                <ArrowDown className="w-3 h-3" />
                <span>LATER</span>
              </PopButton>

              <PopButton
                size="sm"
                variant={selectedStop.isPinned ? 'primary' : 'outline'}
                onClick={() => updateRouteStop(selectedStop.id, { isPinned: !selectedStop.isPinned })}
                className={`flex items-center gap-1 ${
                  selectedStop.isPinned ? '!bg-ink-primary !text-[#0E0E0E]' : ''
                }`}
                title="Pin this stop to preserve order during rerouting"
              >
                <Pin className="w-3 h-3" />
                <span>{selectedStop.isPinned ? 'PINNED' : 'PIN'}</span>
              </PopButton>

              <PopButton
                size="sm"
                variant="danger"
                onClick={() => {
                  removeRouteStop(selectedStop.id);
                  setActiveStopId(null);
                }}
                className="flex items-center gap-1"
                title="Remove stop from route"
              >
                <Trash2 className="w-3 h-3" />
                <span>REMOVE</span>
              </PopButton>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
