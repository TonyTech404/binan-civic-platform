export function Seal({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/tbb-logo.jpg"
      alt="Titus Bosseng Bautista"
      height={size}
      className="flex-shrink-0 object-contain"
      style={{ height: size, width: "auto" }}
    />
  );
}
