"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { ProductCanvas } from "@/components/landing/product-canvas";

export function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-24 sm:px-10 sm:pt-40 lg:px-12 lg:pt-44 lg:pb-28">
      <div className="relative grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
          className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left"
        >
          {/* <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-amber-300 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Gmail + Calendar + AI
          </div> */}

          <h1 className="mt-6 text-3xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-4xl lg:text-5xl">
            Your workday in{" "}
            <span className="text-amber-300">one clear view.</span>
          </h1>

          <p className="mt-7 max-w-lg text-base leading-7 text-white/52 sm:text-lg sm:leading-8">
            Prioritize every inbox, manage every Google Calendar, and work with
            the AI model you choose—without moving between tabs.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-neutral-800 uppercase transition-all hover:bg-amber-300"
            >
              Create your workspace
              {/* <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /> */}
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/3 px-5 text-xs font-medium text-white/75 uppercase transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              Explore features
            </a>
          </div>

          {/* <div className="mt-7 flex items-center justify-center gap-2 text-xs text-white/32 lg:justify-start">
            <Zap className="size-3.5 fill-amber-300 text-amber-300" />
            Multiple Google accounts · Free Gemini mode · BYOK
          </div> */}
        </motion.div>

        <motion.div
          id="product"
          initial={reduceMotion ? false : { opacity: 0, x: 30, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.85,
            delay: reduceMotion ? 0 : 0.15,
            ease: "easeOut",
          }}
          className="min-w-0 lg:w-full"
        >
          <ProductCanvas reduceMotion={Boolean(reduceMotion)} />
        </motion.div>
      </div>
    </section>
  );
}
