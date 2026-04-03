"use client";

import { useEffect, useState, useRef } from "react";
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
  telefono: string | null;
  total_mes: number;
}

interface Movimiento {
  id: number;
  cliente_id: number;
  monto: number;
  descripcion: string | null;
  fecha: string;
  created_at: string;
}

export default function Home() {
  const [vista, setVista] = useState<"lista" | "cuenta">("lista");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [totalMes, setTotalMes] = useState(0);

  // Dialog nuevo cliente
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Input monto
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const montoRef = useRef<HTMLInputElement>(null);

  // Dialog editar movimiento
  const [editando, setEditando] = useState<Movimiento | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // AlertDialog confirmación genérica
  const [confirmacion, setConfirmacion] = useState<{
    titulo: string;
    descripcion: string;
    onConfirm: () => void;
  } | null>(null);

  const [mesActual] = useState(() => {
    const ahora = new Date();
    return ahora.toLocaleString("es", { month: "long", year: "numeric" });
  });

  async function cargarClientes() {
    const res = await fetch("/api/clientes");
    const data = await res.json();
    setClientes(data);
  }

  async function cargarMovimientos(clienteId: number) {
    const res = await fetch(`/api/clientes/${clienteId}/movimientos`);
    const data = await res.json();
    setMovimientos(data.movimientos);
    setTotalMes(data.totalMes);
  }

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => setClientes(data));
  }, []);

  function abrirCuenta(cliente: Cliente) {
    setClienteActivo(cliente);
    setMovimientos([]);
    setTotalMes(0);
    setMonto("");
    setDescripcion("");
    setVista("cuenta");
    cargarMovimientos(cliente.id);
  }

  function volverALista() {
    cargarClientes();
    setVista("lista");
    setClienteActivo(null);
    setMovimientos([]);
  }

  async function agregarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteActivo) return;
    const valor = parseFloat(monto);
    if (isNaN(valor) || valor <= 0) return;

    await fetch(`/api/clientes/${clienteActivo.id}/movimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: valor, descripcion }),
    });

    setMonto("");
    setDescripcion("");
    montoRef.current?.focus();
    await cargarMovimientos(clienteActivo.id);
  }

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setGuardando(true);
    await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono }),
    });
    setNuevoNombre("");
    setNuevoTelefono("");
    setGuardando(false);
    setDialogAbierto(false);
    await cargarClientes();
  }

  function formatMonto(n: number) {
    return n.toLocaleString("es", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatHora(isoStr: string) {
    const d = new Date(isoStr + "Z");
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  function abrirEdicion(m: Movimiento) {
    setEditando(m);
    setEditMonto(m.monto.toFixed(2));
    setEditDescripcion(m.descripcion ?? "");
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando || !clienteActivo) return;
    setGuardandoEdit(true);
    await fetch(`/api/clientes/${clienteActivo.id}/movimientos/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: parseFloat(editMonto), descripcion: editDescripcion }),
    });
    setGuardandoEdit(false);
    setEditando(null);
    await cargarMovimientos(clienteActivo.id);
  }

  async function eliminarMovimiento(movId: number) {
    if (!clienteActivo) return;
    setConfirmacion({
      titulo: "Eliminar cobro",
      descripcion: "¿Estás seguro de que deseas eliminar este cobro? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        await fetch(`/api/clientes/${clienteActivo.id}/movimientos/${movId}`, {
          method: "DELETE",
        });
        await cargarMovimientos(clienteActivo.id);
      },
    });
  }

  // ── VISTA LISTA ──────────────────────────────────────────────────────────────
  if (vista === "lista") {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
              <p className="text-muted-foreground text-sm capitalize">
                {mesActual}
              </p>
            </div>
            <Button onClick={() => setDialogAbierto(true)}>
              + Nuevo cliente
            </Button>
          </div>

          {clientes.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center text-muted-foreground">
                No hay clientes registrados.
                <br />
                Crea el primero con el botón de arriba.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {clientes.map((c) => (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => abrirCuenta(c)}
                >
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div>
                      <p className="font-semibold text-base">{c.nombre}</p>
                      {c.telefono && (
                        <p className="text-xs text-muted-foreground">
                          {c.telefono}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      S/ {formatMonto(c.total_mes)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Dialog nuevo cliente */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={crearCliente} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre del cliente"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  placeholder="(Opcional)"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDialogAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={guardando || !nuevoNombre.trim()}>
                  {guardando ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  // ── VISTA CUENTA ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background p-4 md:p-8 flex flex-col">
      <div className="max-w-xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="sm" onClick={volverALista}>
            ← Volver
          </Button>
          <div>
            <h1 className="text-xl font-bold">{clienteActivo?.nombre}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {mesActual}
            </p>
          </div>
        </div>

        {/* Formulario de carga */}
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agregar cobro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={agregarMovimiento} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  ref={montoRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="text-xl font-bold w-36"
                  autoFocus
                  required
                />
                <Input
                  placeholder="Descripción (opcional)"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button type="submit" disabled={!monto || parseFloat(monto) <= 0}>
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Total del mes */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm font-medium text-muted-foreground">
            Total del mes
          </span>
          <span className="text-2xl font-bold tabular-nums">
            S/ {formatMonto(totalMes)}
          </span>
        </div>

        <Separator className="mb-4" />

        {/* Movimientos */}
        {movimientos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Sin movimientos este mes.
          </div>
        ) : (
          <Card className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatHora(m.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.descripcion ?? (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      S/ {formatMonto(m.monto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => abrirEdicion(m)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => eliminarMovimiento(m.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Acumulado visible al final */}
        {movimientos.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Badge variant="secondary" className="text-base px-4 py-2">
              Total: S/ {formatMonto(totalMes)}
            </Badge>
          </div>
        )}
      </div>

      {/* Dialog editar movimiento */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cobro</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarEdicion} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Monto *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={editMonto}
                onChange={(e) => setEditMonto(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                placeholder="(Opcional)"
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardandoEdit || !editMonto || parseFloat(editMonto) <= 0}
              >
                {guardandoEdit ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog confirmación */}
      <AlertDialog
        open={!!confirmacion}
        onOpenChange={(open) => !open && setConfirmacion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmacion?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmacion?.descripcion}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmacion?.onConfirm()}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}


