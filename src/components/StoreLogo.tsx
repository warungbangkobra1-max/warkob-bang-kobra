import React, { useState } from 'react';

interface StoreLogoProps {
  logo?: string;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackEmoji?: string;
}

export const StoreLogo: React.FC<StoreLogoProps> = ({
  logo,
  name,
  className = '',
  size = 'md',
  fallbackEmoji = '🐍'
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs rounded-lg',
    sm: 'w-8 h-8 text-sm rounded-xl',
    md: 'w-10 h-10 text-base rounded-xl',
    lg: 'w-14 h-14 text-2xl rounded-2xl',
    xl: 'w-20 h-20 text-4xl rounded-2xl'
  };

  // Check if logo is an image URL or data URI
  const isImage =
    Boolean(logo) &&
    !imageError &&
    (logo!.startsWith('data:image/') ||
      logo!.startsWith('http://') ||
      logo!.startsWith('https://') ||
      logo!.startsWith('/') ||
      logo!.startsWith('./') ||
      /\.(svg|png|jpg|jpeg|webp|gif)$/i.test(logo!));

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden shrink-0 select-none bg-emerald-500/20 border border-emerald-500/30 ${sizeClasses[size]} ${className}`}
    >
      {isImage ? (
        <img
          src={logo}
          alt={name || 'Logo Warung'}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain p-0.5"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex items-center justify-center font-bold leading-none">
          {logo || fallbackEmoji}
        </span>
      )}
    </div>
  );
};
