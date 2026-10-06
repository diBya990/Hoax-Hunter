"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import MessageCards from "@/components/MessageCards";
import { playClick } from "@/lib/sound";

// Wraps every page. The title screen ("/") is full-screen with no nav bar
// and no global click sound (it has its own START sound).
export default function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string | null;
}) {
  const pathname = usePathname();
  const isTitleScreen = pathname === "/";
  const isHub = pathname === "/home";
  // Game screens fill the window exactly and never scroll.
  const isGame = ["/play/inbox", "/play/chat", "/play/detective", "/play/boss"].includes(pathname);

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

  // Every page except the title screen fills the window exactly and never scrolls.
  // Each page is built to fit inside the area below the nav bar.
  return (
    <div className="page-in relative flex h-dvh flex-col overflow-hidden">
      {isHub && <MessageCards />}
      <NavBar userName={userName} />
      <main
        className={`relative z-10 mx-auto min-h-0 w-full flex-1 px-4 ${
          isGame ? "max-w-6xl py-3" : "max-w-5xl py-4"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
