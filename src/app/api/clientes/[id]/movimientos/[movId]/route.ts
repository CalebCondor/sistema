import getDb from "@/lib/db";

interface Params {
  params: Promise<{ id: string; movId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id, movId } = await params;
  const body = await request.json();
  const monto = parseFloat(body.monto);
  const descripcion =
    body.descripcion !== undefined ? String(body.descripcion).trim() || null : undefined;

  if (isNaN(monto) || monto <= 0) {
    return Response.json({ error: "Monto inválido" }, { status: 400 });
  }

  const db = getDb();

  const mov = db
    .prepare("SELECT * FROM movimientos WHERE id = ? AND cliente_id = ?")
    .get(movId, id);

  if (!mov) {
    return Response.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  db.prepare(
    `UPDATE movimientos
     SET monto = ?, descripcion = ?
     WHERE id = ? AND cliente_id = ?`
  ).run(monto, descripcion ?? null, movId, id);

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, movId } = await params;
  const db = getDb();

  const mov = db
    .prepare("SELECT * FROM movimientos WHERE id = ? AND cliente_id = ?")
    .get(movId, id);

  if (!mov) {
    return Response.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  db.prepare("DELETE FROM movimientos WHERE id = ? AND cliente_id = ?").run(movId, id);

  return Response.json({ ok: true });
}
