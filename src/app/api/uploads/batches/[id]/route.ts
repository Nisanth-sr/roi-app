import { NextResponse } from "next/server";
import { requireOwner, isErrorResponse } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteUploadBatch, runRollupForMonths } from "@/modules/rollup/compute";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const { id } = await params;
  const supabase = await createClient();

  try {
    const months = await deleteUploadBatch(supabase, ctx.tenantId, id);
    if (months.length > 0) {
      await runRollupForMonths(
        supabase,
        ctx.tenantId,
        months,
        ctx.tenant.red_flag_threshold
      );
    }
    return NextResponse.json({ deleted: true, recomputedMonths: months });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
