import { getDb } from "@/lib/db";

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

  const db = await getDb();

  await db.batch(
    [
      {
        sql: "DELETE FROM movimientos WHERE cliente_id = ? AND fecha = ?",
        args: [id, fecha],
      },
      {
        sql: "INSERT INTO movimientos (cliente_id, monto, descripcion, fecha) VALUES (?, ?, NULL, ?)",
        args: [id, monto, fecha],
      },
    ],
    "write"
  );

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, fecha } = await params;
  const db = await getDb();

  await db.execute({
    sql: "DELETE FROM movimientos WHERE cliente_id = ? AND fecha = ?",
    args: [id, fecha],
  });

  return Response.json({ ok: true });
}
