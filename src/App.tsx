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

// Manager Routes (Swapped with ManagerRoutes.public.tsx in public production builds)
import { ManagerRoutes } from '@/routes/ManagerRoutes';

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

            {/* Manager Studio Routes (Active in local mode; safely blocked & redirected in public mode) */}
            <Route path="/manager/*" element={<ManagerRoutes />} />

            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
