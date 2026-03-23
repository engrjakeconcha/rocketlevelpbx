import { AppShell } from "@/components/layout/app-shell";
import { requireAdminAccess } from "@/lib/tenant/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess();
  return <AppShell isAdmin>{children}</AppShell>;
}
