import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Backdrop from "@/components/Backdrop";
import GameUserSync from "@/components/GameUserSync";
import { getCurrentUser } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hoax Hunter",
  description:
    "Learn to spot scams by playing, and check suspicious messages with AI.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const userName = user
    ? (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Hunter"
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" data-user-id={user?.id ?? ""}>
        <GameUserSync userId={user?.id ?? null} />
        <Backdrop />
        <AppShell userName={userName}>{children}</AppShell>
      </body>
    </html>
  );
}
