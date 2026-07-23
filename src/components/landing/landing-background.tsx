import { OnEmitDither } from "@/components/effects/on-emit-dither";

export function LandingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <OnEmitDither className="absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,11,0.08),rgba(11,11,11,0.7))]" />
      <div className="absolute inset-y-0 left-1/2 w-full max-w-6xl -translate-x-1/2 bg-[#0b0b0b]" />
    </div>
  );
}
