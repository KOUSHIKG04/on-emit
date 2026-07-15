import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) redirect("/app");

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <p className="text-primary mb-2 text-sm font-medium">
            Email and calendar command center
          </p>
          <CardTitle className="text-3xl tracking-tight">
            Welcome to On Emit
          </CardTitle>
          <CardDescription className="pt-2 leading-6">
            Sign in to manage your email and calendar workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-muted-foreground text-center text-xs leading-5">
            Gmail and Google Calendar permissions will be connected separately
            through Corsair after login.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
