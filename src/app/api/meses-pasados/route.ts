import { getDb, toRows } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  const mes = searchParams.get("mes"); // YYYY-MM

  if (!clienteId || !mes) {
    return Response.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return Response.json({ error: "Formato de mes inválido" }, { status: 400 });
  }

  const db = await getDb();

  const clienteRes = await db.execute({
    sql: "SELECT id, nombre, telefono FROM clientes WHERE id = ?",
    args: [clienteId],
  });
  if (!clienteRes.rows.length) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  const cliente = toRows(clienteRes)[0];

  const movsRes = await db.execute({
    sql: `SELECT fecha, SUM(monto) AS total
          FROM movimientos
          WHERE cliente_id = ?
            AND strftime('%Y-%m', fecha) = ?
          GROUP BY fecha
          ORDER BY fecha ASC`,
    args: [clienteId, mes],
  });

  const totalRes = await db.execute({
    sql: `SELECT COALESCE(SUM(monto), 0) AS total
          FROM movimientos
          WHERE cliente_id = ?
            AND strftime('%Y-%m', fecha) = ?`,
    args: [clienteId, mes],
  });

  const dias = toRows<{ fecha: string; total: number }>(movsRes);
  const totalMes = (toRows(totalRes)[0] as { total: number }).total;

  return Response.json({ cliente, dias, totalMes });
}
