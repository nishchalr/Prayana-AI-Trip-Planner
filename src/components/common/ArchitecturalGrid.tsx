import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';

export const ArchitecturalGrid: React.FC = () => {
  const { theme } = usePrayana();
  const isLight = theme === 'light';

  const lineColor = isLight ? 'rgba(14, 14, 14, 0.14)' : 'rgba(242, 240, 235, 0.10)';
  const crosshairColor = isLight ? 'rgba(14, 14, 14, 0.28)' : 'rgba(242, 240, 235, 0.35)';
  const cornerTextColor = isLight ? 'rgba(14, 14, 14, 0.38)' : 'rgba(242, 240, 235, 0.25)';

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Background subtle architectural micro-grid */}
      <div className={`absolute inset-0 arch-grid-bg ${isLight ? 'opacity-90' : 'opacity-60'}`} />

      {/* Main Structural Crosshair Vertical Lines */}
      <div className="absolute top-0 bottom-0 left-[32%] w-px" style={{ backgroundColor: lineColor }} />
      <div className="absolute top-0 bottom-0 right-[32%] w-px" style={{ backgroundColor: lineColor }} />

      {/* Horizontal Structural Hairline under Destination Titles */}
      <div className="absolute top-[220px] left-0 right-0 h-px" style={{ backgroundColor: lineColor }} />

      {/* Crosshair Accent Marks at Grid Intersections */}
      <div
        className="absolute top-[220px] left-[32%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono select-none"
        style={{ color: crosshairColor }}
      >
        +
      </div>
      <div
        className="absolute top-[220px] right-[32%] translate-x-1/2 -translate-y-1/2 text-[10px] font-mono select-none"
        style={{ color: crosshairColor }}
      >
        +
      </div>

      {/* Corner Brackets (hidden on narrow mobile screens to avoid colliding with headers) */}
      <div
        className="hidden sm:block absolute top-14 left-6 text-[9px] font-mono tracking-widest uppercase"
        style={{ color: cornerTextColor }}
      >
        LOC. 15°19&apos;N 76°27&apos;E // {isLight ? 'ARCH_PAPER' : 'ARCH_OBSIDIAN'}
      </div>
      <div
        className="hidden md:block absolute top-14 right-6 text-[9px] font-mono tracking-widest uppercase"
        style={{ color: cornerTextColor }}
      >
        SYS.PRYN.V1.4 // RUN_ACTIVE
      </div>
    </div>
  );
};
