import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Search, Moon, Sun, Layers, ShieldCheck, Menu, X, BookText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isServerLive, setIsServerLive] = useState<boolean | null>(null);

  // Check if local manager server (127.0.0.1:4000) is running
  useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (mounted) setIsServerLive(data?.status === 'ok');
      })
      .catch(() => {
        if (mounted) setIsServerLive(false);
      });
    return () => { mounted = false; };
  }, [location.pathname]);

  const navLinks = [
    { name: '總覽首頁', path: '/', icon: BookOpen },
    { name: '書籍館藏', path: '/books', icon: BookText },
    { name: '知識關聯與金句', path: '/knowledge', icon: Layers },
    { name: '全文搜尋', path: '/search', icon: Search },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-paper-100/90 dark:bg-academic-bgDark/90 backdrop-blur-md border-b border-academic-borderLight dark:border-academic-borderDark transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-academic-navy text-paper-50 flex items-center justify-center font-serif text-xl font-bold shadow-sm group-hover:bg-bronze-600 transition-colors">
            讀
          </div>
          <div>
            <span className="font-serif text-lg font-bold tracking-tight text-ink-900 dark:text-ink-50">
              Reading Notes
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-bronze-100 dark:bg-bronze-900/60 text-bronze-700 dark:text-bronze-300 font-semibold">
              2.0
            </span>
            <p className="text-[11px] text-ink-400 dark:text-academic-mutedDark leading-none hidden sm:block">
              個人數位閱讀與知識整理庫
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map(link => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-paper-200 dark:bg-ink-800 text-ink-900 dark:text-ink-50 font-semibold border-b-2 border-bronze-500'
                    : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 hover:bg-paper-200/50 dark:hover:bg-ink-800/50'
                }`}
              >
                <Icon className="w-4 h-4 text-bronze-600 dark:text-bronze-400" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Local Manager Button */}
          <Link
            to="/manager"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-bronze-300 dark:border-bronze-700 bg-bronze-50/70 dark:bg-bronze-950/40 text-bronze-800 dark:text-bronze-200 hover:bg-bronze-100 transition-colors"
            title="開啟本機工作台 (管理私人筆記、草稿與發布)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-bronze-600" />
            <span className="hidden sm:inline">工作台</span>
            {isServerLive === true && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="本機服務已連線" />
            )}
            {isServerLive === false && (
              <span className="w-2 h-2 rounded-full bg-zinc-400" title="僅靜態預覽" />
            )}
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 hover:bg-paper-200 dark:hover:bg-ink-800 transition-colors"
            aria-label="切換深淺色模式"
            title={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-700" />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100"
            aria-label="開啟選單"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-academic-borderLight dark:border-academic-borderDark bg-paper-100 dark:bg-academic-bgDark px-4 pt-2 pb-4 space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                  active
                    ? 'bg-paper-200 dark:bg-ink-800 text-bronze-600 dark:text-bronze-400 font-semibold'
                    : 'text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
          <Link
            to="/manager"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-bronze-700 dark:text-bronze-300 bg-bronze-50 dark:bg-bronze-950/50 mt-2"
          >
            <ShieldCheck className="w-5 h-5" />
            本機管理工作台
          </Link>
        </div>
      )}
    </header>
  );
};

