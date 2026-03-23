import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HolidayManager({
  holidays
}: {
  holidays: Array<{ id: string; name: string; startsAt: Date; endsAt: Date }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Holiday Closures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {holidays.map((holiday) => (
          <div key={holiday.id} className="rounded-2xl border border-border p-4">
            <div className="font-medium">{holiday.name}</div>
            <div className="text-sm text-muted-foreground">
              {holiday.startsAt.toLocaleDateString()} to {holiday.endsAt.toLocaleDateString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
