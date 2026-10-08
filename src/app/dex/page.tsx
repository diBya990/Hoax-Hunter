import type { Metadata } from "next";
import DexView from "@/components/DexView";

export const metadata: Metadata = { title: "Scam Dex · Hoax Hunter" };

export default function DexPage() {
  return <DexView />;
}
