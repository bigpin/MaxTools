'use client';

import { motion } from 'framer-motion';

export default function About() {
  return (
    <section id="about" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-100px' }}
        className="max-w-2xl mx-auto"
      >
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <h2 className="text-xl font-semibold mb-6 text-text-primary">关于我</h2>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed">
            热衷于用技术解决日常问题。专注于微信小程序开发，打造实用、好用的工具类应用。相信小而美的产品也能带来大价值。
          </p>
        </div>
      </motion.div>
    </section>
  );
}
