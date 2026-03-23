import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: "Open" | "Closed" | "SUCCESS" | "FAILED" | "PENDING" | "Active" | "Inactive";
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "Open" || status === "SUCCESS" || status === "Active"
      ? "success"
      : status === "FAILED" || status === "Closed" || status === "Inactive"
        ? "danger"
        : "warning";

  return <Badge variant={variant}>{status}</Badge>;
}
