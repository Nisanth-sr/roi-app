import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { parseUploadFile, readUploadText } from "@/modules/uploads/parser";
import { validateClientRows } from "@/modules/uploads/validate";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`upload-clients:${ctx.userId}`);
  if (limited) return limited;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
    return NextResponse.json(
      { error: "file must be CSV or JSON" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: existingClients } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", ctx.tenantId);

  let content: string;
  try {
    content = await readUploadText(file);
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseUploadFile(content, file.name);
  } catch {
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 });
  }

  const { valid, errors } = validateClientRows(
    parsed.rows,
    existingClients ?? []
  );

  if (valid.length > 0) {
    const inserts = valid.map((row) => ({
      tenant_id: ctx.tenantId,
      name: row.name,
      external_ref: row.externalRef,
    }));

    const { error: insertError } = await supabase.from("clients").insert(inserts);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    rowCount: valid.length,
    errorCount: errors.length,
    errors,
  });
}
