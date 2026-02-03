import { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
  gradient?: 'owner' | 'researcher' | 'verifier';
}

export function Layout({ children, gradient }: LayoutProps) {
  const gradientClass = gradient
    ? `min-h-screen ${
        gradient === 'owner'
          ? 'gradient-owner'
          : gradient === 'researcher'
          ? 'gradient-researcher'
          : 'gradient-verifier'
      }`
    : 'min-h-screen bg-gray-50';

  return (
    <div className={gradientClass}>
      <Navigation />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
