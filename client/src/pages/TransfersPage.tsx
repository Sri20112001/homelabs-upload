import type { TransferItem } from '../types';
import { TransferCenter } from '../components/modals/UploadModal';
import { formatBytes } from '../utils';
import { Icon } from '../components/ui/Icon';

interface TransfersPageProps {
  transfers: TransferItem[];
  onCancel: (id: string) => void;
  onClearDone: () => void;
  activeCount: number;
}

export function TransfersPage({ transfers, onCancel, onClearDone, activeCount }: TransfersPageProps) {
  const totalSpeed = transfers
    .filter((t) => t.status === 'uploading')
    .reduce((sum, t) => sum + t.speed, 0);

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="mb-6">
        <h1 className="font-family-geist text-[22px] font-semibold text-(--color-on-surface) mb-1">
          Transfers
        </h1>
        <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary)">
          Active uploads and completed transfers.
        </p>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-(--color-primary-fixed)/40 border border-(--color-primary-fixed) mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-(--color-primary) animate-pulse" />
          <span className="font-family-geist text-[12px] text-(--color-on-surface) font-medium">
            {activeCount} active upload{activeCount !== 1 ? 's' : ''}
          </span>
          {totalSpeed > 0 && (
            <>
              <span className="text-(--color-outline-variant)">•</span>
              <span className="font-family-geist text-[12px] text-(--color-primary) font-medium">
                {formatBytes(totalSpeed)}/s
              </span>
            </>
          )}
        </div>
      )}

      {transfers.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Icon name="sync_alt" size={48} className="text-(--color-outline) mb-4" />
          <h3 className="font-family-geist text-[18px] font-medium text-(--color-on-surface) mb-2">
            No transfers
          </h3>
          <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary)">
            Upload files to see them here.
          </p>
        </div>
      ) : (
        <div className="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-surface-container-high) overflow-hidden shadow-sm">
          <TransferCenter
            transfers={transfers}
            onCancel={onCancel}
            onClearDone={onClearDone}
            activeCount={activeCount}
          />
        </div>
      )}
    </div>
  );
}
