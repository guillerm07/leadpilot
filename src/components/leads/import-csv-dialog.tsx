"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { importLeadsAction } from "@/app/(dashboard)/leads/actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

const LEAD_FIELDS: { value: string; label: string }[] = [
  { value: "__ignore__", label: "Ignorar" },
  { value: "companyName", label: "Empresa" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "website", label: "Web" },
  { value: "country", label: "País" },
  { value: "category", label: "Categoría" },
  { value: "address", label: "Dirección" },
  { value: "notes", label: "Notas" },
];

// Auto-detect mapping based on common header names
const AUTO_MAP: Record<string, string> = {
  empresa: "companyName",
  company: "companyName",
  "company name": "companyName",
  nombre: "companyName",
  name: "companyName",
  email: "email",
  "e-mail": "email",
  correo: "email",
  telefono: "phone",
  teléfono: "phone",
  phone: "phone",
  tel: "phone",
  web: "website",
  website: "website",
  "sitio web": "website",
  url: "website",
  pais: "country",
  país: "country",
  country: "country",
  categoria: "category",
  categoría: "category",
  category: "category",
  direccion: "address",
  dirección: "address",
  address: "address",
  notas: "notes",
  notes: "notes",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportCsvDialog({
  open,
  onOpenChange,
  clientId,
}: ImportCsvDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: { row: number; error: string }[];
    total: number;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setImportResult(null);
    setProgress(0);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];

        setCsvHeaders(headers);
        setCsvRows(rows);

        // Auto-map columns
        const autoMapping: Record<string, string> = {};
        for (const header of headers) {
          const normalized = header.toLowerCase().trim();
          if (AUTO_MAP[normalized]) {
            autoMapping[header] = AUTO_MAP[normalized];
          } else {
            autoMapping[header] = "__ignore__";
          }
        }
        setMapping(autoMapping);
        setStep("mapping");
      },
      error() {
        alert("Error al leer el archivo CSV. Verifica que el formato sea correcto.");
      },
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      parseFile(file);
    }
  }

  function updateMapping(csvColumn: string, leadField: string) {
    setMapping((prev) => ({ ...prev, [csvColumn]: leadField }));
  }

  // Check if companyName is mapped
  const hasCompanyMapping = Object.values(mapping).includes("companyName");

  // Transform rows according to mapping
  function getMappedRows(): Record<string, string>[] {
    return csvRows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [csvCol, leadField] of Object.entries(mapping)) {
        if (leadField !== "__ignore__" && row[csvCol]) {
          mapped[leadField] = row[csvCol];
        }
      }
      return mapped;
    });
  }

  function handleImport() {
    setStep("importing");
    setProgress(10);

    const mappedRows = getMappedRows();
    const rows = mappedRows.map((row) => ({
      clientId,
      companyName: row.companyName ?? "",
      email: row.email,
      phone: row.phone,
      website: row.website,
      country: row.country,
      category: row.category,
      address: row.address,
      notes: row.notes,
    }));

    setProgress(30);

    startTransition(async () => {
      try {
        setProgress(50);
        const result = await importLeadsAction(clientId, rows);
        setProgress(100);
        setImportResult(result);
        setStep("done");
      } catch {
        alert("Error al importar leads. Inténtalo de nuevo.");
        setStep("preview");
      }
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Sube un archivo CSV con los datos de los leads."}
            {step === "mapping" && "Mapea las columnas del CSV a los campos de lead."}
            {step === "preview" && "Verifica los datos antes de importar."}
            {step === "importing" && "Importando leads..."}
            {step === "done" && "Importación completada."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-zinc-200"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="size-10 text-zinc-300" />
            <p className="mt-4 text-sm font-medium text-zinc-900">
              Arrastra un archivo CSV aquí
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              o haz clic para seleccionar
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            <p className="text-xs text-zinc-500">
              {csvRows.length} filas detectadas. Mapea cada columna al campo correspondiente.
            </p>
            <div className="space-y-2">
              {csvHeaders.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="flex-1 truncate text-sm font-medium text-zinc-700">
                    {header}
                  </span>
                  <span className="text-xs text-zinc-400">→</span>
                  <Select
                    value={mapping[header] ?? "__ignore__"}
                    onValueChange={(val) => updateMapping(header, val || "__ignore__")}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!hasCompanyMapping && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5" />
                Debes mapear al menos la columna "Empresa".
              </p>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Mostrando las primeras 5 filas de {csvRows.length} totales.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {LEAD_FIELDS.filter(
                      (f) => f.value !== "__ignore__" && Object.values(mapping).includes(f.value)
                    ).map((f) => (
                      <TableHead key={f.value}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedRows()
                    .slice(0, 5)
                    .map((row, i) => (
                      <TableRow key={i}>
                        {LEAD_FIELDS.filter(
                          (f) =>
                            f.value !== "__ignore__" &&
                            Object.values(mapping).includes(f.value)
                        ).map((f) => (
                          <TableCell key={f.value} className="text-zinc-600">
                            {row[f.value] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="py-8">
            <Progress value={progress}>
              <ProgressLabel>Importando...</ProgressLabel>
              <ProgressValue />
            </Progress>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && importResult && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
                <Check className="size-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-zinc-900">
                {importResult.imported} leads importados
              </p>
              {importResult.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {importResult.errors.length} filas con errores
                </p>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border p-3">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-zinc-500">
                    Fila {err.row}: {err.error}
                  </p>
                ))}
                {importResult.errors.length > 10 && (
                  <p className="mt-1 text-xs text-zinc-400">
                    ...y {importResult.errors.length - 10} errores más
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Atrás
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!hasCompanyMapping}
              >
                Vista previa
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Atrás
              </Button>
              <Button onClick={handleImport} disabled={isPending}>
                <FileSpreadsheet className="size-4" data-icon="inline-start" />
                Importar {csvRows.length} leads
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
