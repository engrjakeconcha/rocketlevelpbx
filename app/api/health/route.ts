import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "rocketlevel-ai-routing-console",
    timestamp: new Date().toISOString()
  });
}
