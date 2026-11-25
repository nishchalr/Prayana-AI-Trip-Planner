import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MonolithStop } from '../../types';
import { usePrayana } from '../../context/PrayanaContext';

interface LeafletRouteCanvasProps {
  routeStops: MonolithStop[];
  activeStopId: string | null;
  hoveredStopId: string | null;
  onSelectStop: (id: string | null) => void;
  onHoverStop: (id: string | null) => void;
  transitMode: 'Self-Drive' | 'Public Transport';
  destinationName: string;
}

interface OsrmSummary {
  distanceKm: number;
  durationMin: number;
  status: 'OSRM_LIVE' | 'STRAIGHT_LINE_FALLBACK' | 'FETCHING';
}

export const LeafletRouteCanvas: React.FC<LeafletRouteCanvasProps> = ({
  routeStops,
  activeStopId,
  hoveredStopId,
  onSelectStop,
  onHoverStop,
  transitMode,
  destinationName,
}) => {
  const { theme } = usePrayana();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [osrmSummary, setOsrmSummary] = useState<OsrmSummary>({
    distanceKm: 0,
    durationMin: 0,
    status: 'FETCHING',
  });

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const first = routeStops[0]?.coords || { lat: 15.335, lng: 76.46 };
    const map = L.map(containerRef.current, {
      center: [first.lat, first.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Brutalist Noir dark monochrome vs clean natural light OSM tiles (zero API key required)
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter =
        theme === 'light'
          ? 'none'
          : 'grayscale(100%) invert(92%) contrast(108%) brightness(90%)';
    }

    routeLayerRef.current = L.layerGroup().addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // Update Leaflet tile filter smoothly when Light/Dark theme toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter =
        theme === 'light'
          ? 'none'
          : 'grayscale(100%) invert(92%) contrast(108%) brightness(90%)';
    }
  }, [theme]);

  const mappableStops = routeStops.filter(
    (s): s is MonolithStop & { coords: { lat: number; lng: number } } =>
      Boolean(s.coords && typeof s.coords.lat === 'number' && typeof s.coords.lng === 'number')
  );

  // Fetch OSRM route geometry when ordered stop coordinates change
  const coordsSignature = mappableStops
    .map(s => `${s.id}:${s.coords.lat.toFixed(5)},${s.coords.lng.toFixed(5)}`)
    .join('|');

  useEffect(() => {
    const map = mapRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();
    if (mappableStops.length < 2) {
      setOsrmSummary({ distanceKm: 0, durationMin: 0, status: 'STRAIGHT_LINE_FALLBACK' });
      return;
    }

    const latLngs: [number, number][] = mappableStops.map(s => [s.coords.lat, s.coords.lng]);
    let cancelled = false;

    const drawStraightFallback = () => {
      routeGroup.clearLayers();
      L.polyline(latLngs, {
        color: '#A19F98',
        weight: 2,
        dashArray: '6 6',
        opacity: 0.75,
      }).addTo(routeGroup);

      const totalDist = mappableStops.slice(1).reduce((acc, s) => acc + (s.distanceKm || 1.2), 0);
      setOsrmSummary({
        distanceKm: Number(totalDist.toFixed(2)),
        durationMin: Math.max(5, Math.round((totalDist / (transitMode === 'Self-Drive' ? 28 : 16)) * 60)),
        status: 'STRAIGHT_LINE_FALLBACK',
      });
    };

    const fetchOsrmRoute = async () => {
      setOsrmSummary(prev => ({ ...prev, status: 'FETCHING' }));
      const coordParam = mappableStops.map(s => `${s.coords.lng},${s.coords.lat}`).join(';');
      const profile = transitMode === 'Self-Drive' ? 'driving' : 'foot';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordParam}?overview=full&geometries=geojson`;

      try {
        let resp = await fetch(url);
        if (!resp.ok && profile === 'foot') {
          resp = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson`
          );
        }
        if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);
        const data = await resp.json();
        if (cancelled) return;

        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          throw new Error('No route geometry');
        }

        const polyPoints: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        routeGroup.clearLayers();
        L.polyline(polyPoints, {
          color: '#F2F0EB',
          weight: 3,
          opacity: 0.9,
        }).addTo(routeGroup);

        setOsrmSummary({
          distanceKm: Number((route.distance / 1000).toFixed(2)),
          durationMin: Math.max(1, Math.round(route.duration / 60)),
          status: 'OSRM_LIVE',
        });
      } catch {
        if (!cancelled) {
          drawStraightFallback();
        }
      }
    };

    fetchOsrmRoute();

    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      cancelled = true;
    };
  }, [coordsSignature, transitMode]);

  // Render interactive stop markers synchronized with activeStopId & hoveredStopId
  useEffect(() => {
    const markerGroup = layerGroupRef.current;
    if (!markerGroup) return;
    markerGroup.clearLayers();

    mappableStops.forEach((stop, idx) => {
      const isSelected = activeStopId === stop.id;
      const isHovered = hoveredStopId === stop.id;
      const borderColor =
        stop.effortRating === 'ELEVATED'
          ? '#DC2626'
          : stop.effortRating === 'MODERATE'
          ? '#F59E0B'
          : '#10B981';

      const bg = isSelected ? '#F2F0EB' : '#0E0E0E';
      const fg = isSelected ? '#0E0E0E' : '#F2F0EB';
      const size = isSelected || isHovered ? 28 : 22;

      const icon = L.divIcon({
        className: 'prayana-leaflet-pin',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:${fg};border:2px solid ${
          isSelected || isHovered ? '#FFFFFF' : borderColor
        };display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;box-shadow:0 0 ${
          isSelected || isHovered ? '12px' : '4px'
        } rgba(242,240,235,0.45);cursor:pointer;">${idx + 1}</div>`,
      });

      const marker = L.marker([stop.coords.lat, stop.coords.lng], { icon });
      marker.bindTooltip(
        `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;background:#111;color:#F2F0EB;padding:4px 6px;border:1px solid rgba(242,240,235,0.2);"><strong>0${idx + 1} · ${stop.title}</strong><br/>${stop.optimalTime} · ${stop.effortRating} STRAIN</div>`,
        { direction: 'top', opacity: 0.96 }
      );

      marker.on('click', () => {
        onSelectStop(isSelected ? null : stop.id);
      });
      marker.on('mouseover', () => {
        onHoverStop(stop.id);
      });
      marker.on('mouseout', () => {
        onHoverStop(null);
      });

      marker.addTo(markerGroup);
    });
  }, [routeStops, activeStopId, hoveredStopId, onSelectStop, onHoverStop]);

  return (
    <div className="relative w-full h-[340px] bg-[#0E0E0E] border border-[rgba(242,240,235,0.12)] flex flex-col justify-between overflow-hidden">
      {/* Top Floating Corridor Telemetry */}
      <div className="relative z-[500] flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0E0E0E]/95 border-b border-[rgba(242,240,235,0.1)] text-[9px] font-mono">
        <span className="text-ink-primary font-semibold">
          OPENSTREETMAP NOIR // {destinationName.toUpperCase()}
        </span>
        <div className="flex items-center space-x-3">
          <span className="text-ink-secondary">
            {osrmSummary.distanceKm} KM · {osrmSummary.durationMin} MIN
          </span>
          <span
            className={
              osrmSummary.status === 'OSRM_LIVE'
                ? 'text-semantic-nominal font-bold'
                : osrmSummary.status === 'FETCHING'
                ? 'text-amber-400'
                : 'text-ink-muted'
            }
          >
            {osrmSummary.status === 'OSRM_LIVE'
              ? '[ OSRM LIVE ROUTE ]'
              : osrmSummary.status === 'FETCHING'
              ? '[ COMPUTING OSRM... ]'
              : '[ STRAIGHT-LINE FALLBACK ]'}
          </span>
        </div>
      </div>

      {/* Real Leaflet Container */}
      <div ref={containerRef} className="w-full flex-1 z-10 bg-[#0E0E0E]" />

      {/* Bottom Interactive Legend */}
      <div className="relative z-[500] flex items-center justify-between px-3 py-1.5 bg-[#0E0E0E]/95 border-t border-[rgba(242,240,235,0.1)] text-[8px] font-mono text-ink-muted">
        <span>CLICK OR HOVER PINS TO SYNC TIMELINE · CARTO DARK TILES</span>
        <span className="text-ink-secondary">{routeStops.length} STOPS PLOTTED</span>
      </div>
    </div>
  );
};
