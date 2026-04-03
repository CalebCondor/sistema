import getDb from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const cliente = db
    .prepare("SELECT * FROM clientes WHERE id = ?")
    .get(id);

  if (!cliente) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const movimientos = db
    .prepare(
      `SELECT * FROM movimientos
       WHERE cliente_id = ?
         AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
       ORDER BY created_at DESC`
    )
    .all(id);

  const totalMes = db
    .prepare(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM movimientos
       WHERE cliente_id = ?
         AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`
    )
    .get(id) as { total: number };

  return Response.json({ cliente, movimientos, totalMes: totalMes.total });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const monto = parseFloat(body.monto);
  const descripcion = String(body.descripcion ?? "").trim();

  if (isNaN(monto) || monto <= 0) {
    return Response.json({ error: "Monto inválido" }, { status: 400 });
  }

  const db = getDb();

  const cliente = db.prepare("SELECT id FROM clientes WHERE id = ?").get(id);
  if (!cliente) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const result = db
    .prepare(
      "INSERT INTO movimientos (cliente_id, monto, descripcion) VALUES (?, ?, ?)"
    )
    .run(id, monto, descripcion || null);

  const movimiento = db
    .prepare("SELECT * FROM movimientos WHERE id = ?")
    .get(result.lastInsertRowid);

  return Response.json(movimiento, { status: 201 });
}
