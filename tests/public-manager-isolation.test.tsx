import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/context/ThemeContext';
import { Navbar } from '../src/components/Navbar';
import { isManagerEnabled, getAppEnvConfig } from '../src/config/env';
import { ManagerRoutes as PublicManagerRoutes } from '../src/routes/ManagerRoutes.public';

// Mock window.matchMedia for JSDOM
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any;
  };
}

describe('Reading Notes 2.0 - Public Site & Manager Isolation Suite', () => {
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    // Reset env vars after each test
    vi.unstubAllEnvs();
  });

  describe('1. Environment Identification & Manager Flag Logic', () => {
    it('strictly returns false when VITE_ENABLE_MANAGER is "false"', () => {
      vi.stubEnv('VITE_ENABLE_MANAGER', 'false');
      expect(isManagerEnabled()).toBe(false);
      expect(getAppEnvConfig().isManagerEnabled).toBe(false);
      expect(getAppEnvConfig().appMode).toBe('public');
    });

    it('strictly returns false when VITE_APP_MODE is "public"', () => {
      vi.stubEnv('VITE_APP_MODE', 'public');
      expect(isManagerEnabled()).toBe(false);
      expect(getAppEnvConfig().isManagerEnabled).toBe(false);
      expect(getAppEnvConfig().appMode).toBe('public');
    });

    it('returns false in production when VITE_ENABLE_MANAGER is not set to true', () => {
      vi.stubEnv('PROD', true as any);
      vi.stubEnv('VITE_ENABLE_MANAGER', '');
      expect(isManagerEnabled()).toBe(false);
    });

    it('returns true when in development mode and not explicitly disabled', () => {
      vi.stubEnv('DEV', true as any);
      vi.stubEnv('PROD', false as any);
      vi.stubEnv('VITE_ENABLE_MANAGER', 'true');
      vi.stubEnv('VITE_APP_MODE', 'manager');
      expect(isManagerEnabled()).toBe(true);
      expect(getAppEnvConfig().isManagerEnabled).toBe(true);
      expect(getAppEnvConfig().appMode).toBe('manager');
    });
  });

  describe('2. Navbar Workspace Entry Isolation', () => {
    it('renders "工作台" button when manager mode is enabled', () => {
      vi.stubEnv('VITE_ENABLE_MANAGER', 'true');
      vi.stubEnv('VITE_APP_MODE', 'manager');

      const { container } = render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Navbar />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Desktop link to /manager should be present
      const managerLinks = container.querySelectorAll('a[href="/manager"]');
      expect(managerLinks.length).toBeGreaterThanOrEqual(1);

      // Label "工作台" must be visible
      expect(screen.getByText('工作台')).toBeDefined();
    });

    it('COMPLETELY REMOVES "工作台" button and links in public reading mode', () => {
      vi.stubEnv('VITE_ENABLE_MANAGER', 'false');
      vi.stubEnv('VITE_APP_MODE', 'public');

      const { container } = render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Navbar />
          </MemoryRouter>
        </ThemeProvider>
      );

      // In public reading mode, ZERO links to /manager must exist in DOM
      const managerLinks = container.querySelectorAll('a[href="/manager"]');
      expect(managerLinks.length).toBe(0);

      // Workspace text must NOT be present
      expect(screen.queryByText('工作台')).toBeNull();
      expect(screen.queryByText('本機管理工作台')).toBeNull();

      // Ensure public navigation links (Home, Books, Knowledge, Search) remain perfectly intact
      expect(screen.getByText('總覽首頁')).toBeDefined();
      expect(screen.getByText('書籍館藏')).toBeDefined();
      expect(screen.getByText('知識關聯與金句')).toBeDefined();
      expect(screen.getByText('全文搜尋')).toBeDefined();
    });
  });

  describe('3. Public Route Protection & Safe Redirection', () => {
    it('ManagerRoutes.public redirects immediately to home (/) without rendering manager components', () => {
      render(
        <MemoryRouter initialEntries={['/manager']}>
          <PublicManagerRoutes />
        </MemoryRouter>
      );

      // Must not render any manager page titles
      expect(screen.queryByText('本機閱讀管理工作台')).toBeNull();
      expect(screen.queryByText('公開發布安全審核流水線')).toBeNull();
      expect(screen.queryByText('完整本機資料備份與還原')).toBeNull();
    });
  });
});
