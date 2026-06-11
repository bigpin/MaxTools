'use client';

import { motion } from 'framer-motion';

interface AuroraTextProps {
  text: string;
  className?: string;
}

export default function AuroraText({ text, className }: AuroraTextProps) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`animate-aurora font-black tracking-tight ${className ?? ''}`}
    >
      {text}
    </motion.h1>
  );
}
