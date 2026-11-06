/**
 * Environment Identification & Manager Isolation Configuration
 *
 * Enforces strict boundary between:
 * - Localhost Management Studio (http://localhost:3000)
 * - GitHub Pages Public Reading Site (https://a10129800.github.io/reading-notes-2.0/)
 */

export interface AppEnvConfig {
  isManagerEnabled: boolean;
  appMode: 'manager' | 'public';
  isProduction: boolean;
}

/**
 * Returns whether the Management Studio features are enabled.
 *
 * Rules:
 * 1. If VITE_ENABLE_MANAGER === 'false' or VITE_APP_MODE === 'public', strictly return false.
 * 2. In production builds (import.meta.env.PROD), strictly return false unless
 *    explicitly built with VITE_ENABLE_MANAGER === 'true'.
 * 3. In local development (import.meta.env.DEV), return true by default.
 */
export function isManagerEnabled(): boolean {
  // Explicit false flags always take highest precedence
  if (import.meta.env.VITE_ENABLE_MANAGER === 'false') {
    return false;
  }
  if (import.meta.env.VITE_APP_MODE === 'public') {
    return false;
  }

  // In production builds (GitHub Pages release), manager is strictly disabled
  if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_MANAGER !== 'true') {
    return false;
  }

  // In development mode (localhost), manager is enabled by default
  return true;
}

/**
 * Returns current application environment configuration snapshot.
 */
export function getAppEnvConfig(): AppEnvConfig {
  const managerEnabled = isManagerEnabled();
  return {
    isManagerEnabled: managerEnabled,
    appMode: managerEnabled ? 'manager' : 'public',
    isProduction: Boolean(import.meta.env.PROD),
  };
}

