import getDb from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ahora = new Date();
  const mesDefault = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const mes = url.searchParams.get("mes") || mesDefault;
  const clienteId = url.searchParams.get("cliente_id");

  const db = getDb();

  let rows: { dia: string; total: number }[];

  if (clienteId) {
    rows = db
      .prepare(
        `SELECT strftime('%d', fecha) AS dia, SUM(monto) AS total
         FROM movimientos
         WHERE strftime('%Y-%m', fecha) = ? AND cliente_id = ?
         GROUP BY dia ORDER BY dia`
      )
      .all(mes, clienteId) as { dia: string; total: number }[];
  } else {
    rows = db
      .prepare(
        `SELECT strftime('%d', fecha) AS dia, SUM(monto) AS total
         FROM movimientos
         WHERE strftime('%Y-%m', fecha) = ?
         GROUP BY dia ORDER BY dia`
      )
      .all(mes) as { dia: string; total: number }[];
  }

  return Response.json(rows);
}
