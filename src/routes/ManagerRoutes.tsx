import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ManagerDashboardPage } from '../pages/manager/ManagerDashboardPage';
import { BookEditorPage } from '../pages/manager/BookEditorPage';
import { ChapterEditorPage } from '../pages/manager/ChapterEditorPage';
import { PublishPage } from '../pages/manager/PublishPage';
import { BackupRestorePage } from '../pages/manager/BackupRestorePage';

/**
 * Local Management Studio Routes (Active on localhost:3000)
 *
 * Full access to book creation, editing, cover management, backups, and publishing.
 */
export const ManagerRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ManagerDashboardPage />} />
      <Route path="books/:bookId" element={<BookEditorPage />} />
      <Route path="books/:bookId/chapters/:chapterId" element={<ChapterEditorPage />} />
      <Route path="publish" element={<PublishPage />} />
      <Route path="backups" element={<BackupRestorePage />} />
      <Route path="*" element={<Navigate to="/manager" replace />} />
    </Routes>
  );
};

export default ManagerRoutes;

