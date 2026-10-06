import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Log in · Hoax Hunter" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return <AuthForm mode="login" next={safeNext(next)} />;
}
