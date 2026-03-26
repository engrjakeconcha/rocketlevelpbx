import { redirect } from "next/navigation";
import { requireAccessContext } from "@/lib/tenant/access";

export default async function NotificationsPage() {
  const access = await requireAccessContext();
  redirect(access.isAdmin ? "/admin" : "/overview");
}
