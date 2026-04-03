import { getDb, toRows } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clienteId = url.searchParams.get("cliente_id");

  const db = await getDb();

  const result = clienteId
    ? await db.execute({
        sql: `SELECT p.id, p.mes, p.monto_pagado, p.fecha_pago,
                     c.id AS cliente_id, c.nombre
              FROM pagos p
              JOIN clientes c ON c.id = p.cliente_id
              WHERE p.cliente_id = ?
              ORDER BY p.fecha_pago DESC, p.mes DESC`,
        args: [clienteId],
      })
    : await db.execute(
        `SELECT p.id, p.mes, p.monto_pagado, p.fecha_pago,
                c.id AS cliente_id, c.nombre
         FROM pagos p
         JOIN clientes c ON c.id = p.cliente_id
         ORDER BY p.fecha_pago DESC, p.mes DESC`
      );

  return Response.json(toRows(result));
}
