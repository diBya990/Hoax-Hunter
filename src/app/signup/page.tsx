import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Sign up · Hoax Hunter" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  return <AuthForm mode="signup" next={safeNext(next)} />;
}
