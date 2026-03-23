import { CoverageMemberList } from "@/components/coverage/coverage-member-list";
import { DragAndDropCoverageOrder } from "@/components/coverage/drag-and-drop-coverage-order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccessContext } from "@/lib/tenant/access";
import { coverageRepository } from "@/repositories/coverage-repository";

export default async function CoveragePage() {
  const access = await requireAccessContext();
  const coverage = await coverageRepository.getPrimaryGroup(access.domainId!);

  if (!coverage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No coverage group configured</CardTitle>
        </CardHeader>
        <CardContent>Onboarding must create the primary coverage group before customers can manage it.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CoverageMemberList members={coverage.members} />
      <Card>
        <CardHeader>
          <CardTitle>Reorder Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <DragAndDropCoverageOrder coverageGroupId={coverage.id} members={coverage.members} />
        </CardContent>
      </Card>
    </div>
  );
}
