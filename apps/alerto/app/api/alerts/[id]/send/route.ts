import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { processBatch } from "@/lib/send";

export const dynamic = "force-dynamic";

// Drain the next batch of pending recipients for an alert. RBAC-gated
// (alerts:send). The client calls this repeatedly until `pending` reaches 0.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requirePermission(req, "alerts:send");
  if (!caller) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { id } = await params;
  const tally = await processBatch(id);
  return NextResponse.json({ id, ...tally }, { status: tally.ok ? 200 : 404 });
}
