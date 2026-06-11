'use client';

import { motion } from 'framer-motion';

const links = [
  { label: 'GitHub', href: 'https://github.com', icon: 'GH' },
  { label: '微信', href: '#', icon: 'WX' },
  { label: '邮箱', href: 'mailto:max@example.com', icon: '✉' },
];

export default function Contact() {
  return (
    <section id="contact" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto"
      >
        <div className="glass-card rounded-2xl p-8 text-center">
          <span className="text-text-secondary text-xs tracking-[0.3em] uppercase">
            CONTACT
          </span>

          <div className="flex justify-center gap-5 mt-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-text-secondary hover:text-aurora-purple hover:border-aurora-purple/30 transition-colors"
              >
                <span className="text-sm font-medium">{link.icon}</span>
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
