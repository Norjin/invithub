import { initials } from "@/lib/format";

const TINTS = ["#1e6b43", "#0a5fc9", "#a8562a", "#6b3fa0", "#a87a22", "#2b6f87", "#b23a5b"];

function tint(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: tint(name), fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
