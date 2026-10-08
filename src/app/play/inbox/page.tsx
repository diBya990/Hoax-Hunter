import type { Metadata } from "next";
import InboxGame from "@/components/InboxGame";
import { getScamType } from "@/lib/scamTypes";

export const metadata: Metadata = { title: "Inbox Defender · Hoax Hunter" };

// /play/inbox?focus=romance starts a practice round about one scam type
// (the Scam Dex links here).
export default async function InboxPage(props: PageProps<"/play/inbox">) {
  const { focus } = await props.searchParams;
  const scamType = typeof focus === "string" ? getScamType(focus) : undefined;
  return <InboxGame focus={scamType?.id} />;
}
