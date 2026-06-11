'use client';

import { motion } from 'framer-motion';
import { Tool, CATEGORY_COLORS, CATEGORY_NAMES } from '@/data/tools';

interface ToolCardProps {
  tool: Tool;
  index: number;
}

export default function ToolCard({ tool, index }: ToolCardProps) {
  const isEven = index % 2 === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`flex items-center gap-7 mb-8 mx-auto max-w-[680px] ${
        isEven ? 'flex-row-reverse' : ''
      }`}
    >
      {/* Flip card */}
      <div className="flip-card w-[200px] h-[180px] flex-shrink-0">
        <div className="flip-card-inner">
          {/* Front */}
          <div className="flip-card-front glass-card rounded-[20px] flex flex-col items-center justify-center gap-3">
            <span className="text-[42px] leading-none">{tool.icon}</span>
            <span className="text-base font-semibold text-text-primary">
              {tool.name}
            </span>
            <span
              className={`text-[11px] ${CATEGORY_COLORS[tool.category]}`}
            >
              {CATEGORY_NAMES[tool.category]}
            </span>
          </div>

          {/* Back */}
          <div className="flip-card-back glass-card rounded-[20px] flex items-center justify-center p-6">
            <motion.p
              initial={{ opacity: 0, x: isEven ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-sm text-text-secondary text-center leading-relaxed"
            >
              {tool.description}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
