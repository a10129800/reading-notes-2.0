import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-ink-600 dark:text-academic-mutedDark mb-1">
          <span>閱讀進度</span>
          <span className="font-mono font-medium">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-paper-300 dark:bg-ink-800 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className="bg-bronze-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
