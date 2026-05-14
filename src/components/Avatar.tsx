import React from 'react';

interface AvatarProps {
  size?: number;
  src?: string;
  isVip?: boolean;
  isAdmin?: boolean;
  online?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ 
  size = 40, 
  src = 'https://ui-avatars.com/api/?name=VTeen&background=8B5CF6&color=fff', 
  isVip = false, 
  isAdmin = false,
  online = false 
}) => {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div 
        className={`w-full h-full rounded-full p-[2px] ${
          isAdmin ? 'bg-linear-to-tr from-cyan-400 to-blue-600' : 
          isVip ? 'bg-linear-to-tr from-yellow-400 to-orange-500' : 
          'bg-linear-to-tr from-violet-500 to-fuchsia-500'
        }`}
      >
        <img 
          src={src} 
          alt="Avatar" 
          className="w-full h-full rounded-full object-cover bg-background"
        />
      </div>
      
      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-background rounded-full" />
      )}
      
      {(isVip || isAdmin) && (
        <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase shadow-lg ${
          isAdmin ? 'bg-cyan-500 text-white' : 'bg-vip text-black'
        }`}>
          {isAdmin ? 'Admin' : 'VIP'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
