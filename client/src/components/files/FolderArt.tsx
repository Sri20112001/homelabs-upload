/**
 * Animated folder illustration (pure Tailwind, no styled-components).
 * Hover (or keyboard focus) lifts the folder, fans the papers and tips the
 * front flap open. Decorative artwork — keep palette fixed, not themed.
 */
export function FolderArt({ onOpen, label }: { onOpen?: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className="group relative block w-40 cursor-pointer outline-none [perspective:800px]"
    >
      <span className="relative block w-full aspect-[5/4] transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
        {/* Back shell + tab */}
        <span className="absolute inset-x-0 bottom-0 top-[14%] rounded-b-xl rounded-tr-xl bg-gradient-to-br from-[#f7c14b] to-[#e9a52f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]" />
        <span className="absolute top-[1%] left-0 h-[15%] w-[46%] bg-gradient-to-br from-[#f7c14b] to-[#e9a52f] rounded-t-lg [clip-path:polygon(0_0,82%_0,100%_100%,0_100%)]" />
        {/* Papers */}
        <span className="absolute inset-x-[8%] top-[6%] bottom-[12%] block">
          <span className="absolute left-1/2 bottom-0 h-[70%] w-[78%] -translate-x-1/2 rounded-md bg-[#f6f4ee] shadow-md transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:-translate-x-[76%] group-hover:-translate-y-[18%] group-hover:-rotate-7" />
          <span className="absolute left-1/2 bottom-0 h-[74%] w-[82%] -translate-x-1/2 rounded-md bg-[#fbfaf6] shadow-md transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-[-28%] group-hover:-translate-y-[22%] group-hover:rotate-6" />
          <span className="absolute left-1/2 bottom-0 h-[78%] w-[86%] -translate-x-1/2 rounded-md bg-[#fdfdfb] shadow-[0_0.25em_0.875em_rgba(60,40,10,0.12)] transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:-translate-y-[26%]">
            <span className="absolute left-[14%] right-[24%] top-[22%] h-[6%] rounded bg-[#f1f0ea]" />
            <span className="absolute left-[14%] right-[40%] top-[40%] h-[6%] rounded bg-[#f1f0ea]" />
          </span>
        </span>
        {/* Front flap */}
        <span className="absolute inset-x-0 bottom-0 top-[38%] origin-bottom rounded-xl bg-gradient-to-[150deg] from-[#ffd970] to-[#fbc548] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_-1px_0_#d68f23,0_0.875em_1.375em_-0.75em_rgba(120,80,10,0.35)] transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:[transform:rotateX(-32deg)] group-focus-visible:[transform:rotateX(-32deg)] group-focus-visible:ring-2 group-focus-visible:ring-[#1d6cf5] group-focus-visible:ring-offset-4" />
      </span>
    </button>
  );
}
