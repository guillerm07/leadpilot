"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Upload,
  Globe,
  FileSpreadsheet,
} from "lucide-react";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  type LeadStatus,
  type LeadSource,
} from "@/types";
import { formatDate } from "@/lib/utils";
import { ScrapingDialog } from "@/components/leads/scraping-dialog";
import { ImportCsvDialog } from "@/components/leads/import-csv-dialog";
import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { LeadSlideOver } from "@/components/leads/lead-slide-over";
import { updateLeadStatusAction, deleteLeadAction } from "@/app/(dashboard)/leads/actions";

// ─── Source labels ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<LeadSource, string> = {
  google_maps: "Google Maps",
  manual: "Manual",
  csv: "CSV",
  linkedin: "LinkedIn",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  companyName: string;
  category: string | null;
  country: string | null;
  email: string | null;
  status: string;
  source: string;
  updatedAt: Date;
  createdAt: Date;
  phone: string | null;
  website: string | null;
  address: string | null;
  emailVerified: boolean;
  emailVerificationResult: string | null;
  googleRating: string | null;
  googleRatingCount: number | null;
  googlePlaceId: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  aiSummary: string | null;
  tags: string[] | null;
  notes: string | null;
  clientId: string;
}

interface LeadScoreData {
  leadId: string;
  score: number;
}

interface LeadsListProps {
  leads: Lead[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentStatus?: string;
  currentSearch?: string;
  clientId: string;
  scores?: LeadScoreData[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadsList({
  leads,
  totalCount,
  currentPage,
  pageSize,
  currentStatus,
  currentSearch,
  clientId,
  scores = [],
}: LeadsListProps) {
  // Build a map for quick score lookups
  const scoreMap = new Map(scores.map((s) => [s.leadId, s.score]));

  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scrapingOpen, setScrapingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Build URL with updated params
  const buildUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `/leads?${qs}` : "/leads";
    },
    [searchParams]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchValue !== (currentSearch ?? "")) {
        startTransition(() => {
          router.push(buildUrl({ search: searchValue || undefined, page: undefined }));
        });
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, currentSearch, router, buildUrl, startTransition]);

  function handleStatusFilter(value: string) {
    const status = value === "__all__" ? undefined : value;
    startTransition(() => {
      router.push(buildUrl({ status, page: undefined }));
    });
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      router.push(buildUrl({ page: page > 1 ? String(page) : undefined }));
    });
  }

  // Selection
  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBulkStatusChange(status: LeadStatus) {
    for (const id of selectedIds) {
      await updateLeadStatusAction(id, status);
    }
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleDelete(leadId: string) {
    await deleteLeadAction(leadId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              placeholder="Buscar por empresa, email o teléfono..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={currentStatus ?? "__all__"}
            onValueChange={(v) => handleStatusFilter(v ?? "__all__")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos los estados">
                {currentStatus
                  ? (LEAD_STATUS_LABELS[currentStatus as LeadStatus] ?? currentStatus)
                  : "Todos"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    Acciones ({selectedIds.size})
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Cambiar estado
                </DropdownMenuItem>
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => handleBulkStatusChange(value as LeadStatus)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Exportar seleccionados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" onClick={() => setScrapingOpen(true)}>
            <Globe className="size-4" data-icon="inline-start" />
            Buscar leads
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" data-icon="inline-start" />
            Importar CSV
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            Añadir manual
          </Button>
        </div>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <FileSpreadsheet className="size-10 text-zinc-300" />
          <h3 className="mt-4 text-sm font-semibold text-zinc-900">
            No hay leads
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Empieza buscando empresas o importando un CSV.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setScrapingOpen(true)}>
              Buscar leads
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)}>
              Importar CSV
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Último contacto</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    data-state={selectedIds.has(lead.id) ? "selected" : undefined}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      // Don't open panel if clicking on checkbox, button, or dropdown
                      const target = e.target as HTMLElement;
                      if (target.closest("button, [role='checkbox'], [role='menuitem'], a")) return;
                      setSelectedLeadId(lead.id);
                      setSlideOverOpen(true);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadId(lead.id);
                          setSlideOverOpen(true);
                        }}
                        className="font-medium text-zinc-900 hover:underline text-left"
                      >
                        {lead.companyName}
                      </button>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {lead.category ?? "-"}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {lead.country ?? "-"}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {lead.email ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={LEAD_STATUS_COLORS[lead.status as LeadStatus] ?? ""}
                        variant="secondary"
                      >
                        {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SOURCE_LABELS[lead.source as LeadSource] ?? lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <LeadScoreBar score={scoreMap.get(lead.id) ?? 0} />
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatDate(lead.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-xs">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setSlideOverOpen(true);
                            }}
                          >
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(lead.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-zinc-500">
                Mostrando {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-2 text-sm text-zinc-400"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => handlePageChange(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ScrapingDialog
        open={scrapingOpen}
        onOpenChange={setScrapingOpen}
        clientId={clientId}
      />
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        clientId={clientId}
      />
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientId={clientId}
      />
      <LeadSlideOver
        leadId={selectedLeadId}
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function LeadScoreBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-500"
      : score >= 40
        ? "bg-yellow-500"
        : score >= 1
          ? "bg-red-400"
          : "bg-zinc-200";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(score, 0)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-zinc-500">{score}</span>
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
