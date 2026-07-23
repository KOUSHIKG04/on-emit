import Link from "next/link";

import { OnEmitDither } from "@/components/effects/on-emit-dither";
import { LoginForm } from "@/components/login-form";
import {
  CalendarDays,
  CheckCircle2,
  Mail,
  Sparkles,
  Zap,
} from "@/components/icons";

const benefits = [
  {
    icon: Mail,
    title: "Focused Gmail",
    description: "Priority conversations without the inbox noise.",
  },
  {
    icon: CalendarDays,
    title: "Calendar in context",
    description: "The next meeting beside the work that matters.",
  },
  {
    icon: Sparkles,
    title: "Your choice of AI",
    description: "Free Gemini mode or your own provider key.",
  },
] as const;

type AuthPageShellProps = {
  mode: "login" | "signup";
  nextPath: string;
  errorCode?: string;
};

export function AuthPageShell({
  mode,
  nextPath,
  errorCode,
}: AuthPageShellProps) {
  return (
    <main className="bg-background grid min-h-svh lg:grid-cols-2">
      <section className="flex min-h-svh flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <Link href="/" className="flex w-fit items-center gap-2.5 font-medium">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Zap className="size-4 fill-current" />
          </span>
          On Emit
        </Link>

        <div className="flex flex-1 items-center justify-center py-8">
          <LoginForm
            mode={mode}
            nextPath={nextPath}
            errorCode={errorCode}
            className="w-full max-w-sm"
          />
        </div>

        <p className="text-muted-foreground text-center text-xs lg:text-left">
          Gmail and Calendar, directed by you.
        </p>
      </section>

      <aside className="relative hidden overflow-hidden border-l bg-[#0b0b0b] lg:block">
        <OnEmitDither
          className="absolute inset-0 opacity-75"
          maxPixelCount={900_000}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,11,0.12),rgba(11,11,11,0.74)),linear-gradient(90deg,rgba(11,11,11,0.42),rgba(11,11,11,0.08))]" />

        <div className="relative z-10 flex min-h-svh flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-4 text-emerald-400" />
            Private workspace access
          </div>

          <div className="my-16 max-w-xl">
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              One calm command center
            </p>
            <h2 className="mt-5 text-4xl leading-[1.02] font-semibold tracking-[-0.055em] text-balance xl:text-6xl">
              Your work stays yours.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-lg text-sm leading-6">
              Sign in before any workspace data loads. Every user gets an
              isolated account, Google connection, and AI configuration.
            </p>

            <div className="mt-10 grid gap-3 xl:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="bg-background/70 rounded-2xl border p-4 shadow-xl backdrop-blur"
                >
                  {/* <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-xl">
                    <Icon className="size-4" />
                  </span> */}
                  <p className="mt-0 text-sm font-semibold">{title}</p>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-5 tracking-wide">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-5">
            Protected by Supabase authentication. Google access is requested
            separately and can be revoked at any time.
          </p>
        </div>
      </aside>
    </main>
  );
}
