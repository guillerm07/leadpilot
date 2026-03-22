"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  Inbox,
  MessageSquare,
  ClipboardList,
  DollarSign,
  Megaphone,
  Video,
  Globe,
  ShieldCheck,
  BarChart3,
  Zap,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClient } from "@/components/layout/client-provider";
import { signOut } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// ─── Navigation structure ───────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/leads", icon: Users },
    ],
  },
  {
    label: "Outreach",
    items: [
      { label: "Secuencias", href: "/outreach/sequences", icon: Send },
      { label: "Plantillas", href: "/outreach/templates", icon: FileText },
      { label: "Bandeja", href: "/outreach/inbox", icon: Inbox },
      { label: "Mensajes", href: "/outreach/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Google Ads", href: "/google-ads", icon: DollarSign },
      { label: "Meta Ads", href: "/meta-ads", icon: Megaphone },
      { label: "Formularios", href: "/qualify", icon: ClipboardList },
      { label: "Landing Pages", href: "/landing-pages", icon: Globe },
      { label: "Video IA", href: "/video-generator", icon: Video },
    ],
  },
  {
    label: "Analisis",
    items: [
      { label: "Auditorias", href: "/audits", icon: ShieldCheck },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Workflows", href: "/workflows", icon: Zap },
    ],
  },
  {
    label: "Configuracion",
    items: [
      { label: "Clientes", href: "/clients", icon: Building2 },
      { label: "Configuracion", href: "/settings", icon: Settings },
    ],
  },
];

// ─── NavLink ────────────────────────────────────────────────────────────────

function NavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-white/15 text-white font-medium"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={linkContent} />
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

// ─── Client selector ────────────────────────────────────────────────────────

function ClientSelector({ collapsed }: { collapsed: boolean }) {
  const { clients, activeClient, setActiveClient } = useClient();
  const [open, setOpen] = useState(false);

  const initials = activeClient
    ? activeClient.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="flex justify-center px-2 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">
                {initials}
              </div>
            </div>
          }
        />
        <TooltipContent side="right" sideOffset={12}>
          {activeClient?.name ?? "Sin clientes"}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-[10px] font-bold text-slate-400">
            --
          </div>
          <span className="text-sm text-slate-400">Sin clientes</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-3 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <span className="w-full truncate text-left text-sm font-medium text-white">
            {activeClient?.name ?? "Seleccionar"}
          </span>
          <span className="text-[11px] text-slate-400">Cliente activo</span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
            {clients.map((client) => {
              const isSelected = client.id === activeClient?.id;
              const clientInitials = client.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <button
                  key={client.id}
                  onClick={() => {
                    setActiveClient(client);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600/80 text-[10px] font-bold text-white">
                    {clientInitials}
                  </div>
                  <span className="truncate">{client.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Search trigger ─────────────────────────────────────────────────────────

function SearchTrigger({ collapsed }: { collapsed: boolean }) {
  const openCommandPalette = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
    );
  }, []);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={openCommandPalette}
              className="flex w-full justify-center px-2 py-1"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                <Search className="h-5 w-5" />
              </div>
            </button>
          }
        />
        <TooltipContent side="right" sideOffset={12}>
          Buscar (Ctrl+K)
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="px-3 pb-2">
      <button
        onClick={openCommandPalette}
        className="flex w-full items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="hidden rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
          Ctrl+K
        </kbd>
      </button>
    </div>
  );
}

// ─── User section ───────────────────────────────────────────────────────────

function UserSection({
  collapsed,
  userEmail,
}: {
  collapsed: boolean;
  userEmail?: string;
}) {
  const initials = userEmail
    ? userEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "U";

  const displayName = userEmail ? userEmail.split("@")[0] : "Usuario";

  if (collapsed) {
    return (
      <div className="space-y-1 p-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
                  {initials}
                </div>
              </div>
            }
          />
          <TooltipContent side="right" sideOffset={12}>
            {displayName}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full justify-center rounded-lg px-3 py-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
              </button>
            }
          />
          <TooltipContent side="right" sideOffset={12}>
            Cerrar sesion
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-slate-200">
            {displayName}
          </span>
          {userEmail && (
            <span className="truncate text-[11px] text-slate-500">
              {userEmail}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Cerrar sesion</span>
      </button>
    </div>
  );
}

// ─── Main Sidebar ───────────────────────────────────────────────────────────

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-full flex-col bg-slate-900 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-slate-800",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              LP
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight text-white">
                LeadPilot
              </span>
            )}
          </Link>
        </div>

        {/* Client selector */}
        <ClientSelector collapsed={collapsed} />

        {/* Search */}
        <SearchTrigger collapsed={collapsed} />

        {/* Navigation groups */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 pb-2">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Divider between groups */}
              {groupIdx > 0 && (
                <div className="my-2 h-px bg-slate-800" />
              )}

              {/* Group label */}
              {!collapsed && (
                <div className="mb-1 px-3 pt-2 text-[11px] font-medium uppercase tracking-widest text-slate-500">
                  {group.label}
                </div>
              )}

              {/* Group items */}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800">
          <UserSection collapsed={collapsed} userEmail={userEmail} />
        </div>

        {/* Collapse toggle + version */}
        <div
          className={cn(
            "flex items-center border-t border-slate-800 px-2 py-2",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          {!collapsed && (
            <span className="pr-1 text-[10px] text-slate-600">v0.1</span>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
