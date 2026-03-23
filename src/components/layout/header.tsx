import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export async function Header() {
  const session = await auth();

  return (
    <header className="rounded-3xl border border-border bg-card/80 px-6 py-5 shadow-panel">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">{session?.user?.name ?? "User"}</div>
            <div className="text-xs text-muted-foreground">{session?.user?.email}</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
