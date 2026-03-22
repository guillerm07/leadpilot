"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Bell, User, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";

// Map route segments to breadcrumb labels
const breadcrumbLabels: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  outreach: "Outreach",
  sequences: "Secuencias",
  templates: "Plantillas",
  inbox: "Bandeja",
  messages: "Mensajes",
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  qualify: "Formularios",
  "landing-pages": "Landing Pages",
  "video-generator": "Video IA",
  audits: "Auditorias",
  analytics: "Analytics",
  clients: "Clientes",
  settings: "Configuracion",
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Only show the first two meaningful segments as breadcrumbs
  const crumbs = segments.slice(0, 2).map((segment) => ({
    label: breadcrumbLabels[segment] ?? segment,
  }));

  if (crumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
          <span
            className={
              idx === crumbs.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }
          >
            {crumb.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Header({ userEmail }: { userEmail?: string }) {
  const router = useRouter();

  const initials = userEmail
    ? userEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "U";

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications placeholder */}
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent outline-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {initials}
            </div>
            {userEmail && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {userEmail.split("@")[0]}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">Mi cuenta</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="size-4" />
              Configuracion
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
