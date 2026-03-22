"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateClientIntegrationsAction } from "@/app/(dashboard)/clients/actions";

const integrationsFormSchema = z.object({
  instantlyApiKey: z.string().optional().or(z.literal("")),
  brevoApiKey: z.string().optional().or(z.literal("")),
  brevoSenderEmail: z
    .string()
    .email("Email no válido")
    .optional()
    .or(z.literal("")),
  brevoSenderName: z.string().max(100).optional().or(z.literal("")),
});

type IntegrationsFormData = z.infer<typeof integrationsFormSchema>;

interface ClientIntegrationsFormProps {
  client: {
    id: string;
    instantlyApiKeyEncrypted: string | null;
    brevoApiKeyEncrypted: string | null;
    brevoSenderEmail: string | null;
    brevoSenderName: string | null;
  };
}

function maskKey(encrypted: string | null): string {
  if (!encrypted) return "";
  return "••••••••" + encrypted.slice(-8);
}

function MaskedKeyField({
  label,
  fieldId,
  hasValue,
  maskedValue,
  inputProps,
  error,
}: {
  label: string;
  fieldId: string;
  hasValue: boolean;
  maskedValue: string;
  inputProps: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> };
  error?: string;
}) {
  const [editing, setEditing] = useState(!hasValue);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      {hasValue && !editing ? (
        <div className="flex items-center gap-2">
          <div className="flex h-8 flex-1 items-center rounded-lg border border-input bg-muted/50 px-2.5 text-sm text-muted-foreground">
            {maskedValue}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Input
          id={fieldId}
          type="password"
          placeholder={hasValue ? "Introduce la nueva clave" : "Introduce la clave API"}
          aria-invalid={!!error}
          {...inputProps}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ClientIntegrationsForm({
  client,
}: ClientIntegrationsFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IntegrationsFormData>({
    resolver: zodResolver(integrationsFormSchema),
    defaultValues: {
      instantlyApiKey: "",
      brevoApiKey: "",
      brevoSenderEmail: client.brevoSenderEmail ?? "",
      brevoSenderName: client.brevoSenderName ?? "",
    },
  });

  function onSubmit(data: IntegrationsFormData) {
    startTransition(async () => {
      try {
        await updateClientIntegrationsAction({
          id: client.id,
          instantlyApiKey: data.instantlyApiKey || undefined,
          brevoApiKey: data.brevoApiKey || undefined,
          brevoSenderEmail: data.brevoSenderEmail || undefined,
          brevoSenderName: data.brevoSenderName || undefined,
        });
        toast.success("Guardado correctamente");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al guardar"
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Instantly */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Instantly.ai</h4>
        <p className="text-xs text-muted-foreground">
          API key para campañas de cold email. Se usa para enviar emails a
          través de Instantly.
        </p>
        <MaskedKeyField
          label="API Key"
          fieldId="instantly-api-key"
          hasValue={!!client.instantlyApiKeyEncrypted}
          maskedValue={maskKey(client.instantlyApiKeyEncrypted)}
          inputProps={register("instantlyApiKey")}
          error={errors.instantlyApiKey?.message}
        />
      </div>

      <div className="border-t" />

      {/* Brevo */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Brevo</h4>
        <p className="text-xs text-muted-foreground">
          Para email transaccional e inbound parsing. No usar para cold
          email (viola los ToS de Brevo).
        </p>
        <MaskedKeyField
          label="API Key"
          fieldId="brevo-api-key"
          hasValue={!!client.brevoApiKeyEncrypted}
          maskedValue={maskKey(client.brevoApiKeyEncrypted)}
          inputProps={register("brevoApiKey")}
          error={errors.brevoApiKey?.message}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="brevo-sender-email">Email del remitente</Label>
            <Input
              id="brevo-sender-email"
              type="email"
              placeholder="noreply@tudominio.com"
              {...register("brevoSenderEmail")}
              aria-invalid={!!errors.brevoSenderEmail}
            />
            {errors.brevoSenderEmail && (
              <p className="text-xs text-destructive">
                {errors.brevoSenderEmail.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brevo-sender-name">Nombre del remitente</Label>
            <Input
              id="brevo-sender-name"
              placeholder="Mi Empresa"
              {...register("brevoSenderName")}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar integraciones"}
        </Button>
      </div>
    </form>
  );
}
