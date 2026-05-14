import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  layout = 'horizontal'
}) => {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-4xl' },
    xl: { icon: 64, text: 'text-6xl' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col items-center' : 'items-center gap-3'} ${className}`}>
      {/* Icon Part */}
      <div 
        style={{ width: currentSize.icon, height: currentSize.icon }}
        className="relative group"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
          {/* Main "V" Shape */}
          <path 
            d="M20 20L50 80L80 20" 
            stroke="url(#logo-gradient)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          {/* Play Button Inset */}
          <path 
            d="M45 40L60 50L45 60V40Z" 
            fill="white" 
            className="animate-pulse"
          />
          
          <defs>
            <linearGradient id="logo-gradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Text Part */}
      {showText && (
        <div className={layout === 'vertical' ? 'text-center mt-4' : 'text-left'}>
          <h1 className={`${currentSize.text} font-black tracking-[0.1em] text-white leading-none`}>
            VTEEN<span className="text-primary">.</span>
          </h1>
          {size === 'xl' && (
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.4em] mt-2">
              Premium Private Hub
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
