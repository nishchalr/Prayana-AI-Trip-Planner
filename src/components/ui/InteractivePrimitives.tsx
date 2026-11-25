import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

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
      primary: 'bg-[#151515] border border-[rgba(242,240,235,0.2)] text-[#F2F0EB] hover:bg-[#F2F0EB] hover:text-[#0E0E0E]',
      outline: 'bg-transparent border border-[rgba(242,240,235,0.2)] text-[#F2F0EB] hover:bg-[#F2F0EB] hover:text-[#0E0E0E]',
      ghost: 'bg-transparent border border-transparent text-ink-secondary hover:text-[#0E0E0E] hover:bg-[#F2F0EB]',
      danger: 'bg-[#1A1212] border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626] hover:text-[#F2F0EB]',
    }[variant];

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { y: -2, scale: 1.035 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 650, damping: 32, mass: 0.6 }}
        className={`pop-button transition-colors duration-100 select-none font-mono tracking-widest uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:y-0 disabled:hover:scale-100 ${sizeClasses} ${variantClasses} ${className}`}
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
        transition={{ type: 'spring', stiffness: 650, damping: 32, mass: 0.6 }}
        className={`pop-card metallic-sheen transition-colors duration-100 cursor-pointer ${
          isSelected
            ? 'bg-[#18181A] border border-[#F2F0EB] shadow-2xl'
            : 'bg-[#121212] border border-[rgba(242,240,235,0.12)] hover:border-[#F2F0EB]/60 hover:bg-[#1A1A1C]'
        } ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
PopCard.displayName = 'PopCard';
