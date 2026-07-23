"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowRight, Zap } from "@/components/icons";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateNav = () => setIsScrolled(window.scrollY > 24);

    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });

    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 z-50 transition-[top,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isScrolled ? "top-3 px-3 sm:top-4 sm:px-6" : "top-0 px-0",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex h-14 w-full items-center bg-[#111111]/88 px-4 backdrop-blur-2xl transition-[max-width,border-radius,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6",
          isScrolled
            ? "max-w-7xl rounded-2xl border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.32)]"
            : "max-w-[100vw] rounded-none border border-x-transparent border-t-transparent border-b-white/10 shadow-none",
        )}
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="On Emit home"
        >
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-amber-400 text-neutral-950 transition-transform duration-300 group-hover:rotate-3">
            <Zap className="size-4 fill-current" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em]">
            On Emit
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-7 text-sm text-white/55 md:flex">
          <a className="transition-colors hover:text-white" href="#product">
            Product
          </a>
          <a className="transition-colors hover:text-white" href="#features">
            Features
          </a>
          <a className="transition-colors hover:text-white" href="#workflow">
            How it works
          </a>
        </div>

        <Link
          href="/login"
          className="ml-5 hidden text-sm font-medium text-white/60 transition-colors hover:text-white sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="ml-3 inline-flex h-9 items-center gap-2 rounded-lg border border-white/12 bg-white/6 px-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/10"
        >
          Get started
          <ArrowRight className="size-4" />
        </Link>
      </nav>
    </header>
  );
}
