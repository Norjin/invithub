import type { CardStyle } from "@/server/types";
import { CARD_THEMES } from "@/lib/card-styles";

export function CardPreview({
  style,
  title,
  when,
  where,
  theme,
  message,
  qrSvg,
  small = false,
}: {
  style: CardStyle;
  title: string;
  when: string;
  where: string;
  theme: string;
  message?: string;
  qrSvg?: string;
  small?: boolean;
}) {
  const t = CARD_THEMES[style];
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-[16px] text-center font-serif ${small ? "aspect-[1.6] p-2" : "aspect-[1.6] p-6 md:p-8"}`}
      style={{ background: t.bg, color: t.ink }}
    >
      <div aria-hidden className={`pointer-events-none absolute rounded-[10px] border ${small ? "inset-1" : "inset-3"}`} style={{ borderColor: t.border }} />
      {!small && message && <p className="mb-2 text-[15px] italic opacity-85">{message}</p>}
      <p className={`font-semibold ${small ? "text-[11px] leading-tight" : "text-[30px] leading-[1.1] md:text-[38px]"}`} style={{ color: t.accent }}>
        {title}
      </p>
      {!small && (
        <>
          <p className="mt-2 text-[15px]">{when}</p>
          {where && <p className="text-[15px] opacity-90">{where}</p>}
          {qrSvg && (
            <div
              aria-hidden
              className="mt-3 size-16 overflow-hidden rounded-md bg-white p-1 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          {theme && <p className="mt-2 text-[13px] opacity-85">{theme}</p>}
        </>
      )}
    </div>
  );
}
