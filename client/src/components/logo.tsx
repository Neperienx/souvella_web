import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function SouvellaLogo({ size = 80, className = '' }: LogoProps) {
  return (
    <div 
      className={`bg-[var(--primary)] rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="font-script text-white" style={{ fontSize: size * 0.5 }}>S</span>
    </div>
  );
}