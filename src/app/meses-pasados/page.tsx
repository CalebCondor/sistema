"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Cliente {
  id: number;
  nombre: string;
}

interface DiaRow {
  fecha: string;
  total: number;
}

interface MesData {
  cliente: Cliente;
  dias: DiaRow[];
  totalMes: number;
}

const NOMBRES_MES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIA_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function generarMeses(): { value: string; label: string }[] {
  const inicio = new Date(2026, 0, 1);
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const meses: { value: string; label: string }[] = [];
  const cur = new Date(inicio);
  while (cur <= fin) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    meses.push({
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${NOMBRES_MES[m]} ${y}`,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return meses.reverse();
}

function getDiasDelMes(mes: string): string[] {
  const [y, m] = mes.split("-").map(Number);
  const total = new Date(y, m, 0).getDate();
  const dias: string[] = [];
  for (let d = 1; d <= total; d++) {
    dias.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dias;
}

function formatMonto(n: number) {
  return `S/ ${Number(n).toFixed(2)}`;
}

const MESES = generarMeses();

export default function MesesPasadosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [mes, setMes] = useState<string>(MESES[0]?.value ?? "");
  const [loading, setLoading] = useState(false);

  const [diasData, setDiasData] = useState<Record<string, number>>({});
  const [totalMes, setTotalMes] = useState(0);
  const [clienteNombre, setClienteNombre] = useState("");

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFecha, setDeleteFecha] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const dias = getDiasDelMes(mes);
  const cargarRef = useRef<() => void>(() => {});

  const cargar = useCallback(() => {
    if (!clienteId || !mes) return;
    setLoading(true);
    fetch(`/api/meses-pasados?clienteId=${clienteId}&mes=${mes}`)
      .then((r) => r.json())
      .then((d: MesData) => {
        const map: Record<string, number> = {};
        for (const row of d.dias) map[row.fecha] = row.total;
        setDiasData(map);
        setTotalMes(d.totalMes);
        setClienteNombre(d.cliente.nombre);
        const init: Record<string, string> = {};
        for (const row of d.dias) init[row.fecha] = String(row.total);
        setInputs(init);
      })
      .finally(() => setLoading(false));
  }, [clienteId, mes]);

  cargarRef.current = cargar;

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((rows: Cliente[]) => {
        setClientes(rows);
        if (rows.length > 0) setClienteId(String(rows[0].id));
      });
  }, []);

  useEffect(() => {
    if (clienteId && mes) cargarRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, mes]);

  function setInput(fecha: string, val: string) {
    setInputs((prev) => ({ ...prev, [fecha]: val }));
  }

  async function guardarDia(fecha: string) {
    const val = inputs[fecha] ?? "";
    const monto = parseFloat(val);
    const tieneData = diasData[fecha] !== undefined;

    if (!val.trim() && !tieneData) return;

    if (!val.trim() && tieneData) {
      setDeleteFecha(fecha);
      setDeleteOpen(true);
      return;
    }

    if (isNaN(monto) || monto <= 0) return;

    setSaving((prev) => ({ ...prev, [fecha]: true }));

    if (tieneData) {
      await fetch(`/api/clientes/${clienteId}/dias/${fecha}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto }),
      });
    } else {
      await fetch(`/api/clientes/${clienteId}/movimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto, descripcion: "", fecha }),
      });
    }

    setSaving((prev) => ({ ...prev, [fecha]: false }));
    cargar();
  }

  async function handleDelete() {
    setDeleteLoading(true);
    await fetch(`/api/clientes/${clienteId}/dias/${deleteFecha}`, {
      method: "DELETE",
    });
    setDeleteLoading(false);
    setDeleteOpen(false);
    cargar();
  }

  const mesLabel = MESES.find((m) => m.value === mes)?.label ?? mes;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meses Pasados</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edita los movimientos por día directamente en la tabla.
        </p>
      </div>

      {/* Selectores */}
      <Card>
        <CardContent className="pt-5 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {clientes.length === 0 && <option value="">Sin clientes</option>}
              {clientes.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
      )}

      {!loading && clienteId && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{clienteNombre}</p>
              <p className="text-sm text-muted-foreground">{mesLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total del mes</p>
              <p className="text-xl font-bold text-primary">{formatMonto(totalMes)}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Día</TableHead>
                <TableHead className="w-14">Sem.</TableHead>
                <TableHead>Monto (S/)</TableHead>
                <TableHead className="w-28 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dias.map((fecha) => {
                const d = parseInt(fecha.split("-")[2]);
                const diaSem = DIA_SEMANA[new Date(fecha + "T00:00:00").getDay()];
                const tieneData = diasData[fecha] !== undefined;
                const inputVal = inputs[fecha] ?? "";
                const isSaving = saving[fecha] ?? false;
                const changed = tieneData
                  ? inputVal !== String(diasData[fecha])
                  : inputVal.trim() !== "";

                return (
                  <TableRow key={fecha} className={tieneData ? "" : "opacity-50"}>
                    <TableCell className="font-medium tabular-nums">{d}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{diaSem}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="—"
                        value={inputVal}
                        onChange={(e) => setInput(fecha, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void guardarDia(fecha);
                        }}
                        className="h-8 w-32 text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {changed && (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={isSaving}
                            onClick={() => void guardarDia(fecha)}
                          >
                            {isSaving ? "..." : "Guardar"}
                          </Button>
                        )}
                        {tieneData && !changed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteFecha(fecha);
                              setDeleteOpen(true);
                            }}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar día?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los movimientos del día{" "}
              <strong>
                {deleteFecha
                  ? `${deleteFecha.split("-")[2]}/${deleteFecha.split("-")[1]}/${deleteFecha.split("-")[0]}`
                  : ""}
              </strong>
              . Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
