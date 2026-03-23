import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Rule = {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
};

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function WeeklyHoursEditor({ rules }: { rules: Rule[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Business Hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[180px,1fr,1fr]">
            <div className="font-medium">{dayLabels[rule.dayOfWeek]}</div>
            <div>
              <Label>Start</Label>
              <Input value={rule.startTime ?? "Closed"} readOnly />
            </div>
            <div>
              <Label>End</Label>
              <Input value={rule.endTime ?? "Closed"} readOnly />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
