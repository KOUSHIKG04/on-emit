"use client";

import { arc, pie, type PieArcDatum } from "d3-shape";
import { useId, useState } from "react";

import type { ChartConfig } from "./chart-context";
import { cn } from "./lib";
import { rgb, seedOfColor } from "./palette";
import { useChartDimensions } from "./use-chart-dimensions";

type PieDatum = {
  name: string;
  value: number;
};

export function PieChart({
  data,
  config,
  className,
  centerLabel,
  centerValue,
  ariaLabel,
}: {
  data: PieDatum[];
  config: ChartConfig;
  className?: string;
  centerLabel: string;
  centerValue: string;
  ariaLabel: string;
}) {
  const { ref, size } = useChartDimensions<HTMLDivElement>();
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const patternPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0);
  const chartData = total > 0 ? data : [{ name: "empty", value: 1 }];
  const diameter = Math.max(0, Math.min(size.width, size.height));
  const radius = diameter / 2;
  const outerRadius = Math.max(radius - 4, 0);
  const innerRadius = outerRadius * 0.6;

  const slices = pie<PieDatum>()
    .sort(null)
    .value((datum) => Math.max(0, datum.value))(chartData);
  const path = arc<PieArcDatum<PieDatum>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .padAngle(total > 0 ? 0.025 : 0)
    .cornerRadius(total > 0 ? 4 : 0);
  const hovered = data.find((datum) => datum.name === hoveredName);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={cn("relative isolate", className)}
      onPointerLeave={() => setHoveredName(null)}
    >
      {diameter > 0 ? (
        <svg
          aria-hidden="true"
          viewBox={`${-radius} ${-radius} ${diameter} ${diameter}`}
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            {chartData.map((datum) => {
              const color =
                datum.name === "empty"
                  ? "grey"
                  : (config[datum.name]?.color ?? "grey");
              const seed = seedOfColor(color);
              const patternId = `${patternPrefix}-${datum.name}`;

              return (
                <pattern
                  key={patternId}
                  id={patternId}
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="5" height="5" fill={rgb(seed.fill, 1, 0.24)} />
                  <rect width="2" height="2" fill={rgb(seed.fill, 1, 0.92)} />
                  <rect
                    x="3"
                    y="3"
                    width="1"
                    height="1"
                    fill={rgb(seed.fill, 1, 0.72)}
                  />
                </pattern>
              );
            })}
          </defs>

          {slices.map((slice) => {
            const patternId = `${patternPrefix}-${slice.data.name}`;
            const active = hoveredName === slice.data.name;

            return (
              <path
                key={slice.data.name}
                d={path(slice) ?? undefined}
                fill={`url(#${patternId})`}
                stroke="var(--card)"
                strokeWidth="2"
                className="cursor-default transition-opacity duration-150"
                opacity={hoveredName && !active ? 0.42 : 1}
                onPointerEnter={() =>
                  slice.data.name !== "empty" && setHoveredName(slice.data.name)
                }
              />
            );
          })}
        </svg>
      ) : null}

      <div className="pointer-events-none absolute inset-[24%] flex flex-col items-center justify-center rounded-full text-center">
        <span className="max-w-24 truncate text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {hovered ? hovered.value.toLocaleString() : centerValue}
        </span>
        <span className="text-muted-foreground mt-1 max-w-24 truncate text-xs">
          {hovered
            ? (config[hovered.name]?.label ?? hovered.name)
            : centerLabel}
        </span>
      </div>
    </div>
  );
}
