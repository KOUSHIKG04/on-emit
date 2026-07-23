"use client";

import Link from "next/link";

import { LoginForm as GoogleLoginForm } from "@/components/auth/google-login-form";
import {
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field";
import { ShieldCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

type LoginFormProps = React.ComponentProps<"div"> & {
  mode: "login" | "signup";
  nextPath: string;
  errorCode?: string;
};

const authErrors: Record<string, string> = {
  missing_oauth_code:
    "Google sign-in was cancelled or did not return an authorization code.",
  oauth_callback_failed:
    "We could not finish signing you in. Please try Google again.",
};

export function LoginForm({
  mode,
  nextPath,
  errorCode,
  className,
  ...props
}: LoginFormProps) {
  const isSignup = mode === "signup";
  const alternateHref = isSignup
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : `/signup?next=${encodeURIComponent(nextPath)}`;
  const errorMessage = errorCode ? authErrors[errorCode] : undefined;

  return (
    <div className={cn("flex flex-col gap-7", className)} {...props}>
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">
          {isSignup ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground text-sm leading-6">
          {isSignup
            ? "Use your Google account to create a private On Emit workspace."
            : "Sign in with the Google account connected to your workspace."}
        </p>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="border-destructive/35 bg-destructive/8 text-destructive rounded-xl border px-4 py-3 text-sm"
        >
          {errorMessage}
        </div>
      ) : null}

      <FieldGroup>
        <GoogleLoginForm mode={mode} nextPath={nextPath} />
        <FieldSeparator>Secure Google OAuth</FieldSeparator>
        <div className="bg-muted/45 flex items-start gap-3 rounded-xl border p-4">
          <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
          <FieldDescription className="text-xs leading-5">
            Authentication is handled by Google and Supabase. On Emit never
            receives or stores your Google password.
          </FieldDescription>
        </div>
      </FieldGroup>
      <p className="text-muted-foreground flex justify-center gap-1 text-center text-sm lg:text-left">
        {isSignup ? "Already have a workspace?" : "New to On Emit?"}{" "}
        <Link
          href={alternateHref}
          className="text-foreground font-medium underline underline-offset-4"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>

      <FieldDescription className="text-center text-xs lg:text-left">
        By continuing, you agree to use On Emit responsibly and authorize the
        requested Google account access.
      </FieldDescription>
    </div>
  );
}
