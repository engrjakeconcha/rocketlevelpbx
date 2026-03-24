import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/tenant/access";
import { MakeApiService } from "@/services/make-api-service";

const verifyScenarioSchema = z.object({
  scenarioId: z.string().min(1)
});

export async function POST(request: Request) {
  await requireAdminAccess();
  const payload = await request.json();
  const parsed = verifyScenarioSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await new MakeApiService().verifyScenario(parsed.data.scenarioId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not verify the Make scenario"
      },
      { status: 400 }
    );
  }
}
