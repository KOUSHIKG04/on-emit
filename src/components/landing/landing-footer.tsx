import Link from "next/link";

import { MailOpen, Zap } from "@/components/icons";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();

const navigationLinks = [
  { href: "#product", label: "Product" },
  { href: "#features", label: "Features" },
  { href: "/", label: "Home" },
] as const;

const supportLinks = [
  { href: "/signup", label: "Create account" },
  { href: "/login", label: "Sign in" },
  { href: "mailto:koushikgdatta5@gmail.com", label: "Contact support" },
] as const;

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#0d0d0d]">
      <div className="border-b border-white/10">
        <div className="mx-auto w-full max-w-5xl px-10 py-12">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-400 text-neutral-950">
              <Zap className="size-4 fill-current" />
            </span>
            <span className="text-base font-bold tracking-tight text-white">
              On Emit
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            On Emit brings Gmail, Google Calendar, and your preferred AI
            provider into one focused command center. Built for people who want
            to move through work without moving through tabs.
          </p>
        </div>
      </div>

      <div className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 md:grid-cols-4 md:divide-x md:divide-white/10">
          <div className="flex flex-col items-start justify-center border-b border-white/10 p-6 sm:p-10 md:col-span-2 md:border-b-0">
            <h3 className="text-sm font-semibold tracking-normal text-white uppercase">
              Contact us:{" "}
              <a
                href="mailto:koushikgdatta5@gmail.com"
                className="inline-flex items-center gap-1.5 font-medium text-white lowercase transition-colors hover:text-amber-300"
              >
                koushikgdatta5@gmail.com
                <MailOpen className="size-3" />
              </a>
            </h3>
            <p className="pt-3 text-xs tracking-normal text-white/30">
              Copyright &copy; {currentYear} On Emit. All rights reserved.
            </p>
          </div>

          <FooterColumn
            title="Navigation"
            links={navigationLinks}
            className="hidden md:block"
          />
          <FooterColumn title="Support" links={supportLinks} />
        </div>
      </div>

      <div className="overflow-hidden px-4 pt-10 pb-2">
        <p
          aria-hidden
          className="to-primary/40 -mb-6 bg-linear-to-b from-transparent/30 bg-clip-text text-center text-[20vw] leading-[0.85] font-bold tracking-tight text-transparent md:text-[15vw]"
        >
          On Emit
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn("p-6 sm:p-10", className)}>
      <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
        {title}
      </h3>
      <ul className="space-y-3 pt-3 text-sm uppercase">
        {links.map(({ href, label }) => (
          <li key={`${href}-${label}`}>
            <Link
              href={href}
              className="text-xs text-white/45 transition-colors hover:text-amber-300"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
