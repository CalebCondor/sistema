import { getDb, toRows } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT c.id, c.nombre, c.telefono, c.created_at,
        COALESCE(SUM(m.monto), 0) AS total_mes
       FROM clientes c
       LEFT JOIN movimientos m ON m.cliente_id = c.id
         AND strftime('%Y-%m', m.fecha) = strftime('%Y-%m', 'now')
       GROUP BY c.id
       ORDER BY c.nombre ASC`
  );
  return Response.json(toRows(result));
}

export async function POST(request: Request) {
  const body = await request.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();

  if (!nombre) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const db = await getDb();
  const ins = await db.execute({
    sql: "INSERT INTO clientes (nombre, telefono) VALUES (?, ?)",
    args: [nombre, telefono || null],
  });

  const clienteRes = await db.execute({
    sql: "SELECT * FROM clientes WHERE id = ?",
    args: [Number(ins.lastInsertRowid)],
  });

  return Response.json(toRows(clienteRes)[0], { status: 201 });
}
