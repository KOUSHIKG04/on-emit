"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { Zap } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const updateNav = () => setIsScrolled(window.scrollY > 24);

    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });

    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[top,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isScrolled ? "md:top-3 md:px-3 lg:top-4 lg:px-6" : "top-0 px-0",
      )}
    >
      <nav
        className={cn(
          "relative mx-auto flex h-14 w-full items-center justify-between bg-[#111111]/92 px-4 backdrop-blur-2xl transition-[max-width,border-radius,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6",
          isScrolled
            ? "w-full rounded-none border-x-0 border-t-0 border-b-white/10 shadow-none md:max-w-7xl md:rounded-2xl md:border md:border-white/10 md:shadow-[0_18px_60px_rgba(0,0,0,0.32)]"
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

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-xs font-semibold tracking-wider text-white/55 uppercase md:flex">
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

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/inbox"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/12 bg-white/6 px-3.5 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/10"
              >
                Open workspace
              </Link>
              <form action={signOut} className="flex items-center">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-9 rounded-lg border border-white/12 bg-white/6 px-3.5 text-xs font-medium tracking-wide uppercase transition-all hover:border-white/20 hover:bg-white/10"
                >
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-white/60 uppercase transition-colors hover:text-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/12 bg-white/6 px-3.5 text-sm font-medium uppercase transition-all hover:border-white/20 hover:bg-white/10"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
