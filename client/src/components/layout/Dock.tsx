import { Icon } from "../ui/Icon";

interface DockProps {
  activePage: string;
  onNavigate: (path: string) => void;
  onUpload: () => void;
  transferCount: number;
}

interface NavItem {
  id: string;
  path: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", path: "/", icon: "dashboard", label: "Dashboard" },
  { id: "files", path: "files", icon: "folder", label: "Files" },
  { id: "search", path: "search", icon: "explore", label: "Search" },
  { id: "activity", path: "activity", icon: "checklist", label: "Activity" },
  { id: "transfers", path: "transfers", icon: "sync_alt", label: "Transfers" },
];

export function Dock({
  activePage,
  onNavigate,
  onUpload,
  transferCount,
}: DockProps) {
  return (
    <aside
      aria-label="System Dock"
      className="fixed bottom-4 min-[560px]:bottom-6 left-1/2 -translate-x-1/2 z-50 select-none animate-dock-rail max-w-[calc(100vw-1rem)]"
    >
      {/* Outer Chassis */}
      <div
        className="relative flex items-center gap-1 min-[560px]:gap-2 p-1.5 min-[560px]:p-2 rounded-2xl
                   max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                   bg-(--color-canvas)/90 backdrop-blur-2xl
                   border border-white/10
                   shadow-[0_20px_45px_-10px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]
                   ring-1 ring-black/40"
      >
        {/* Top Metallic Horizon Sheen */}
        <div className="absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Navigation Track */}
        <nav className="flex items-center gap-1 min-[560px]:gap-1.5 shrink-0">
          {NAV_ITEMS.map((item) => {
            // Evaluates true whether activePage is "dashboard", "/", or empty ""
            const isActive =
              activePage === item.id ||
              activePage === item.path ||
              (item.id === "dashboard" &&
                (activePage === "/" || activePage === ""));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative shrink-0 flex items-center gap-2.5 px-2.5 min-[560px]:px-3.5 py-2 rounded-xl
                           font-(family-name:--font-family-geist) text-[12px] font-medium
                           transition-all duration-200 ease-out active:scale-95 ${
                             isActive
                               ? "text-(--color-ink) bg-(--color-surface) border border-(--color-border-bright) shadow-md shadow-black/20"
                               : "text-(--color-muted) hover:text-(--color-ink) hover:bg-white/[0.04] border border-transparent"
                           }`}
              >
                {/* Active Under-Glow Halo */}
                {isActive && (
                  <span className="absolute -inset-px rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none -z-10" />
                )}

                {/* Status Beacon LED */}
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-(--color-neon) shadow-[0_0_8px_var(--color-neon)] animate-beacon"
                      : "bg-white/20 group-hover:bg-white/40"
                  }`}
                />

                {/* Kinetic Icon */}
                <span
                  className={`transition-transform duration-300 ease-out group-hover:-translate-y-0.5 ${
                    item.id === "transfers" ? "group-hover:rotate-180" : ""
                  } ${isActive ? "text-(--color-neon)" : "text-current"}`}
                >
                  <Icon name={item.icon} size={16} />
                </span>

                <span className="hidden min-[560px]:inline">{item.label}</span>

                {/* Hardware Telemetry Badge */}
                {item.id === "transfers" && transferCount > 0 && (
                  <span className="flex items-center justify-center px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold bg-(--color-neon)/15 text-(--color-neon) border border-(--color-neon)/30 animate-badge-pop">
                    {transferCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Industrial Channel Divider */}
        <div className="flex flex-col justify-between h-6 w-px bg-white/10 mx-0.5 shrink-0">
          <span className="w-full h-1 bg-white/30" />
          <span className="w-full h-1 bg-white/30" />
        </div>

        {/* Sweeping Laser Upload Button */}
        <button
          type="button"
          onClick={onUpload}
          className="relative group overflow-hidden shrink-0 flex items-center gap-2 px-3 min-[560px]:px-4 py-2 rounded-xl
                     font-family-geist text-[12px] font-semibold text-white
                     bg-linear-to-r from-(--color-accent) to-(--color-neon)
                     shadow-[0_0_18px_-3px_var(--color-accent)]
                     hover:shadow-[0_0_24px_var(--color-neon)]
                     hover:brightness-110 active:scale-95 transition-all duration-200"
        >
          {/* Ambient Laser Beam */}
          <span className="absolute inset-0 w-1/2 bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-laser" />

          {/* Top Edge Specular Highlight */}
          <span className="absolute inset-x-2 top-0 h-px bg-white/60 pointer-events-none" />

          <Icon
            name="add"
            size={16}
            className="transition-transform duration-300 group-hover:rotate-90 text-current"
          />
          <span className="hidden min-[560px]:inline">Upload</span>
        </button>
      </div>
    </aside>
  );
}
