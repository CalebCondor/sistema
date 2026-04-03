import getDb from "@/lib/db";

export async function GET() {
  const db = getDb();
  const clientes = db
    .prepare(
      `SELECT c.id, c.nombre, c.telefono, c.created_at,
        COALESCE(SUM(m.monto), 0) AS total_mes
       FROM clientes c
       LEFT JOIN movimientos m ON m.cliente_id = c.id
         AND strftime('%Y-%m', m.fecha) = strftime('%Y-%m', 'now')
       GROUP BY c.id
       ORDER BY c.nombre ASC`
    )
    .all();
  return Response.json(clientes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();

  if (!nombre) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare("INSERT INTO clientes (nombre, telefono) VALUES (?, ?)")
    .run(nombre, telefono || null);

  const cliente = db
    .prepare("SELECT * FROM clientes WHERE id = ?")
    .get(result.lastInsertRowid);

  return Response.json(cliente, { status: 201 });
}
