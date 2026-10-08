import { redirect } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { getCurrentUser } from "@/lib/supabase/server";

// Needs a logged-in user. src/proxy.ts already redirects visitors, and this
// check is a second safety net.
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/home?next=/profile");

  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Hunter";

  return <ProfileView name={name} />;
}
