import type { Metadata } from "next";
import BossGame from "@/components/BossGame";

export const metadata: Metadata = { title: "Boss Fights · Hoax Hunter" };

export default function BossPage() {
  return <BossGame />;
}
