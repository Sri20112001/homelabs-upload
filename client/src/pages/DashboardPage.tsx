import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesApi } from '../api/files';
import type { ServerMetrics } from '../api/metrics';
import { useCountUp } from '../hooks/useCountUp';
import { formatBytes } from '../utils';
import { Icon } from '../components/ui/Icon';
import type { FolderStat, StorageInfo } from '../types';

function StatCard({ icon, label, value, sub }: {
  icon: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-sm">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={16} className="text-(--color-secondary)" />
        <span className="font-family-geist text-[11px] text-(--color-secondary)">{label}</span>
      </div>
      <span className="font-family-geist text-[20px] font-semibold text-(--color-on-surface)">
        {value}
      </span>
      {sub && (
        <span className="font-family-geist text-[11px] text-(--color-secondary)">{sub}</span>
      )}
    </div>
  );
}

export function DashboardPage({ onUpload }: { onUpload: () => void }) {
  const navigate = useNavigate();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [folders, setFolders] = useState<FolderStat[] | null>(null);

  // Whole dashboard in ONE request (GET /api/dashboard): storage ring,
  // folders and metrics all come from it. (TopBar keeps its own shared
  // storage poller for the pill — this page adds zero extra calls.)
  useEffect(() => {
    let cancelled = false;
    filesApi.dashboard()
      .then((res) => {
        if (cancelled) return;
        setStorage(res.storage);
        setMetrics(res.metrics);
        setFolders(res.folders);
      })
      .catch(() => {
        if (cancelled) return;
        setStorage(null);
        setMetrics(null);
        setFolders([]);
      });
    return () => { cancelled = true; };
  }, []);

  const usedPct = storage && storage.total_bytes > 0
    ? Math.round((storage.used_bytes / storage.total_bytes) * 100)
    : 0;
  const errorRate = metrics && metrics.requests_total > 0
    ? `${((metrics.request_errors / metrics.requests_total) * 100).toFixed(1)}%`
    : '0%';
  const maxFolder = folders && folders.length > 0 ? folders[0].bytes : 1;

  // Count-up: one eased 0→1 progress started when data arrives; every
  // number below is its final value × progress (0 on first paint).
  const progress = useCountUp(metrics !== null && folders !== null);
  const animUsedPct = Math.round(usedPct * progress);
  const animUsedBytes = (storage?.used_bytes ?? 0) * progress;
  const animRequests = Math.round((metrics?.requests_total ?? 0) * progress);
  const animErrorRate = `${(parseFloat(errorRate) * progress).toFixed(1)}%`;
  const animLatency = ((metrics?.latency_avg_ms ?? 0) * progress).toFixed(1);
  const animUploads = Math.round((metrics?.uploads_total ?? 0) * progress);
  const animUploadBytes = (metrics?.upload_bytes_total ?? 0) * progress;

  return (
    <div className="flex flex-col w-full pb-16 max-w-8xl mx-auto">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-family-geist text-[22px] font-semibold text-(--color-on-surface) mb-1">
            Dashboard
          </h1>
          <p className="font-family-inter text-[13px] text-(--color-secondary)">
            Live insights from your node.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/files')}
            className="btn-secondary flex items-center gap-1.5 px-4 py-2 rounded-lg font-family-geist text-[12px] font-medium transition-colors"
          >
            <Icon name="folder" size={16} />
            Browse files
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="btn-primary flex items-center gap-1.5 bg-linear-to-r from-brand-primary to-brand-neon text-brand-highlight px-4 py-2 rounded-lg font-family-geist text-[12px] font-medium transition-all shadow-blue-glow"
          >
            <Icon name="add" size={16} />
            Upload
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-sm col-span-2 lg:col-span-1">
          <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0 -rotate-90">
            <circle cx="40" cy="40" r="30" fill="none" stroke="var(--color-surface-container-high)" strokeWidth="9" />
            <circle
              cx="40" cy="40" r="30" fill="none"
              stroke="var(--color-primary)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${(animUsedPct / 100) * 188.5} 188.5`}
            />
          </svg>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-family-geist text-[11px] text-(--color-secondary)">Storage used</span>
            <span className="font-family-geist text-[20px] font-semibold text-(--color-on-surface)">
              {storage ? `${animUsedPct}%` : '—'}
            </span>
            <span className="font-family-geist text-[11px] text-(--color-secondary) truncate">
              {storage ? `${formatBytes(animUsedBytes)} of ${formatBytes(storage.total_bytes)}` : 'Backend unreachable'}
            </span>
          </div>
        </div>
        <StatCard icon="http" label="Total Requests" value={metrics ? animRequests.toLocaleString() : '—'} />
        <StatCard icon="error" label="Error Rate" value={metrics ? animErrorRate : '—'} sub={metrics ? `${Math.round(metrics.request_errors * progress).toLocaleString()} errors` : undefined} />
        <StatCard icon="speed" label="Avg Latency" value={metrics ? `${animLatency} ms` : '—'} />
        <StatCard icon="upload" label="Uploads" value={metrics ? animUploads.toLocaleString() : '—'} />
        <StatCard icon="storage" label="Upload Data" value={metrics ? formatBytes(animUploadBytes) : '—'} />
      </div>

      {/* Storage by folder */}
      <section className="flex flex-col gap-2 p-5 rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-family-geist text-[13px] font-semibold text-(--color-secondary) uppercase tracking-wider">
            Storage by folder
          </h2>
          <button
            type="button"
            onClick={() => navigate('/transfers')}
            className="flex items-center gap-1.5 text-(--color-secondary) hover:text-(--color-primary) font-family-geist text-[11px] transition-colors"
          >
            <Icon name="sync_alt" size={14} />
            Transfers
          </button>
        </div>
        {folders === null && (
          <div className="flex flex-col gap-2 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-(--color-surface-container-low) animate-pulse" />
            ))}
          </div>
        )}
        {folders !== null && folders.length === 0 && (
          <p className="font-family-inter text-[12px] text-(--color-secondary) py-3">
            No folders yet — upload something to see the breakdown.
          </p>
        )}
        {folders !== null && folders.length > 0 && (
          <div className="flex flex-col">
            {folders.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => navigate(`/files?path=${encodeURIComponent(f.path)}`)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-(--color-surface-container-low) transition-colors text-left"
              >
                <Icon name="folder" size={18} className="text-(--color-primary) shrink-0" />
                <span className="font-family-geist text-[13px] text-(--color-on-surface) font-medium w-40 truncate shrink-0">
                  {f.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-(--color-surface-container) overflow-hidden">
                  <div
                    className="h-full rounded-full bg-(--color-primary) transition-all"
                    style={{ width: `${maxFolder > 0 ? Math.round(((f.bytes * progress) / maxFolder) * 100) : 0}%` }}
                  />
                </div>
                <span className="font-family-geist text-[11px] text-(--color-secondary) w-28 text-right shrink-0">
                  {formatBytes(f.bytes * progress)} · {Math.round(f.files * progress)} files
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
