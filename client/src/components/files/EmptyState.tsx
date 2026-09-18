import { Icon } from '../ui/Icon';
interface EmptyStateProps {
  onUpload: () => void;
  onNewFolder: () => void;
}

export function EmptyState({ onUpload, onNewFolder }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 bg-(--color-primary-fixed) rounded-full opacity-60" />
        <div className="relative w-16 h-16 bg-(--color-surface-container-lowest) rounded-full shadow-md flex items-center justify-center text-(--color-primary)">
          <Icon name="folder_open" size={38} />
        </div>
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
