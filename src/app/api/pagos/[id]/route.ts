import getDb from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM pagos WHERE id = ?").run(id);
  return Response.json({ ok: true });
}
