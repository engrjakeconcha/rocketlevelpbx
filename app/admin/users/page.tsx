import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { adminRepository } from "@/repositories/admin-repository";

export default async function UsersPage() {
  await requireAdminAccess();
  const users = await adminRepository.listUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-2xl border border-border p-4">
            <div className="font-medium">
              {user.name} · {user.role}
            </div>
            <div className="text-sm text-muted-foreground">
              {user.email} · {user.memberships.map((membership) => membership.domain.description).join(", ") || "Global admin"}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
