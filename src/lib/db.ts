import { createClient } from "@libsql/client";
import type { Client, ResultSet } from "@libsql/client";

let db: Client | null = null;
let schemaReady = false;

function getClient(): Client {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return db;
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await getClient().batch(
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

export async function getDb(): Promise<Client> {
  await ensureSchema();
  return getClient();
}
