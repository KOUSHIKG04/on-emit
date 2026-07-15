"use client";

import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LoginFormValues = {
  provider: "google";
};

export function LoginForm() {
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      provider: "google",
    },
  });

  async function signInWithGoogle(values: LoginFormValues) {
    if (values.provider !== "google") {
      setError("root", { message: "Unsupported authentication provider." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    });

    if (error) {
      setError("root", { message: error.message });
    }
  }

  return (
    <form onSubmit={handleSubmit(signInWithGoogle)} noValidate>
      <input type="hidden" {...register("provider")} />
      <div className="flex items-center justify-center">
        <Button
          type="submit"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          className={"w-full py-6"}
        >
          <GoogleIcon />
          {isSubmitting ? "Redirecting to Google..." : "Continue with Google"}
        </Button>
      </div>

      {errors.root?.message ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive mt-4 rounded-xl border p-3 text-sm"
        >
          {errors.root.message}
        </p>
      ) : null}
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}
