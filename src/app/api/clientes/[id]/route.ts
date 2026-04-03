import { getDb } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM clientes WHERE id = ?", args: [id] });
  return Response.json({ ok: true });
}
