import React, { useEffect, useRef } from 'react';

const UniverseBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stream = containerRef.current;
    if (!stream) return;

    const colors = ['#00f2ff', '#39ffba', '#ffffff', '#7000ff', '#ff00d4'];
    let emitterTimer: ReturnType<typeof window.setInterval> | null = null;

    const getSpawnMetrics = () => ({
      spawnY: window.innerHeight + 20,
      travel: window.innerHeight + 120
    });

    const spawnParticle = () => {
      const metrics = getSpawnMetrics();
      const particle = document.createElement('div');
      particle.className = 'stream-particle';

      const size = Math.random() * 3 + 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * window.innerWidth + 'px';
      particle.style.top = (metrics.spawnY + Math.random() * 18 - 9) + 'px';
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.setProperty('--duration', (Math.random() * 6 + 8).toFixed(2) + 's');
      particle.style.setProperty('--drift', (Math.random() * 80 - 40).toFixed(2) + 'px');
      particle.style.setProperty('--opacity', (Math.random() * 0.18 + 0.3).toFixed(2));
      particle.style.setProperty('--travel', (-metrics.travel - Math.random() * 80).toFixed(2) + 'px');

      stream.appendChild(particle);

      const ttl = (parseFloat(particle.style.getPropertyValue('--duration')) || 10) * 1000 + 500;
      window.setTimeout(() => {
        particle.parentNode?.removeChild(particle);
      }, ttl);
    };

    const stopEmitter = () => {
      if (emitterTimer === null) return;
      window.clearInterval(emitterTimer);
      emitterTimer = null;
    };

    const startEmitter = () => {
      if (emitterTimer !== null) return;
      emitterTimer = window.setInterval(() => {
        if (!document.hidden) spawnParticle();
      }, window.innerWidth < 768 ? 180 : 110);
    };

    stream.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      window.setTimeout(spawnParticle, i * 90);
    }

    startEmitter();

    const handleVisibility = () => {
      if (document.hidden) stopEmitter();
      else startEmitter();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopEmitter();
      document.removeEventListener('visibilitychange', handleVisibility);
      stream.innerHTML = '';
    };
  }, []);

  return (
    <div className="universe-stream-page fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="universe-nebula" />
      <div className="universe-orb universe-orb-right" />
      <div className="universe-orb universe-orb-left" />
      <div id="universe-stream" ref={containerRef} />

      <style>{`
        .universe-stream-page {
          background:
            radial-gradient(circle at 18% 20%, rgba(0, 242, 255, 0.08), transparent 28%),
            radial-gradient(circle at 82% 12%, rgba(112, 0, 255, 0.10), transparent 32%),
            radial-gradient(circle at 75% 78%, rgba(255, 0, 200, 0.06), transparent 26%),
            #05070a;
          color: #ffffff;
        }

        .universe-nebula {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(circle at 20% 30%, rgba(0, 242, 255, 0.10), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(112, 0, 255, 0.12), transparent 40%);
          animation: universeNebulaPulse 15s ease-in-out infinite alternate;
        }

        .universe-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(90px);
        }

        .universe-orb-right {
          width: 520px;
          height: 520px;
          top: 72px;
          right: -140px;
          background: radial-gradient(circle, rgba(123, 140, 255, 0.18), rgba(90, 109, 216, 0.08) 42%, transparent 72%);
          opacity: 0.7;
        }

        .universe-orb-left {
          width: 460px;
          height: 460px;
          left: -180px;
          top: 40px;
          background: radial-gradient(circle, rgba(0, 242, 255, 0.16), rgba(223, 249, 255, 0.05) 42%, transparent 72%);
          opacity: 0.6;
        }

        #universe-stream {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .stream-particle {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.92), currentColor 58%, rgba(255, 255, 255, 0) 100%);
          box-shadow:
            0 0 6px currentColor,
            0 0 14px currentColor;
          filter: blur(0.2px);
          opacity: 0;
          will-change: transform, opacity;
          animation: universeStreamRise var(--duration, 14s) linear forwards;
        }

        @keyframes universeStreamRise {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0;
          }
          10% {
            opacity: var(--opacity, 0.52);
          }
          70% {
            opacity: var(--opacity, 0.52);
          }
          100% {
            transform: translate3d(var(--drift, 0px), var(--travel, -700px), 0) scale(1.08);
            opacity: 0;
          }
        }

        @keyframes universeNebulaPulse {
          from {
            opacity: 0.45;
            transform: scale(1);
          }
          to {
            opacity: 0.8;
            transform: scale(1.04);
          }
        }
      `}</style>
    </div>
  );
};

export default UniverseBackground;
