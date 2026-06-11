'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const navItems = [
  { label: '关于', href: '#about' },
  { label: '工具', href: '#tools' },
  { label: '联系', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'glass-card' : ''
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="#home" className="text-lg font-bold animate-aurora">
          MAX
        </a>
        <div className="flex gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
