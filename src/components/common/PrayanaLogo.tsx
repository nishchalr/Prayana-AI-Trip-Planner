import React from 'react';

interface PrayanaLogoProps {
  className?: string;
  showRing?: boolean;
}

export const PrayanaLogo: React.FC<PrayanaLogoProps> = ({ 
  className = "w-7 h-7", 
  showRing = true 
}) => {
  return (
    <div 
      className={`relative rounded-full overflow-hidden shrink-0 bg-[#0E0E0E] flex items-center justify-center select-none ${
        showRing ? 'ring-1 ring-[#F2F0EB]/35 shadow-[0_0_12px_rgba(242,240,235,0.15)]' : ''
      } ${className}`}
    >
      <img
        src="/prayana-logo.png"
        alt="Prayana"
        className="w-[185%] h-[185%] max-w-none object-cover object-[center_34%] pointer-events-none"
      />
    </div>
  );
};
