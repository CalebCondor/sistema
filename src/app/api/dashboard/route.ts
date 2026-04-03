import { getDb, toRows } from "@/lib/db";

function getMeses(): string[] {
  const ahora = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clienteId = url.searchParams.get("cliente_id");
  const db = await getDb();
  const meses = getMeses();

  if (clienteId) {
    const historial = await Promise.all(
      meses.map(async (mes) => {
        const [cobradoRes, pagadoRes] = await Promise.all([
          db.execute({
            sql: `SELECT COALESCE(SUM(monto), 0) AS v FROM movimientos WHERE cliente_id = ? AND strftime('%Y-%m', fecha) = ?`,
            args: [clienteId, mes],
          }),
          db.execute({
            sql: `SELECT monto_pagado AS v FROM pagos WHERE cliente_id = ? AND mes = ?`,
            args: [clienteId, mes],
          }),
        ]);
        return {
          mes,
          totalCobrado: (toRows(cobradoRes)[0] as { v: number }).v,
          totalPagado: (toRows(pagadoRes)[0] as { v: number })?.v ?? 0,
        };
      })
    );
    return Response.json({ historial });
  }

  const totalClientes = (
    toRows(await db.execute("SELECT COUNT(*) AS v FROM clientes"))[0] as { v: number }
  ).v;

  const historial = await Promise.all(
    meses.map(async (mes) => {
      const [cobradoRes, pagadoRes, pagaronRes] = await Promise.all([
        db.execute({
          sql: `SELECT COALESCE(SUM(monto), 0) AS v FROM movimientos WHERE strftime('%Y-%m', fecha) = ?`,
          args: [mes],
        }),
        db.execute({
          sql: `SELECT COALESCE(SUM(monto_pagado), 0) AS v FROM pagos WHERE mes = ?`,
          args: [mes],
        }),
        db.execute({
          sql: `SELECT COUNT(*) AS v FROM pagos WHERE mes = ?`,
          args: [mes],
        }),
      ]);
      return {
        mes,
        totalCobrado: (toRows(cobradoRes)[0] as { v: number }).v,
        totalPagado: (toRows(pagadoRes)[0] as { v: number }).v,
        clientesPagaron: (toRows(pagaronRes)[0] as { v: number }).v,
        totalClientes,
      };
    })
  );

  return Response.json({ historial });
}
