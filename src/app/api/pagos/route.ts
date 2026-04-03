import { getDb, toRows } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ahora = new Date();
  const mesDefault = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const mes = url.searchParams.get("mes") || mesDefault;

  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT
        c.id,
        c.nombre,
        c.telefono,
        COALESCE(SUM(m.monto), 0) AS total_mes,
        p.id AS pago_id,
        p.monto_pagado,
        p.fecha_pago
       FROM clientes c
       LEFT JOIN movimientos m
         ON m.cliente_id = c.id AND strftime('%Y-%m', m.fecha) = ?
       LEFT JOIN pagos p
         ON p.cliente_id = c.id AND p.mes = ?
       GROUP BY c.id
       ORDER BY c.nombre ASC`,
    args: [mes, mes],
  });

  return Response.json(toRows(result));
}

export async function POST(request: Request) {
  const body = await request.json();
  const cliente_id = Number(body.cliente_id);
  const mes = String(body.mes ?? "").trim();
  const monto_pagado = parseFloat(body.monto_pagado);

  if (!cliente_id || !mes || isNaN(monto_pagado) || monto_pagado <= 0) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO pagos (cliente_id, mes, monto_pagado)
     VALUES (?, ?, ?)
     ON CONFLICT(cliente_id, mes)
     DO UPDATE SET monto_pagado = excluded.monto_pagado, fecha_pago = date('now')`,
    args: [cliente_id, mes, monto_pagado],
  });

  return Response.json({ ok: true });
}
