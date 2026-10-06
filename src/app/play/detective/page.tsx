import type { Metadata } from "next";
import DetectiveGame from "@/components/DetectiveGame";

export const metadata: Metadata = { title: "Detective · Hoax Hunter" };

export default function DetectivePage() {
  return <DetectiveGame />;
}
