"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { Zap } from "@/components/icons";

const workflow = [
  {
    number: "01",
    title: "Connect",
    description:
      "Link one or more Google accounts with isolated OAuth connections.",
  },
  {
    number: "02",
    title: "Choose your intelligence",
    description:
      "Start with free Gemini mode or securely save your own provider key.",
  },
  {
    number: "03",
    title: "Move through the day",
    description:
      "Read, search, schedule, draft, and ask the agent from one workspace.",
  },
] as const;

function getRevealAnimation(reduceMotion: boolean | null) {
  return {
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: reduceMotion ? 0 : 0.65, ease: "easeOut" as const },
  };
}

export function WorkflowSection() {
  const reduceMotion = useReducedMotion();
  const reveal = getRevealAnimation(reduceMotion);

  return (
    <section id="workflow" className="border-y border-white/8 bg-[#101010]">
      <div className="px-4 py-16 sm:px-10 lg:px-12 lg:py-32">
        <motion.div
          {...reveal}
          className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
              From setup to flow
            </p>
            <h2 className="mt-3 text-2xl leading-[1.12] font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              Connected in minutes.
              <br />
              Useful every hour.
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-5 text-white/45 sm:text-sm sm:leading-6">
            OAuth keeps each Google account isolated. Your private provider keys
            are encrypted before storage.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-3 max-sm:-mx-4 max-sm:gap-0 max-sm:border-y max-sm:border-white/10 md:grid-cols-3">
          {workflow.map((step, index) => (
            <motion.div
              key={step.number}
              {...reveal}
              transition={{
                ...reveal.transition,
                delay: reduceMotion ? 0 : index * 0.1,
              }}
              className="relative min-h-52 border-b border-white/10 bg-white/[0.025] p-5 last:border-b-0 max-sm:rounded-none max-sm:border-x-0 sm:rounded-2xl sm:border sm:p-8"
            >
              <span className="font-mono text-xs text-amber-300">
                {step.number}
              </span>
              <span
                aria-hidden
                className="absolute top-6 right-6 h-px w-16 bg-gradient-to-r from-amber-300/55 to-transparent"
              />
              <h3 className="mt-10 text-lg font-semibold sm:mt-14 sm:text-xl">{step.title}</h3>
              <p className="mt-2 max-w-xs text-xs leading-5 text-white/45 sm:mt-3 sm:text-sm sm:leading-6">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCta() {
  const reduceMotion = useReducedMotion();
  const reveal = getRevealAnimation(reduceMotion);

  return (
    <section className="relative px-4 py-16 sm:px-10 lg:px-12 lg:py-36">
      <motion.div
        {...reveal}
        className="relative overflow-hidden border border-amber-300/20 bg-amber-300 px-5 py-12 text-center text-neutral-950 max-sm:-mx-4 max-sm:rounded-none sm:rounded-[2rem] sm:px-12 sm:py-20"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.7),transparent_26%),linear-gradient(120deg,transparent_55%,rgba(0,0,0,0.08))]"
        />
        <Zap className="relative mx-auto size-10 fill-current" />
        <h2 className="relative mx-auto mt-6 max-w-3xl text-2xl leading-[1.08] font-semibold tracking-[-0.05em] text-balance sm:text-4xl lg:text-5xl">
          Your work already emits signals. Act on the right ones.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-xs leading-5 text-neutral-800/70 sm:mt-6 sm:text-base sm:leading-6">
          Bring Gmail, Calendar, and your preferred AI into one calm command
          center.
        </p>
        <Link
          href="/signup"
          className="group relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white uppercase transition-transform hover:-translate-y-0.5"
        >
          Create your workspace
        </Link>
      </motion.div>
    </section>
  );
}
