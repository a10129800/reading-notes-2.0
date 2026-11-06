import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Public Environment Manager Route Stub (Active on GitHub Pages)
 *
 * In pure reading mode, all manager routes are strictly blocked.
 * Any direct navigation to /manager/* immediately redirects to public home (/).
 *
 * This file contains ZERO references to manager pages or writing APIs,
 * allowing Rollup to completely tree-shake and exclude administrative code.
 */
export const ManagerRoutes: React.FC = () => {
  return <Navigate to="/" replace />;
};

export default ManagerRoutes;

