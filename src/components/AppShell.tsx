"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import MessageCards from "@/components/MessageCards";
import { playClick } from "@/lib/sound";

// Wraps every page. The title screen ("/") is full-screen with no nav bar
// and no global click sound (it has its own START sound). The hub ("/home")
// fits exactly in one screen, so it never scrolls.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTitleScreen = pathname === "/";
  const isHub = pathname === "/home";

  useEffect(() => {
    if (isTitleScreen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, [role='button']")) playClick();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [isTitleScreen]);

  if (isTitleScreen) return <>{children}</>;

  if (isHub) {
    return (
      <div className="page-in relative flex h-dvh flex-col overflow-hidden">
        <MessageCards />
        <NavBar />
        <main className="relative z-10 mx-auto min-h-0 w-full max-w-5xl flex-1 px-4 py-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
}
