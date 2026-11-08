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
        className={`px-2 py-0.5 rounded transition-all duration-150 ${
          fontSize === 'normal'
            ? 'bg-white dark:bg-ink-700 text-bronze-800 dark:text-bronze-200 font-bold shadow-xs ring-1 ring-bronze-500/30'
            : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-200 font-medium'
        }`}
        title="預設字級 (標)"
      >
        標
      </button>
      <button
        onClick={() => setFontSize('large')}
        className={`px-2 py-0.5 rounded transition-all duration-150 ${
          fontSize === 'large'
            ? 'bg-white dark:bg-ink-700 text-bronze-800 dark:text-bronze-200 font-bold shadow-xs ring-1 ring-bronze-500/30'
            : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-200 font-medium'
        }`}
        title="放大字級 (大)"
      >
        大
      </button>
      <button
        onClick={() => setFontSize('xlarge')}
        className={`px-2 py-0.5 rounded transition-all duration-150 ${
          fontSize === 'xlarge'
            ? 'bg-white dark:bg-ink-700 text-bronze-800 dark:text-bronze-200 font-bold shadow-xs ring-1 ring-bronze-500/30'
            : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-200 font-medium'
        }`}
        title="特大字級 (特大)"
      >
        特大
      </button>
    </div>
  );
};

