import { CalendarDays, Command, Mail, Sparkles, Zap } from "lucide-react";

import { LoginForm as GoogleLoginForm } from "@/app/login/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const workflowHighlights = [
  {
    icon: Mail,
    title: "Gmail, without the busywork",
    description: "Search, read, and act on real conversations through Corsair.",
  },
  {
    icon: CalendarDays,
    title: "Calendar in context",
    description: "See upcoming events beside the messages that matter.",
  },
  {
    icon: Command,
    title: "Built for keyboard flow",
    description: "Move between focused views without losing momentum.",
  },
];

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/70 overflow-hidden p-0 shadow-2xl shadow-black/10">
        <CardContent className="grid p-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <section className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="mb-10 flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-sm">
                <Zap className="size-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">On Emit</p>
                <p className="text-muted-foreground text-xs">
                  Mail command center
                </p>
              </div>
            </div>

            <div className="mb-8 max-w-md">
              <div className="text-primary mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                <Sparkles className="size-4" />
                Your workflow, your way
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Email and calendar finally work together.
              </h1>
              <p className="text-muted-foreground mt-3 text-sm leading-6 sm:text-base">
                Sign in with the Google account you want to use. Supabase keeps
                your app identity separate while Corsair connects Gmail and
                Google Calendar.
              </p>
            </div>

            <GoogleLoginForm />

            <div className="bg-muted/40 mt-7 rounded-xl border p-4 text-sm">
              <p className="font-medium">One identity, isolated workspace</p>
              <p className="text-muted-foreground mt-1 leading-5">
                Your Supabase user is used to keep each user&apos;s Corsair data
                in the correct tenant.
              </p>
            </div>
          </section>

          <aside className="bg-sidebar relative hidden overflow-hidden border-l lg:flex lg:flex-col lg:justify-center lg:p-10">
            <div className="bg-primary/15 absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
            <div className="bg-accent/20 absolute -bottom-28 -left-24 size-72 rounded-full blur-3xl" />

            <div className="relative z-10">
              <p className="text-sidebar-foreground/60 mb-5 text-xs font-semibold tracking-[0.18em] uppercase">
                One focused workspace
              </p>

              <div className="space-y-3">
                {workflowHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="bg-background/80 flex gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur"
                    >
                      <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-muted-foreground mt-1 text-xs leading-5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By continuing, you agree to securely connect your workspace through
        Supabase and Corsair.
      </FieldDescription>
    </div>
  );
}
