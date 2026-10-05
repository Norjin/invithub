import QRCode from "qrcode";

/** Always dark-on-white so phone cameras can read it in dark mode too. */
export async function QR({ value, size = 180, label }: { value: string; size?: number; label: string }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return (
    <div
      role="img"
      aria-label={label}
      className="overflow-hidden rounded-xl bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
