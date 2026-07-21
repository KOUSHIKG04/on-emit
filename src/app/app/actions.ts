"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export async function signOut() {
  const supabase = await requireAuthenticatedUser();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out. Please try again.");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
