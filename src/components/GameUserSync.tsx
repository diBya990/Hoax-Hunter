"use client";

import { useEffect } from "react";
import { setGameUser } from "@/lib/gameStore";

// Tells the game store who is logged in, so every account gets its own progress.
// It renders nothing. The layout passes the id from the server.
export default function GameUserSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    setGameUser(userId);
  }, [userId]);
  return null;
}
