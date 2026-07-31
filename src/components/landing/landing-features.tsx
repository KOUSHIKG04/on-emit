"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  siAnthropic,
  siGmail,
  siGooglecalendar,
  siGooglegemini,
  siOpenrouter,
  type SimpleIcon,
} from "simple-icons";

import {
  CalendarDays,
  CheckCircle2,
  Inbox,
  Mail,
  MailCheck,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
  Zap,
  type TablerIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const integrations: Array<{
  name: string;
  icon?: SimpleIcon;
  src?: string;
}> = [
  { name: "Gmail", icon: siGmail },
  { name: "Google Calendar", icon: siGooglecalendar },
  { name: "Gemini", icon: siGooglegemini },
  { name: "OpenAI", src: "/brands/openai.svg" },
  { name: "Claude", icon: siAnthropic },
  { name: "OpenRouter", icon: siOpenrouter },
];

const activityRail = [
  "Priority inbox cleared",
  "Launch review scheduled",
  "Proposal draft ready",
  "Client calendar connected",
  "Daily brief generated",
] as const;

const features: Array<{
  title: string;
  description: string;
  icon: TablerIcon;
  className?: string;
  visual: "inbox" | "calendar" | "accounts" | "models" | "search";
}> = [
  {
    title: "One inbox, actually prioritized",
    description:
      "Surface what needs attention, search naturally, and turn messages into action without tab-hopping.",
    icon: Inbox,
    className: "md:col-span-2",
    visual: "inbox",
  },
  {
    title: "Calendar-aware by default",
    description:
      "See your day, create events, and handle meeting details from the same focused workspace.",
    icon: CalendarDays,
    visual: "calendar",
  },
  {
    title: "Every Google account",
    description:
      "Switch between personal, work, and client Gmail and Calendar connections from one account menu.",
    icon: UserRound,
    visual: "accounts",
  },
  {
    title: "Your model, your key",
    description:
      "Use free Gemini mode or bring any supported Gemini, OpenRouter, OpenAI, or Anthropic model ID.",
    icon: ShieldCheck,
    className: "md:col-span-2",
    visual: "models",
  },
  {
    title: "Search without the archaeology",
    description:
      "Combine Gmail operators, quick filters, and recent searches in one compact command surface.",
    icon: Search,
    className: "md:col-span-3",
    visual: "search",
  },
];

export function IntegrationsStrip() {
  return (
    <section className="border-y border-white/8 bg-white/[0.018]">
      <div className="flex flex-col gap-5 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:px-12">
        <p className="shrink-0 text-xs font-medium tracking-[0.16em] text-white/34 uppercase">
          Connected tools
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 lg:ml-auto">
          {integrations.map(({ name, icon, src }) => (
            <div
              key={name}
              className="flex items-center gap-2 text-sm font-medium text-white/50"
            >
              <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white p-1.5 shadow-sm">
                {icon ? (
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="size-full"
                    fill={`#${icon.hex}`}
                  >
                    <path d={icon.path} />
                  </svg>
                ) : (
                  <Image
                    alt=""
                    aria-hidden
                    src={src ?? "/brands/openai.svg"}
                    width={20}
                    height={20}
                    className="size-full"
                  />
                )}
              </span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ActivityRail() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Recent On Emit activity"
      className="bg-muted/40 text-muted-foreground overflow-hidden border-y border-white/8 py-3"
    >
      <motion.div
        className="flex w-max items-center"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {[...activityRail, ...activityRail].map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center text-xs font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
          >
            {item}
            <Zap className="mx-8 size-3.5 fill-amber-300 text-amber-300 opacity-65" />
          </span>
        ))}
      </motion.div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24 sm:px-10 lg:px-12 lg:py-36">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
          Designed for actual work
        </p>
        <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl leading-[1.08] font-semibold tracking-[-0.04em] text-balance">
          Less inbox management. More forward motion.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/50">
          Every surface is shaped around the next useful action—not another feed
          to maintain.
        </p>
      </div>

      <div className="mt-14 grid overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className={cn(
              "flex flex-col overflow-hidden border-b border-white/10 bg-[#111111] p-6 last:border-b-0 sm:p-7 md:border-r md:[&:nth-child(2)]:border-r-0 md:[&:nth-child(3)]:border-r md:[&:nth-child(3)]:border-b md:[&:nth-child(4)]:border-b md:[&:nth-child(5)]:border-r-0 md:[&:nth-child(5)]:border-b",
              feature.className,
            )}
          >
            <div className="max-w-md">
              <span className="flex size-10 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/8 text-amber-300">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">
                {feature.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
                {feature.description}
              </p>
            </div>
            <FeatureVisual type={feature.visual} />
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureVisual({
  type,
}: {
  type: "inbox" | "calendar" | "accounts" | "models" | "search";
}) {
  if (type === "inbox") {
    const messages = [
      {
        icon: Mail,
        subject: "Proposal ready",
        sender: "Nora Chen",
        time: "2m",
        priority: true,
      },
      {
        icon: MailCheck,
        subject: "Launch review",
        sender: "Design team",
        time: "18m",
        priority: false,
      },
      {
        icon: MessageCircle,
        subject: "Client reply",
        sender: "Acme Studio",
        time: "1h",
        priority: false,
      },
    ] as const;

    return (
      <div className="mt-7 grid gap-2 sm:grid-cols-3">
        {messages.map(({ icon: Icon, subject, sender, time, priority }) => (
          <div
            key={subject}
            className={cn(
              "rounded-xl border bg-white/[0.035] p-3.5",
              priority ? "border-amber-300/25" : "border-white/8",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg",
                  priority
                    ? "bg-amber-300 text-neutral-950"
                    : "bg-white/7 text-white/45",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="text-[10px] text-white/28">{time}</span>
            </div>
            <p className="mt-5 truncate text-xs font-medium text-white/80">
              {subject}
            </p>
            <p className="mt-1 truncate text-[10px] text-white/35">{sender}</p>
          </div>
        ))}
      </div>
    );
  }

  if (type === "calendar") {
    return (
      <div className="mt-7 rounded-xl border border-white/8 bg-white/[0.03] p-3">
        <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[8px] font-medium text-white/25 uppercase">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md bg-white/[0.04] text-[9px] text-white/35",
                index === 10 && "bg-amber-300 font-semibold text-neutral-950",
                index === 15 && "border border-amber-300/35 bg-amber-300/8",
              )}
            >
              {index + 1}
              {index === 15 ? (
                <span className="absolute bottom-1 size-1 rounded-full bg-amber-300" />
              ) : null}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (type === "accounts") {
    const accounts = [
      { name: "Work", email: "koushik@onemit.app", active: true },
      { name: "Personal", email: "personal@gmail.com", active: false },
      { name: "Client", email: "projects@client.co", active: false },
    ] as const;

    return (
      <div className="mt-7 space-y-2">
        {accounts.map(({ name, email, active }) => (
          <div
            key={name}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white/[0.035] px-3 py-2.5",
              active ? "border-amber-300/20" : "border-white/8",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full",
                active
                  ? "bg-amber-300 text-neutral-950"
                  : "bg-white/8 text-white/45",
              )}
            >
              <UserRound className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-white/70">{name}</span>
              <span className="block truncate text-[9px] text-white/28">
                {email}
              </span>
            </span>
            {active ? (
              <span className="ml-auto flex items-center gap-1 text-[9px] text-amber-300">
                <CheckCircle2 className="size-3" />
                Active
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (type === "models") {
    const providers = [
      { name: "Gemini", detail: "Free mode", active: true },
      { name: "OpenAI", detail: "Bring your key", active: false },
      { name: "Claude", detail: "Bring your key", active: false },
      { name: "OpenRouter", detail: "Custom model ID", active: false },
    ] as const;

    return (
      <div className="mt-7 grid grid-cols-2 gap-2">
        {providers.map(({ name, detail, active }) => (
          <div
            key={name}
            className={cn(
              "rounded-xl border px-3.5 py-3",
              active
                ? "border-amber-300/25 bg-amber-300/8 text-amber-100"
                : "border-white/8 bg-white/[0.035] text-white/45",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{name}</span>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  active ? "bg-emerald-400" : "bg-white/15",
                )}
              />
            </div>
            <p className="mt-1.5 text-[9px] opacity-55">{detail}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-7">
      <div className="flex items-center gap-3 rounded-xl border border-white/9 bg-white/[0.04] px-4 py-3 text-sm text-white/40">
        <Search className="size-4 text-amber-300" />
        from:team newer_than:7d has:attachment
        <span className="ml-auto rounded-md bg-amber-300 px-2 py-1 text-[10px] font-semibold text-neutral-950">
          Search
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {["Unread", "Attachments", "Last 7 days", "Starred"].map((filter) => (
          <span
            key={filter}
            className="rounded-lg border border-white/7 bg-white/[0.025] px-3 py-1.5 text-[10px] text-white/35"
          >
            {filter}
          </span>
        ))}
      </div>
    </div>
  );
}
