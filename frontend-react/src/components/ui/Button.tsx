import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  gradient?: 'owner' | 'researcher' | 'verifier';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  gradient,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseClasses =
    'px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed' +
    (variant === 'danger' ? ' ring-2 ring-red-400/60' : variant === 'secondary' ? ' opacity-95' : '');
  
  const gradientClasses = gradient
    ? `bg-gradient-to-r ${
        gradient === 'owner'
          ? 'from-owner-primary to-owner-secondary'
          : gradient === 'researcher'
          ? 'from-researcher-primary to-researcher-secondary'
          : 'from-verifier-primary to-verifier-secondary'
      }`
    : 'bg-gray-600';

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${gradientClasses} ${className}`}
      whileHover={!disabled ? { y: -2, boxShadow: '0 5px 15px rgba(0,0,0,0.2)' } : {}}
      whileTap={!disabled ? { y: 0 } : {}}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  );
}
