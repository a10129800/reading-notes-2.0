import React from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { BookListPage } from './pages/BookListPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { ChapterReaderPage } from './pages/ChapterReaderPage';
import { SearchPage } from './pages/SearchPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';

// Manager Pages
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage';
import { BookEditorPage } from './pages/manager/BookEditorPage';
import { ChapterEditorPage } from './pages/manager/ChapterEditorPage';
import { PublishPage } from './pages/manager/PublishPage';
import { BackupRestorePage } from './pages/manager/BackupRestorePage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      {/* HashRouter guarantees GitHub Pages compatibility without 404 spa routing rewrites */}
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public Reading Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/books" element={<BookListPage />} />
            <Route path="/books/:bookId" element={<BookDetailPage />} />
            <Route path="/books/:bookId/:chapterId" element={<ChapterReaderPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/knowledge" element={<KnowledgeGraphPage />} />

            {/* Local Manager Studio Routes */}
            <Route path="/manager" element={<ManagerDashboardPage />} />
            <Route path="/manager/books/:bookId" element={<BookEditorPage />} />
            <Route path="/manager/books/:bookId/chapters/:chapterId" element={<ChapterEditorPage />} />
            <Route path="/manager/publish" element={<PublishPage />} />
            <Route path="/manager/backups" element={<BackupRestorePage />} />

            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
