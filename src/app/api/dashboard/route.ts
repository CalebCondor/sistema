import getDb from "@/lib/db";

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
  const db = getDb();
  const meses = getMeses();

  if (clienteId) {
    const stmtCobrado = db.prepare(
      `SELECT COALESCE(SUM(monto), 0) as v FROM movimientos WHERE cliente_id = ? AND strftime('%Y-%m', fecha) = ?`
    );
    const stmtPagado = db.prepare(
      `SELECT monto_pagado as v FROM pagos WHERE cliente_id = ? AND mes = ?`
    );

    const historial = meses.map((mes) => ({
      mes,
      totalCobrado: (stmtCobrado.get(clienteId, mes) as { v: number }).v,
      totalPagado:
        (stmtPagado.get(clienteId, mes) as { v: number } | undefined)?.v ?? 0,
    }));

    return Response.json({ historial });
  }

  const totalClientes = (
    db.prepare("SELECT COUNT(*) as v FROM clientes").get() as { v: number }
  ).v;

  const stmtCobrado = db.prepare(
    `SELECT COALESCE(SUM(monto), 0) as v FROM movimientos WHERE strftime('%Y-%m', fecha) = ?`
  );
  const stmtPagado = db.prepare(
    `SELECT COALESCE(SUM(monto_pagado), 0) as v FROM pagos WHERE mes = ?`
  );
  const stmtPagaron = db.prepare(
    `SELECT COUNT(*) as v FROM pagos WHERE mes = ?`
  );

  const historial = meses.map((mes) => ({
    mes,
    totalCobrado: (stmtCobrado.get(mes) as { v: number }).v,
    totalPagado: (stmtPagado.get(mes) as { v: number }).v,
    clientesPagaron: (stmtPagaron.get(mes) as { v: number }).v,
    totalClientes,
  }));

  return Response.json({ historial });
}
