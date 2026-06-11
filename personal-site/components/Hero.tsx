'use client';

import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import AuroraText from '@/components/AuroraText';

const skills = ['微信小程序', 'JavaScript', '云开发', 'React'];

export default function Hero() {
  return (
    <section
      id="home"
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    >
      <StarField />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <AuroraText text="MAX" className="text-7xl md:text-9xl" />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 text-text-secondary tracking-[0.3em] text-sm md:text-base"
        >
          独立开发者 · 小程序创作者
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-4 py-1.5 rounded-full text-sm bg-aurora-purple/15 text-aurora-purple border border-aurora-purple/30"
            >
              {skill}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="absolute bottom-8 z-10"
      >
        <a href="#about" className="animate-bounce-down block">
          <svg
            className="w-6 h-6 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </a>
      </motion.div>
    </section>
  );
}
