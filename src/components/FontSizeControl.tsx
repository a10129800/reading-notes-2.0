import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Type } from 'lucide-react';

export const FontSizeControl: React.FC = () => {
  const { fontSize, setFontSize } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 bg-paper-200 dark:bg-ink-800 p-1 rounded-md text-xs border border-academic-borderLight dark:border-academic-borderDark">
      <Type className="w-3.5 h-3.5 text-ink-500 ml-1 mr-0.5" />
      <button
        onClick={() => setFontSize('normal')}
        className={`px-2 py-0.5 rounded font-medium transition-colors ${
          fontSize === 'normal'
            ? 'bg-paper-50 dark:bg-ink-700 text-bronze-700 dark:text-bronze-300 shadow-sm'
            : 'text-ink-600 dark:text-ink-400 hover:text-ink-900'
        }`}
        title="預設字級"
      >
        標
      </button>
      <button
        onClick={() => setFontSize('large')}
        className={`px-2 py-0.5 rounded font-medium transition-colors ${
          fontSize === 'large'
            ? 'bg-paper-50 dark:bg-ink-700 text-bronze-700 dark:text-bronze-300 shadow-sm'
            : 'text-ink-600 dark:text-ink-400 hover:text-ink-900'
        }`}
        title="中大字級"
      >
        大
      </button>
      <button
        onClick={() => setFontSize('xlarge')}
        className={`px-2 py-0.5 rounded font-medium transition-colors ${
          fontSize === 'xlarge'
            ? 'bg-paper-50 dark:bg-ink-700 text-bronze-700 dark:text-bronze-300 shadow-sm'
            : 'text-ink-600 dark:text-ink-400 hover:text-ink-900'
        }`}
        title="特大字級"
      >
        特大
      </button>
    </div>
  );
};
