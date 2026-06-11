'use client';

import { useState, useEffect } from 'react';
import Particles from '@tsparticles/react';
import { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

const particlesOptions: ISourceOptions = {
  fullScreen: false,
  fpsLimit: 60,
  particles: {
    number: {
      value:
        typeof window !== 'undefined' &&
        window.navigator.hardwareConcurrency > 4
          ? 80
          : 40,
      density: {
        enable: true,
      },
    },
    color: {
      value: ['#ffffff', '#c4b5fd', '#67e8f9'],
    },
    opacity: {
      value: { min: 0.2, max: 0.8 },
    },
    size: {
      value: { min: 1, max: 2.5 },
    },
    move: {
      enable: true,
      speed: 0.3,
      outModes: 'out',
    },
  },
  detectRetina: true,
};

export default function StarField() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <Particles
      id="tsparticles"
      options={particlesOptions}
      className="absolute inset-0"
    />
  );
}
