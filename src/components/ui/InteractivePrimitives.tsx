import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { FLUID_SPRING, FLUID_HOVER, FLUID_TAP } from '../../motion/fluidTokens';

export interface PopButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const PopButton = React.forwardRef<HTMLButtonElement, PopButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-2.5 py-1 text-[10px]',
      md: 'px-4 py-2 text-[11px]',
      lg: 'px-5 py-2.5 text-[12px]',
    }[size];

    const variantClasses = {
      primary:
        'bg-[var(--bg-surface)] border border-[var(--hairline-strong)] text-[var(--ink-primary)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)]',
      outline:
        'bg-transparent border border-[var(--hairline-strong)] text-[var(--ink-primary)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)]',
      ghost:
        'bg-transparent border border-transparent text-[var(--ink-secondary)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)]',
      danger:
        'pop-button-danger bg-red-500/10 border border-[#DC2626]/50 text-[#DC2626] hover:bg-[#DC2626] hover:text-white',
    }[variant];

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : FLUID_HOVER}
        whileTap={disabled ? undefined : FLUID_TAP}
        transition={FLUID_SPRING}
        className={`pop-button gpu-fluid transition-colors duration-100 select-none font-mono tracking-widest uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:y-0 disabled:hover:scale-100 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
PopButton.displayName = 'PopButton';

export interface PopCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  isSelected?: boolean;
}

export const PopCard = React.forwardRef<HTMLDivElement, PopCardProps>(
  ({ isSelected = false, className = '', children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ y: -4, scale: 1.016 }}
        whileTap={{ scale: 0.99 }}
        transition={FLUID_SPRING}
        className={`pop-card gpu-fluid metallic-sheen transition-colors duration-100 cursor-pointer ${
          isSelected
            ? 'bg-[var(--bg-elevated)] border border-[var(--ink-primary)] shadow-2xl'
            : 'bg-[var(--bg-surface)] border border-[var(--hairline)] hover:border-[var(--hairline-strong)] hover:bg-[var(--bg-elevated)]'
        } ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
PopCard.displayName = 'PopCard';
