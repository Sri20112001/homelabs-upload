import { Icon } from './Icon';
interface OfflineBannerProps {
  online: boolean;
}

export function OfflineBanner({ online }: OfflineBannerProps) {
  if (online) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-(--color-error-container) border border-(--color-error-container) shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
        <Icon name="wifi_off" size={16} className="text-(--color-error)" />
        <span className="font-family-geist text-[12px] font-medium text-(--color-on-error-container)">
          Server unreachable — changes may not save
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-(--color-error) animate-pulse" />
      </div>
    </div>
  );
}
