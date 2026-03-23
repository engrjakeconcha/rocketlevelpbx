import { AppShell } from "@/components/layout/app-shell";
import { requireAccessContext } from "@/lib/tenant/access";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAccessContext();
  return <AppShell isAdmin={context.isAdmin}>{children}</AppShell>;
}
