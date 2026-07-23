"use client";

import { Dithering } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type OnEmitDitherProps = {
  className?: string;
  maxPixelCount?: number;
};

export function OnEmitDither({
  className,
  maxPixelCount = 1_400_000,
}: OnEmitDitherProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Dithering
      aria-hidden
      className={cn(
        "pointer-events-none size-full opacity-65 mix-blend-screen",
        className,
      )}
      width="100%"
      height="100%"
      colorBack="#0b0b0b"
      colorFront="#d99d12"
      shape="warp"
      type="8x8"
      size={3}
      speed={reduceMotion ? 0 : 0.08}
      scale={0.86}
      offsetX={0.12}
      offsetY={-0.04}
      maxPixelCount={maxPixelCount}
    />
  );
}
