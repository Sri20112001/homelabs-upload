import { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/layout/TopBar';
import { Dock } from './components/layout/Dock';
import { FilesPage } from './pages/FilesPage';
import { SearchPage } from './pages/SearchPage';
import { TransfersPage } from './pages/TransfersPage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadModal, TransferCenter } from './components/modals/UploadModal';
import { CommandPalette } from './components/modals/CommandPalette';
import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { OnboardingTour, useOnboardingTour } from './components/ui/OnboardingTour';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useTransfers } from './hooks/useTransfers';
import { useOnlineStatus } from './hooks/useOnlineStatus';

type Page = 'files' | 'search' | 'transfers' | 'settings';

function parseUrlState(): { page: Page; path: string } {
  const params = new URLSearchParams(window.location.search);
  const page = (params.get('page') ?? 'files') as Page;
  const path = params.get('path') ?? '/';
  return { page, path };
}

function pushUrlState(page: Page, path: string) {
  const params = new URLSearchParams();
  params.set('page', page);
  if (path !== '/') params.set('path', path);
  const url = params.toString() ? `?${params}` : window.location.pathname;
  window.history.pushState({ page, path }, '', url);
}

const AppInner = () => {
  const initial = parseUrlState();
  const [page, setPage] = useState<Page>(initial.page);
  const [filesPath, setFilesPath] = useState(initial.path);
  const [showUpload, setShowUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();
  const online = useOnlineStatus();
  const { show: showTour, dismiss: dismissTour } = useOnboardingTour();

  const { transfers, enqueue, cancel, clearDone, activeCount } = useTransfers();

  useEffect(() => { pushUrlState(page, filesPath); }, [page, filesPath]);

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (e.state) {
        setPage(e.state.page ?? 'files');
        setFilesPath(e.state.path ?? '/');
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

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

  const handleNavigate = useCallback((path: string) => {
    setFilesPath(path);
    setPage('files');
  }, []);

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

  return (
    <div className="min-h-screen bg-canvas text-brand-highlight pb-28">
      <TopBar onSearchOpen={() => setShowSearch(true)} onSettingsOpen={() => setPage('settings')} />
      <OfflineBanner online={online} />

      <main className="w-full pt-16 px-(--spacing-margin) md:px-(--spacing-margin-desktop)">
        {page === 'files' && (
          <FilesPage
            path={filesPath}
            onPathChange={setFilesPath}
            onUpload={() => setShowUpload(true)}
            onEnqueueFiles={handleEnqueueFiles}
          />
        )}
        {page === 'search' && <SearchPage onNavigate={handleNavigate} />}
        {page === 'transfers' && (
          <TransfersPage
            transfers={transfers}
            onCancel={cancel}
            onClearDone={clearDone}
            activeCount={activeCount}
          />
        )}
        {page === 'settings' && <SettingsPage />}
      </main>

      <Dock
        activePage={page}
        onNavigate={(p) => setPage(p as Page)}
        onUpload={() => setShowUpload(true)}
        transferCount={activeCount}
      />

      {page !== 'transfers' && transfers.length > 0 && (
        <div className="fixed bottom-24 right-4 md:right-8 z-40 w-[calc(100vw-2rem)] max-w-[480px]">
          <TransferCenter
            transfers={transfers}
            onCancel={cancel}
            onClearDone={clearDone}
            activeCount={activeCount}
          />
        </div>
      )}

      {showUpload && (
        <UploadModal
          destPath={filesPath}
          onClose={() => setShowUpload(false)}
          onEnqueue={handleEnqueue}
        />
      )}
      {showSearch && (
        <CommandPalette
          onClose={() => setShowSearch(false)}
          onNavigate={handleNavigate}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showTour && <OnboardingTour onDismiss={dismissTour} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
