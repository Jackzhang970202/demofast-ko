'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface GlowingBorderProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export default function GlowingBorder({
  children,
  className = '',
  glowColor = '#00f5ff',
}: GlowingBorderProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* 发光边框 */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          padding: '2px',
          background: `conic-gradient(from ${rotation}deg, transparent, ${glowColor}, transparent, ${glowColor}, transparent)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          filter: 'blur(1px)',
        }}
      />
      {/* 内容 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}