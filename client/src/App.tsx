import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { TopBar } from './components/layout/TopBar';
import { Dock } from './components/layout/Dock';
import { DashboardPage } from './pages/DashboardPage';
import { FilesPage } from './pages/FilesPage';
import { SearchPage } from './pages/SearchPage';
import { TransfersPage } from './pages/TransfersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ActivityPage } from './pages/ActivityPage';
import { UsersPage } from './pages/UsersPage';
import { UploadModal, TransferCenter } from './components/modals/UploadModal';
import { CommandPalette } from './components/modals/CommandPalette';
import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { OnboardingTour, useOnboardingTour } from './components/ui/OnboardingTour';
import { ToastProvider, useToast } from './components/ui/Toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useTransfers } from './hooks/useTransfers';
import { useOnlineStatus } from './hooks/useOnlineStatus';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, setupNeeded } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  // Empty database → first-run registration; otherwise login.
  if (!user) return <Navigate to={setupNeeded ? '/register' : '/login'} replace />;
  return <>{children}</>;
}

const AppInner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // Active page derives from the route; folder path lives in ?path= (deep-linkable).
  const page = location.pathname.split('/')[1] || 'files';
  const filesPath = params.get('path') ?? '/';
  const setFilesPath = useCallback((p: string, opts?: { replace?: boolean }) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p === '/') next.delete('path');
      else next.set('path', p);
      return next;
    }, opts);
  }, [setParams]);

  const [showUpload, setShowUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();
  const online = useOnlineStatus();
  const { show: showTour, dismiss: dismissTour } = useOnboardingTour();
  const { user } = useAuth();

  const { transfers, enqueue, cancel, clearDone, activeCount } = useTransfers();

  // Reset scroll when switching routes (folder-to-folder keeps position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === '?' && !isInput) {
        setShowShortcuts((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const goPage = useCallback((p: string) => {
    // Preserve ?path= so the Upload modal keeps its destination off the files route.
    navigate({ pathname: `/${p}`, search: location.search });
  }, [navigate, location.search]);

  const handleNavigate = useCallback((path: string) => {
    navigate({ pathname: '/files', search: path === '/' ? '' : `?path=${encodeURIComponent(path)}` });
  }, [navigate]);

  const handleEnqueue = useCallback((file: File, destPath: string) => {
    enqueue(file, destPath);
    toast(`Uploading ${file.name}`, 'info');
  }, [enqueue, toast]);

  const handleEnqueueFiles = useCallback((files: FileList, destPath: string) => {
    for (const file of Array.from(files)) {
      enqueue(file, destPath);
    }
    toast(`Uploading ${files.length} file${files.length !== 1 ? 's' : ''}`, 'info');
  }, [enqueue, toast]);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-canvas text-brand-highlight pb-28">
      {!isAuthPage && user && <TopBar onSearchOpen={() => setShowSearch(true)} onSettingsOpen={() => goPage('settings')} />}
      <OfflineBanner online={online} />

      <main className="w-full pt-16 px-(--spacing-margin) md:px-(--spacing-margin-desktop)">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={<RequireAuth><DashboardPage onUpload={() => setShowUpload(true)} /></RequireAuth>}
          />
          <Route
            path="/files"
            element={
              <RequireAuth>
                <FilesPage
                  path={filesPath}
                  onPathChange={(p) => setFilesPath(p)}
                  onUpload={() => setShowUpload(true)}
                  onEnqueueFiles={handleEnqueueFiles}
                />
              </RequireAuth>
            }
          />
          <Route path="/search" element={<RequireAuth><SearchPage onNavigate={handleNavigate} /></RequireAuth>} />
          <Route
            path="/transfers"
            element={
              <RequireAuth>
                <TransfersPage
                  transfers={transfers}
                  onCancel={cancel}
                  onClearDone={clearDone}
                  activeCount={activeCount}
                />
              </RequireAuth>
            }
          />
          <Route path="/activity" element={<RequireAuth><ActivityPage /></RequireAuth>} />
          <Route path="/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAuthPage && user && (
        <Dock
          activePage={page}
          onNavigate={goPage}
          onUpload={() => setShowUpload(true)}
          transferCount={activeCount}
        />
      )}

      {!isAuthPage && page !== 'transfers' && transfers.length > 0 && (
        <div className="fixed bottom-24 right-4 md:right-8 z-40 w-[calc(100vw-2rem)] max-w-120">
          <TransferCenter
            transfers={transfers}
            onCancel={cancel}
            onClearDone={clearDone}
            activeCount={activeCount}
          />
        </div>
      )}

      {showUpload && user && (
        <UploadModal
          destPath={filesPath}
          onClose={() => setShowUpload(false)}
          onEnqueue={handleEnqueue}
        />
      )}
      {showSearch && user && (
        <CommandPalette
          onClose={() => setShowSearch(false)}
          onNavigate={handleNavigate}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showTour && user && <OnboardingTour onDismiss={dismissTour} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ToastProvider>
  );
}
