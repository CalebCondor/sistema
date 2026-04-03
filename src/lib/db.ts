import { createClient } from "@libsql/client";
import type { ResultSet } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS movimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        monto REAL NOT NULL,
        descripcion TEXT,
        fecha TEXT NOT NULL DEFAULT (date('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        mes TEXT NOT NULL,
        monto_pagado REAL NOT NULL,
        fecha_pago TEXT NOT NULL DEFAULT (date('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(cliente_id, mes)
      )`,
    ],
    "write"
  );
  schemaReady = true;
}

export function toRows<T = Record<string, unknown>>(result: ResultSet): T[] {
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
  ) as T[];
}

export async function getDb() {
  await ensureSchema();
  return db;
}
