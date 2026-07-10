export function Seal({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/binan-seal.png"
      alt="Biñan City Seal"
      width={size}
      height={size}
      className="flex-shrink-0 rounded-full object-cover"
      style={{ boxShadow: "0 0 0 1.5px #D4A800" }}
    />
  );
}
