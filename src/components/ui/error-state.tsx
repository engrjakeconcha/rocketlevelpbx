import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-danger/30">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-danger">{description}</CardContent>
    </Card>
  );
}
