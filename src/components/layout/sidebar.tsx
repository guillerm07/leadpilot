"use client";

import { useState } from "react";
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
  Building2,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut } from "next-auth/react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
];

const outreachGroup: NavGroup = {
  label: "Outreach",
  icon: Send,
  items: [
    { label: "Secuencias", href: "/outreach/sequences", icon: Send },
    { label: "Plantillas", href: "/outreach/templates", icon: FileText },
    { label: "Bandeja", href: "/outreach/inbox", icon: Inbox },
    { label: "Mensajes", href: "/outreach/messages", icon: MessageSquare },
  ],
};

const moduleNavItems: NavItem[] = [
  { label: "Formularios", href: "/qualify", icon: ClipboardList },
  { label: "Google Ads", href: "/google-ads", icon: DollarSign },
  { label: "Meta Ads", href: "/meta-ads", icon: Megaphone },
  { label: "Video IA", href: "/video-generator", icon: Video },
  { label: "Landing Pages", href: "/landing-pages", icon: Globe },
  { label: "Auditorias", href: "/audits", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const bottomNavItems: NavItem[] = [
  { label: "Clientes", href: "/clients", icon: Building2 },
  { label: "Configuracion", href: "/settings", icon: Settings },
];

function NavLink({
  item,
  collapsed,
  nested = false,
}: {
  item: NavItem;
  collapsed: boolean;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        nested && !collapsed && "pl-10",
        isActive
          ? "bg-zinc-800 text-white"
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
      )}
    >
      <Icon className={cn("shrink-0", collapsed ? "size-5" : "size-4")} />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={linkContent} />
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function OutreachSection({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(pathname.startsWith("/outreach"));
  const isActive = pathname.startsWith("/outreach");
  const Icon = outreachGroup.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/outreach/sequences"
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <Icon className="size-5 shrink-0" />
            </Link>
          }
        />
        <TooltipContent side="right" sideOffset={8}>
          {outreachGroup.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          isActive
            ? "text-white"
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{outreachGroup.label}</span>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-zinc-500" />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="mt-1 space-y-0.5">
          {outreachGroup.items.map((item) => (
            <NavLink key={item.href} item={item} collapsed={false} nested />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-full flex-col bg-zinc-900 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-white font-bold text-zinc-900 text-sm">
              LP
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight">
                LeadPilot
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex size-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200",
              collapsed && "mx-auto"
            )}
          >
            <ChevronLeft
              className={cn(
                "size-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {/* Main items: Dashboard + Leads */}
          <div className="space-y-0.5">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>

          {/* Outreach expandable section */}
          <div className="mt-1">
            <OutreachSection collapsed={collapsed} />
          </div>

          {/* Module items: Formularios, Google Ads, Meta Ads, Video IA, Landing Pages, Auditorias, Analytics */}
          <div className="mt-1 space-y-0.5">
            {moduleNavItems.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>

          {/* Separator */}
          <div className="my-3 h-px bg-zinc-800" />

          {/* Bottom items: Clientes + Configuracion */}
          <div className="space-y-0.5">
            {bottomNavItems.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-2 space-y-1">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
                  >
                    <LogOut className="size-5 shrink-0" />
                  </button>
                }
              />
              <TooltipContent side="right" sideOffset={8}>
                Cerrar sesion
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
              >
                <LogOut className="size-4 shrink-0" />
                <span className="truncate">Cerrar sesion</span>
              </button>
              <p className="px-3 py-1 text-[10px] text-zinc-600">
                LeadPilot v0.1
              </p>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
