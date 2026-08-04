"use client";

import { motion } from "motion/react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Command,
  Ghost2,
  Inbox,
  Search,
  Sparkles,
  UserRound,
  Zap,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const metrics = [
  { value: "18", label: "Unread" },
  { value: "03", label: "Priority" },
  { value: "04", label: "Meetings" },
] as const;

const messages = [
  {
    subject: "Proposal ready",
    sender: "Nora Chen",
    time: "2m",
    priority: true,
  },
  {
    subject: "Launch review",
    sender: "Design team",
    time: "18m",
    priority: false,
  },
] as const;

export function ProductCanvas({
  reduceMotion,
  userName = "",
}: {
  reduceMotion: boolean;
  userName?: string;
}) {
  return (
    <div className="relative perspective-[1400px]" aria-hidden>
      <motion.div
        className="absolute -inset-12 rounded-full bg-amber-300/8 blur-3xl"
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.35, 0.62, 0.35], scale: [0.97, 1.025, 0.97] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={
          reduceMotion ? false : { rotateY: -4, rotateX: 1.5, scale: 0.99 }
        }
        animate={{ rotateY: -1.5, rotateX: 0.5, scale: 1 }}
        whileHover={
          reduceMotion ? undefined : { rotateY: 0, rotateX: 0, y: -4 }
        }
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#141414] shadow-[0_32px_100px_rgba(0,0,0,0.52)] [transform-style:preserve-3d]"
      >
        <div className="flex h-12 items-center border-b border-white/8 px-4">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-white/14" />
            <span className="size-2 rounded-full bg-white/14" />
            <span className="size-2 rounded-full bg-amber-300/70" />
          </div>
          <div className="mx-auto flex items-center gap-2 text-[10px] font-medium text-white/36">
            <Zap className="size-3 fill-amber-300 text-amber-300" />
            ON EMIT / FOCUS
          </div>
          <Command className="size-3.5 text-white/25" />
        </div>

        <div className="grid min-h-[470px] grid-cols-[46px_1fr]">
          <aside className="flex flex-col items-center border-r border-white/8 py-4">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-300 text-neutral-950">
              <Zap className="size-4 fill-current" />
            </span>
            <div className="mt-6 flex flex-col gap-2">
              {[Inbox, CalendarDays, Search, Ghost2].map((Icon, index) => (
                <span
                  key={index}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    index === 0 ? "bg-white/8 text-white/80" : "text-white/25",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              ))}
            </div>
            <span className="mt-auto flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/35">
              <UserRound className="size-4" />
            </span>
          </aside>

          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-medium tracking-widest text-white/28 uppercase">
                  Wednesday, July 23
                </p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.035em]">
                  Good morning, {userName || ""}
                </h3>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/10 text-amber-300">
                <Sparkles className="size-4" />
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-white/8 bg-white/[0.025]">
              {metrics.map(({ value, label }) => (
                <div
                  key={label}
                  className="border-r border-white/8 px-3 py-3 last:border-r-0"
                >
                  <p className="text-base font-semibold text-amber-200">
                    {value}
                  </p>
                  <p className="mt-0.5 text-[9px] text-white/30">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold tracking-[0.12em] text-white/30 uppercase">
                  Priority inbox
                </p>
                <span className="text-[9px] text-amber-300">View inbox</span>
              </div>
              <div className="mt-2 space-y-2">
                {messages.map(({ subject, sender, time, priority }) => (
                  <div
                    key={subject}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border bg-white/[0.035] px-3 py-2.5",
                      priority ? "border-amber-300/20" : "border-white/7",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        priority ? "bg-amber-300" : "bg-white/20",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-white/75">
                        {subject}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-white/30">
                        {sender}
                      </span>
                    </span>
                    <span className="text-[9px] text-white/25">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-300 text-neutral-950">
                    <CalendarDays className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium">
                      Product direction
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[9px] text-white/30">
                      <Clock3 className="size-3" />
                      10:30–11:00
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300/18 bg-amber-300/[0.055] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-300/12 text-amber-300">
                    <Ghost2 className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-amber-100">
                      Daily brief ready
                    </p>
                    <p className="mt-1 truncate text-[9px] text-white/30">
                      Proposal first, then meeting prep
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2.5 shadow-2xl sm:flex"
      >
        <CheckCircle2 className="size-4 text-emerald-400" />
        <div>
          <p className="text-[10px] font-medium">Calendar updated</p>
          <p className="text-[9px] text-white/32">Guests notified</p>
        </div>
      </motion.div>
    </div>
  );
}
