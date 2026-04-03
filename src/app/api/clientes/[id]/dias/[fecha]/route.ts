import getDb from "@/lib/db";

interface Params {
  params: Promise<{ id: string; fecha: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id, fecha } = await params;
  const body = await request.json();
  const monto = parseFloat(body.monto);

  if (isNaN(monto) || monto <= 0) {
    return Response.json({ error: "Monto inválido" }, { status: 400 });
  }

  const db = getDb();

  db.transaction(() => {
    db.prepare(
      "DELETE FROM movimientos WHERE cliente_id = ? AND fecha = ?"
    ).run(id, fecha);

    db.prepare(
      "INSERT INTO movimientos (cliente_id, monto, descripcion, fecha) VALUES (?, ?, NULL, ?)"
    ).run(id, monto, fecha);
  })();

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, fecha } = await params;
  const db = getDb();

  db.prepare(
    "DELETE FROM movimientos WHERE cliente_id = ? AND fecha = ?"
  ).run(id, fecha);

  return Response.json({ ok: true });
}
