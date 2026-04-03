"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Users,
  LayoutDashboard,
  CalendarClock,
  Wallet,
} from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Clientes", icon: Users },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meses-pasados", label: "Meses Pasados", icon: CalendarClock },
];

export default function NavHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight hover:opacity-80 transition-opacity">
          <Wallet className="size-5 text-primary" />
          <span>Sistema de Cuentas</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                path === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 px-6 py-5">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <Wallet className="size-5 text-primary" />
                  Sistema de Cuentas
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      path === href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
