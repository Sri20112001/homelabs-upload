import { Icon } from '../ui/Icon';
import { FolderArt } from './FolderArt';
interface EmptyStateProps {
  onUpload: () => void;
  onNewFolder: () => void;
}

export function EmptyState({ onUpload, onNewFolder }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6">
        <FolderArt onOpen={onUpload} label="Upload files to this folder" />
      </div>
      <h2 className="font-family-geist text-[22px] font-semibold text-(--color-on-surface) mb-2">
        This folder is empty
      </h2>
      <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary) mb-8 max-w-sm">
        Drop files here or use the buttons below to add content to this folder.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-2 bg-(--color-primary) text-(--color-on-primary) px-5 py-2.5 rounded-lg font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-all shadow-sm"
        >
          <Icon name="upload_file" size={18} />
          Upload Files
        </button>
        <button
          type="button"
          onClick={onNewFolder}
          className="flex items-center gap-2 bg-(--color-surface-container-lowest) text-(--color-on-surface) px-5 py-2.5 rounded-lg font-family-geist text-[12px] font-medium border border-(--color-surface-container-high) hover:bg-(--color-surface-container-low) transition-all"
        >
          <Icon name="create_new_folder" size={18} className="text-(--color-primary)" />
          New Folder
        </button>
      </div>
    </div>
  );
}
