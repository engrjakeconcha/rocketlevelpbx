import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { requireAdminAccess } from "@/lib/tenant/access";
import { adminRepository } from "@/repositories/admin-repository";

export default async function UsersPage() {
  await requireAdminAccess();
  const [users, domains] = await Promise.all([adminRepository.listUsers(), adminRepository.listDomains()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CreateUserForm
          domains={domains.map((domain) => ({
            id: domain.id,
            description: domain.description,
            notificationScenarios: domain.notificationScenarios.map((scenario) => ({
              id: scenario.id,
              name: scenario.name
            }))
          }))}
        />
        {users.map((user) => (
          <div key={user.id} className="rounded-2xl border border-border p-4">
            <div className="font-medium">
              {user.name} · {user.role}
            </div>
            <div className="text-sm text-muted-foreground">
              {user.email} · {user.memberships.map((membership) => membership.domain.description).join(", ") || "Global admin"}
            </div>
            <div className="text-sm text-muted-foreground">
              Notification scenario: {user.notificationScenario?.name ?? "Not assigned"}
            </div>
            <div className="mt-4">
              <DeleteUserButton userId={user.id} userName={user.name} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
