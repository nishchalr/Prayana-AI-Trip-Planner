import React from 'react';

export const ArchitecturalGrid: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Background subtle micro-grid */}
      <div className="absolute inset-0 arch-grid-bg opacity-30" />

      {/* Main Structural Crosshair Vertical Lines */}
      <div className="absolute top-0 bottom-0 left-[32%] w-px bg-[rgba(242,240,235,0.1)]" />
      <div className="absolute top-0 bottom-0 right-[32%] w-px bg-[rgba(242,240,235,0.1)]" />

      {/* Horizontal Structural Hairline under Destination Titles */}
      <div className="absolute top-[220px] left-0 right-0 h-px bg-[rgba(242,240,235,0.12)]" />
      
      {/* Crosshair Accent Marks at Grid Intersections */}
      <div className="absolute top-[220px] left-[32%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-[rgba(242,240,235,0.35)] select-none">
        +
      </div>
      <div className="absolute top-[220px] right-[32%] translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-[rgba(242,240,235,0.35)] select-none">
        +
      </div>

      {/* Corner Brackets (hidden on narrow mobile screens to avoid colliding with headers) */}
      <div className="hidden sm:block absolute top-14 left-6 text-[9px] font-mono text-[rgba(242,240,235,0.25)] tracking-widest uppercase">
        LOC. 15°19'N 76°27'E // ARCH_OBSIDIAN
      </div>
      <div className="hidden md:block absolute top-14 right-6 text-[9px] font-mono text-[rgba(242,240,235,0.25)] tracking-widest uppercase">
        SYS.PRYN.V1.4 // RUN_ACTIVE
      </div>
    </div>
  );
};
