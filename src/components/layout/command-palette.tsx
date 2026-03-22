"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  Inbox,
  ClipboardList,
  DollarSign,
  Megaphone,
  Video,
  Globe,
  ShieldCheck,
  BarChart3,
  Building2,
  Settings,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { useClient } from "@/components/layout/client-provider";

// ─── Navigation items ────────────────────────────────────────────────────────

interface NavEntry {
  label: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
}

const navigationItems: NavEntry[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "GD" },
  { label: "Leads", href: "/leads", icon: Users, shortcut: "GL" },
  { label: "Secuencias", href: "/outreach/sequences", icon: Send, shortcut: "GS" },
  { label: "Plantillas", href: "/outreach/templates", icon: FileText, shortcut: "GT" },
  { label: "Bandeja", href: "/outreach/inbox", icon: Inbox, shortcut: "GI" },
  { label: "Formularios", href: "/qualify", icon: ClipboardList },
  { label: "Google Ads", href: "/google-ads", icon: DollarSign },
  { label: "Meta Ads", href: "/meta-ads", icon: Megaphone },
  { label: "Landing Pages", href: "/landing-pages", icon: Globe },
  { label: "Video IA", href: "/video-generator", icon: Video },
  { label: "Auditorias", href: "/audits", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Clientes", href: "/clients", icon: Building2 },
  { label: "Configuracion", href: "/settings", icon: Settings },
];

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
}

const quickActions: QuickAction[] = [
  { label: "Nuevo cliente", href: "/clients?action=create", icon: Plus },
  { label: "Nuevo lead", href: "/leads?action=create", icon: Plus },
  { label: "Nueva secuencia", href: "/outreach/sequences?action=create", icon: Plus },
  { label: "Nueva plantilla", href: "/outreach/templates?action=create", icon: Plus },
  { label: "Nuevo formulario", href: "/qualify?action=create", icon: Plus },
  { label: "Nueva landing page", href: "/landing-pages?action=create", icon: Plus },
];

// ─── Search result type ──────────────────────────────────────────────────────

interface SearchLead {
  id: string;
  companyName: string;
  email: string | null;
  status: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchLead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { activeClient } = useClient();

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search for leads
  const searchLeads = useCallback(
    async (query: string) => {
      if (!query.trim() || !activeClient) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          clientId: activeClient.id,
          search: query,
          limit: "8",
        });
        const res = await fetch(`/api/leads?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(
            (json.data ?? []).map((l: Record<string, unknown>) => ({
              id: l.id as string,
              companyName: l.companyName as string,
              email: l.email as string | null,
              status: l.status as string,
            }))
          );
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [activeClient]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      searchLeads(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchLeads]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [open]);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Paleta de comandos"
      description="Busca paginas, acciones o leads..."
    >
      <Command shouldFilter={searchResults.length === 0 && !isSearching}>
        <CommandInput
          placeholder="Buscar paginas, acciones o leads..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Buscando..." : "No se encontraron resultados."}
          </CommandEmpty>

          {/* Lead search results */}
          {searchResults.length > 0 && (
            <CommandGroup heading="Leads">
              {searchResults.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={`lead-${lead.id}-${lead.companyName}`}
                  onSelect={() => handleSelect(`/leads/${lead.id}`)}
                >
                  <Search className="size-4 shrink-0 text-zinc-400" />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{lead.companyName}</span>
                    {lead.email && (
                      <span className="truncate text-xs text-zinc-400">
                        {lead.email}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-zinc-300" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Navigation */}
          <CommandGroup heading="Navegacion">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`nav-${item.label}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Icon className="size-4 shrink-0 text-zinc-400" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Quick actions */}
          <CommandGroup heading="Acciones rapidas">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.href}
                  value={`action-${action.label}`}
                  onSelect={() => handleSelect(action.href)}
                >
                  <Icon className="size-4 shrink-0 text-zinc-400" />
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
