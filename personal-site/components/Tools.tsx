'use client';

import { motion } from 'framer-motion';
import ToolCard from './ToolCard';
import { tools } from '@/data/tools';

export default function Tools() {
  return (
    <section id="tools" className="py-24 px-6">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <span className="text-text-secondary text-xs tracking-[0.3em] uppercase">
          工具集
        </span>
      </motion.div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        {tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} index={i} />
        ))}
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col items-center gap-6">
        {tools.map((tool) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4 }}
            className="flip-card w-[200px] h-[180px]"
          >
            <div className="flip-card-inner">
              {/* Front */}
              <div className="flip-card-front glass-card rounded-[20px] flex flex-col items-center justify-center gap-3">
                <span className="text-[42px] leading-none">{tool.icon}</span>
                <span className="text-base font-semibold text-text-primary">
                  {tool.name}
                </span>
              </div>

              {/* Back */}
              <div className="flip-card-back glass-card rounded-[20px] flex items-center justify-center p-6">
                <p className="text-sm text-text-secondary text-center leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
