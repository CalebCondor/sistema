"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function NavHeader() {
  const path = usePathname();

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold text-base tracking-tight">
          Sistema de Cuentas
        </span>
        <nav className="flex gap-1">
          <Link
            href="/"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              path === "/"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Clientes
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              path === "/dashboard"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
