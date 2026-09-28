import React from 'react';

interface UserAvatarProps {
  name: string;
  avatarColor?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarColor,
  size = 'md',
  className = '',
  showTooltip = false,
}) => {
  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs font-medium',
    lg: 'w-10 h-10 text-sm font-semibold',
    xl: 'w-14 h-14 text-lg font-bold',
  };

  const bgColor = avatarColor || '#4F46E5';

  return (
    <div
      title={showTooltip ? name : undefined}
      className={`inline-flex items-center justify-center rounded-full text-white shrink-0 select-none shadow-xs ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {getInitials(name)}
    </div>
  );
};
