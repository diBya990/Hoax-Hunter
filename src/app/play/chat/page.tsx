import type { Metadata } from "next";
import ChatGame from "@/components/ChatGame";

export const metadata: Metadata = { title: "Scammer Chat · Hoax Hunter" };

export default function ChatPage() {
  return <ChatGame />;
}
