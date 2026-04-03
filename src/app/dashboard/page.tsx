"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
type ChartTooltipProps = TooltipProps<number, string> & {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string | number;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface HistorialMes {
  mes: string;
  totalCobrado: number;
  totalPagado: number;
  clientesPagaron?: number;
  totalClientes?: number;
}

interface ClientePago {
  id: number;
  nombre: string;
  telefono: string | null;
  total_mes: number;
  pago_id: number | null;
  monto_pagado: number | null;
  fecha_pago: string | null;
}

interface DiaEntry {
  dia: string;
  total: number;
}

interface DiaFull {
  dia: string;
  cobro: number;
  acumulado: number;
}

interface ClienteBasico {
  id: number;
  nombre: string;
}

interface HistorialPago {
  id: number;
  mes: string;
  monto_pagado: number;
  fecha_pago: string | null;
  cliente_id: number;
  nombre: string;
}

function getMeses(count = 6): string[] {
  const ahora = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function formatMes(mes: string): string {
  const [y, m] = mes.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("es", {
    month: "long",
    year: "numeric",
  });
}


function fmt(n: number): string {
  return n.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type EstadoType = "pagado" | "parcial" | "pendiente" | "sin_cargos";

function estadoPago(c: ClientePago): EstadoType {
  if (c.total_mes === 0) return "sin_cargos";
  if (c.pago_id === null) return "pendiente";
  if ((c.monto_pagado ?? 0) >= c.total_mes) return "pagado";
  return "parcial";
}

function EstadoBadge({ estado }: { estado: EstadoType }) {
  if (estado === "pagado")
    return (
      <Badge className="bg-green-500 hover:bg-green-500 text-white">
        Pagado
      </Badge>
    );
  if (estado === "parcial")
    return (
      <Badge className="bg-orange-500 hover:bg-orange-500 text-white">
        Parcial
      </Badge>
    );
  if (estado === "pendiente")
    return <Badge variant="destructive">Pendiente</Badge>;
  return <Badge variant="secondary">Sin cargos</Badge>;
}

function GraficoTooltip({ active, payload, label }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border bg-card px-3.5 py-3 text-sm shadow-lg">
        <p className="font-semibold mb-2 text-foreground">Día {label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-bold ml-auto pl-4">
              S/ {fmt((p.value as number) ?? 0)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function diasDelMes(mes: string): number {
  const [y, m] = mes.split("-");
  return new Date(Number(y), Number(m), 0).getDate();
}

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring capitalize";

export default function Dashboard() {
  const meses = useMemo(() => getMeses(6), []);
  const [mesSeleccionado, setMesSeleccionado] = useState(
    () => getMeses(6)[0] ?? ""
  );
  const [clienteIdSel, setClienteIdSel] = useState<"total" | number>("total");

  const [clientesLista, setClientesLista] = useState<ClienteBasico[]>([]);
  const [historial, setHistorial] = useState<HistorialMes[]>([]);
  const [clientesPagos, setClientesPagos] = useState<ClientePago[]>([]);
  const [graficoDia, setGraficoDia] = useState<DiaEntry[]>([]);

  const [dialogPago, setDialogPago] = useState<ClientePago | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [historialPagos, setHistorialPagos] = useState<HistorialPago[]>([]);

  // Derived: fill ALL days of month (including zeros) + running accumulated
  const graficoDiaCompleto = useMemo((): DiaFull[] => {
    if (!mesSeleccionado) return [];
    const total = diasDelMes(mesSeleccionado);
    const mapa = new Map(graficoDia.map((d) => [d.dia, d.total]));
    let acum = 0;
    return Array.from({ length: total }, (_, i) => {
      const dia = String(i + 1).padStart(2, "0");
      const cobro = mapa.get(dia) ?? 0;
      acum += cobro;
      return { dia, cobro, acumulado: acum };
    });
  }, [graficoDia, mesSeleccionado]);

  // Load client list once
  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) =>
        setClientesLista(
          data.map((c: ClienteBasico) => ({ id: c.id, nombre: c.nombre }))
        )
      );
  }, []);

  const recargar = useCallback(() => {
    const dashUrl =
      clienteIdSel !== "total"
        ? `/api/dashboard?cliente_id=${clienteIdSel}`
        : `/api/dashboard`;
    const diaUrl =
      clienteIdSel !== "total"
        ? `/api/movimientos-dia?mes=${mesSeleccionado}&cliente_id=${clienteIdSel}`
        : `/api/movimientos-dia?mes=${mesSeleccionado}`;

    fetch(dashUrl)
      .then((r) => r.json())
      .then((d) => setHistorial(d.historial));
    fetch(`/api/pagos?mes=${mesSeleccionado}`)
      .then((r) => r.json())
      .then(setClientesPagos);
    fetch(diaUrl)
      .then((r) => r.json())
      .then(setGraficoDia);
    const histPagosUrl =
      clienteIdSel !== "total"
        ? `/api/pagos/historial?cliente_id=${clienteIdSel}`
        : `/api/pagos/historial`;
    fetch(histPagosUrl)
      .then((r) => r.json())
      .then(setHistorialPagos);
  }, [clienteIdSel, mesSeleccionado]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Derived
  const mesResumen =
    historial.find((h) => h.mes === mesSeleccionado) ?? null;
  const clientePagoActivo =
    clienteIdSel !== "total"
      ? clientesPagos.find((c) => c.id === clienteIdSel) ?? null
      : null;
  const pendiente = Math.max(
    0,
    (mesResumen?.totalCobrado ?? 0) - (mesResumen?.totalPagado ?? 0)
  );
  const clienteNombre =
    clienteIdSel !== "total"
      ? (clientesLista.find((c) => c.id === clienteIdSel)?.nombre ?? "")
      : "";

  async function registrarPago(e: React.FormEvent) {
    e.preventDefault();
    if (!dialogPago) return;
    setGuardando(true);
    await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: dialogPago.id,
        mes: mesSeleccionado,
        monto_pagado: parseFloat(montoPago),
      }),
    });
    setGuardando(false);
    setDialogPago(null);
    recargar();
  }

  async function anularPago(pagoId: number) {
    await fetch(`/api/pagos/${pagoId}`, { method: "DELETE" });
    recargar();
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-10">
      {/* ── CONTROLES ── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Cliente
          </label>
          <select
            value={clienteIdSel === "total" ? "total" : clienteIdSel}
            onChange={(e) =>
              setClienteIdSel(
                e.target.value === "total" ? "total" : Number(e.target.value)
              )
            }
            className={selectClass}
          >
            <option value="total">Todos los clientes</option>
            {clientesLista.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Mes
          </label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className={selectClass}
          >
            {meses.map((m) => (
              <option key={m} value={m} className="capitalize">
                {formatMes(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Separator />

      {/* ── SECCIÓN 1: Resumen del mes ── */}
      <section>
        <h2 className="text-xl font-bold mb-4 capitalize">
          Resumen
          {clienteNombre && (
            <span className="text-muted-foreground font-normal">
              {" "}
              — {clienteNombre}
            </span>
          )}{" "}
          —{" "}
          {mesSeleccionado ? formatMes(mesSeleccionado) : ""}
        </h2>
        <div
          className={cn(
            "grid gap-3",
            clienteIdSel === "total"
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-3"
          )}
        >
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total cobrado
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold tabular-nums">
                S/ {fmt(mesResumen?.totalCobrado ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total pagado
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold tabular-nums text-green-600">
                S/ {fmt(mesResumen?.totalPagado ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pendiente
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  pendiente > 0 ? "text-destructive" : "text-green-600"
                )}
              >
                S/ {fmt(pendiente)}
              </p>
            </CardContent>
          </Card>

          {clienteIdSel === "total" && (
            <Card>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Clientes al día
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-bold tabular-nums">
                  {mesResumen?.clientesPagaron ?? 0}
                  <span className="text-muted-foreground text-base font-normal">
                    /{mesResumen?.totalClientes ?? 0}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Separator />

      {/* ── SECCIÓN 2: Cobros por día ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cobros por día</h2>
          {graficoDiaCompleto.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Promedio diario:{" "}
              <span className="font-semibold text-foreground">
                S/{" "}
                {fmt(
                  graficoDiaCompleto.filter((d) => d.cobro > 0).length > 0
                    ? (mesResumen?.totalCobrado ?? 0) /
                        graficoDiaCompleto.filter((d) => d.cobro > 0).length
                    : 0
                )}
              </span>
            </span>
          )}
        </div>

        {graficoDiaCompleto.every((d) => d.cobro === 0) ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Sin movimientos en{" "}
              <span className="capitalize">{formatMes(mesSeleccionado)}</span>.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="pb-0 pt-5 px-6">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />
                  Cobro del día
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block w-3 h-2 rounded-sm bg-emerald-400 opacity-70" />
                  Acumulado
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-5 px-2">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={graficoDiaCompleto}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                    strokeOpacity={0.7}
                  />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(v) => String(parseInt(v))}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    yAxisId="cobro"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(v: number) =>
                      v === 0 ? "" : `S/${v}`
                    }
                    width={58}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="acum"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(v: number) =>
                      v === 0 ? "" : `S/${v}`
                    }
                    width={58}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GraficoTooltip />} />
                  <Bar
                    yAxisId="cobro"
                    dataKey="cobro"
                    name="Cobro"
                    fill="url(#gradBar)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={28}
                  />
                  <Area
                    yAxisId="acum"
                    type="monotone"
                    dataKey="acumulado"
                    name="Acumulado"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradAcum)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── SECCIÓN 2b: Detalle día a día (sólo por cliente) ── */}
      {clienteIdSel !== "total" && (
        <section>
          <h2 className="text-xl font-bold mb-4">
            Detalle del mes
            {clienteNombre && (
              <span className="text-muted-foreground font-normal ml-2 text-base">
                — {clienteNombre}
              </span>
            )}
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Día</TableHead>
                  <TableHead className="text-right">Cobros del día</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {graficoDiaCompleto.map((d) => (
                  <TableRow
                    key={d.dia}
                    className={cn(
                      d.cobro > 0
                        ? "bg-indigo-50/60 font-medium dark:bg-indigo-950/20"
                        : "text-muted-foreground"
                    )}
                  >
                    <TableCell className="tabular-nums">
                      {parseInt(d.dia)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.cobro > 0 ? (
                        <span className="text-indigo-700 dark:text-indigo-400 font-semibold">
                          S/ {fmt(d.cobro)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        d.cobro > 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""
                      )}
                    >
                      {d.acumulado > 0 ? `S/ ${fmt(d.acumulado)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Fila total */}
                <TableRow className="border-t-2 font-bold bg-muted/40">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums text-indigo-700 dark:text-indigo-400">
                    S/ {fmt(mesResumen?.totalCobrado ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    S/ {fmt(mesResumen?.totalCobrado ?? 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      <Separator />

      {/* ── SECCIÓN 3: Estado de pagos ── */}
      <section>
        <h2 className="text-xl font-bold mb-4">Estado de pagos</h2>

        {clienteIdSel !== "total" ? (
          clientePagoActivo ? (
            <Card>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
                        Total del mes
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        S/ {fmt(clientePagoActivo.total_mes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
                        Pagado
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-green-600">
                        S/ {fmt(clientePagoActivo.monto_pagado ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
                        Pendiente
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-destructive">
                        S/{" "}
                        {fmt(
                          Math.max(
                            0,
                            clientePagoActivo.total_mes -
                              (clientePagoActivo.monto_pagado ?? 0)
                          )
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <EstadoBadge estado={estadoPago(clientePagoActivo)} />
                    {(estadoPago(clientePagoActivo) === "pendiente" ||
                      estadoPago(clientePagoActivo) === "parcial") && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const saldo = Math.max(
                            0,
                            clientePagoActivo.total_mes -
                              (clientePagoActivo.monto_pagado ?? 0)
                          );
                          setDialogPago(clientePagoActivo);
                          setMontoPago(
                            (
                              saldo > 0 ? saldo : clientePagoActivo.total_mes
                            ).toFixed(2)
                          );
                        }}
                      >
                        Registrar pago
                      </Button>
                    )}
                    {clientePagoActivo.pago_id !== null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => anularPago(clientePagoActivo.pago_id!)}
                      >
                        Anular
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                Sin datos para este período.
              </CardContent>
            </Card>
          )
        ) : clientesPagos.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No hay clientes registrados.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total del mes</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesPagos.map((c) => {
                  const estado = estadoPago(c);
                  const saldo = c.total_mes - (c.monto_pagado ?? 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        S/ {fmt(c.total_mes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        S/ {fmt(c.monto_pagado ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        S/ {fmt(saldo > 0 ? saldo : 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <EstadoBadge estado={estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        {(estado === "pendiente" || estado === "parcial") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setDialogPago(c);
                              setMontoPago(
                                (saldo > 0 ? saldo : c.total_mes).toFixed(2)
                              );
                            }}
                          >
                            Registrar pago
                          </Button>
                        )}
                        {(estado === "pagado" || estado === "parcial") &&
                          c.pago_id !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground ml-1"
                              onClick={() => anularPago(c.pago_id!)}
                            >
                              Anular
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <Separator />

      {/* ── SECCIÓN 4: Historial de pagos ── */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Historial de pagos
          {clienteNombre && (
            <span className="text-muted-foreground font-normal text-base ml-2">
              — {clienteNombre}
            </span>
          )}
        </h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {clienteIdSel === "total" && <TableHead>Cliente</TableHead>}
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Monto pagado</TableHead>
                <TableHead>Fecha de pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historialPagos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={clienteIdSel === "total" ? 4 : 3}
                    className="text-center text-muted-foreground py-8"
                  >
                    Sin pagos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                historialPagos.map((p) => (
                  <TableRow key={p.id}>
                    {clienteIdSel === "total" && (
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                    )}
                    <TableCell className="capitalize">{formatMes(p.mes)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-green-600">
                      S/ {fmt(p.monto_pagado)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.fecha_pago
                        ? new Date(p.fecha_pago + "T00:00:00").toLocaleDateString("es", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <Separator />

      {/* ── SECCIÓN 5: Historial de meses ── */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Historial de meses
          {clienteNombre && (
            <span className="text-muted-foreground font-normal text-base ml-2">
              — {clienteNombre}
            </span>
          )}
        </h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Total cobrado</TableHead>
                <TableHead className="text-right">Total pagado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                {clienteIdSel === "total" && (
                  <TableHead className="text-center">Clientes al día</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={clienteIdSel === "total" ? 5 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Sin datos
                  </TableCell>
                </TableRow>
              ) : (
                historial.map((h) => {
                  const pend = h.totalCobrado - h.totalPagado;
                  const todosPagaron =
                    h.clientesPagaron != null &&
                    h.totalClientes != null &&
                    h.clientesPagaron > 0 &&
                    h.clientesPagaron === h.totalClientes;
                  return (
                    <TableRow key={h.mes}>
                      <TableCell className="font-medium capitalize">
                        {formatMes(h.mes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        S/ {fmt(h.totalCobrado)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">
                        S/ {fmt(h.totalPagado)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          pend > 0 ? "text-destructive" : "text-green-600"
                        )}
                      >
                        S/ {fmt(pend > 0 ? pend : 0)}
                      </TableCell>
                      {clienteIdSel === "total" && (
                        <TableCell className="text-center">
                          <Badge
                            variant={todosPagaron ? "default" : "secondary"}
                            className={
                              todosPagaron
                                ? "bg-green-500 hover:bg-green-500 text-white"
                                : ""
                            }
                          >
                            {h.clientesPagaron}/{h.totalClientes}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* ── DIALOG: Registrar pago ── */}
      <Dialog
        open={!!dialogPago}
        onOpenChange={(open) => !open && setDialogPago(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago — {dialogPago?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={registrarPago} className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">
                Total del mes (
                {mesSeleccionado ? formatMes(mesSeleccionado) : ""})
              </span>
              <span className="font-bold tabular-nums">
                S/ {fmt(dialogPago?.total_mes ?? 0)}
              </span>
            </div>
            {dialogPago?.pago_id && (
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">Ya registrado</span>
                <span className="font-bold tabular-nums text-green-600">
                  S/ {fmt(dialogPago?.monto_pagado ?? 0)}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Monto a registrar</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setDialogPago(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  guardando || !montoPago || parseFloat(montoPago) <= 0
                }
              >
                {guardando ? "Guardando..." : "Confirmar pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
