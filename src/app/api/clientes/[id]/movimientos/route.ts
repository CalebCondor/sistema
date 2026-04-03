import { getDb, toRows } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();

  const clienteRes = await db.execute({
    sql: "SELECT * FROM clientes WHERE id = ?",
    args: [id],
  });
  if (!clienteRes.rows.length) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  const cliente = toRows(clienteRes)[0];

  const [movRes, totalRes] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM movimientos
             WHERE cliente_id = ?
               AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
             ORDER BY created_at DESC`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(monto), 0) AS total
             FROM movimientos
             WHERE cliente_id = ?
               AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`,
      args: [id],
    }),
  ]);

  const totalMes = (toRows(totalRes)[0] as { total: number }).total;
  return Response.json({ cliente, movimientos: toRows(movRes), totalMes });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const monto = parseFloat(body.monto);
  const descripcion = String(body.descripcion ?? "").trim();

  if (isNaN(monto) || monto <= 0) {
    return Response.json({ error: "Monto inválido" }, { status: 400 });
  }

  const db = await getDb();
  const check = await db.execute({
    sql: "SELECT id FROM clientes WHERE id = ?",
    args: [id],
  });
  if (!check.rows.length) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const ins = await db.execute({
    sql: "INSERT INTO movimientos (cliente_id, monto, descripcion) VALUES (?, ?, ?)",
    args: [id, monto, descripcion || null],
  });

  const movRes = await db.execute({
    sql: "SELECT * FROM movimientos WHERE id = ?",
    args: [Number(ins.lastInsertRowid)],
  });

  return Response.json(toRows(movRes)[0], { status: 201 });
}
