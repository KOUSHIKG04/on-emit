"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted/60 text-muted-foreground border-border/60 inline-flex h-9 items-center justify-center rounded-xl border p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/40 data-active:bg-background data-active:text-foreground data-selected:bg-background data-selected:text-foreground aria-selected:bg-background aria-selected:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-selected:shadow-xs data-active:shadow-xs data-selected:shadow-xs data-[state=active]:shadow-xs [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
