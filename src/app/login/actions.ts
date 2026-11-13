"use server";

import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { isAppPassword } from "@/lib/secrets";
import { startSession } from "@/lib/session";

export type LoginState = { error: string | null };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!isAppPassword(password)) {
    return { error: "That password did not match. Try again." };
  }
  await startSession();
  redirect(safeReturnPath(String(formData.get("next") ?? "")));
}
