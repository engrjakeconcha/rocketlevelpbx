import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export async function AppShell({
  isAdmin,
  children
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex-1 space-y-6">
          <Header />
          {children}
        </div>
      </div>
    </div>
  );
}
