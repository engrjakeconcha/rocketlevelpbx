import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const customerItems = [
  { href: "/overview", label: "Overview" },
  { href: "/schedule", label: "Schedule" },
  { href: "/change-log", label: "Change Log" },
  { href: "/account", label: "Account" }
];

const adminItems = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/domains", label: "Domains" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/backend-mappings", label: "Backend Mappings" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/sync-monitor", label: "Sync Monitor" },
  { href: "/admin/settings", label: "Settings" }
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const items = isAdmin ? adminItems : customerItems;

  return (
    <aside className="w-full max-w-72 rounded-3xl border border-border bg-card/80 p-6 shadow-panel">
      <nav className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
