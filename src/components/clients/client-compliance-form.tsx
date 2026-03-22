"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateComplianceAction } from "@/app/(dashboard)/clients/actions";

const complianceFormSchema = z.object({
  listaRobinsonEnabled: z.boolean(),
  unsubscribeUrlTemplate: z
    .string()
    .url("Introduce una URL válida")
    .optional()
    .or(z.literal("")),
  senderPhysicalAddress: z.string().max(500).optional().or(z.literal("")),
  privacyPolicyUrl: z
    .string()
    .url("Introduce una URL válida")
    .optional()
    .or(z.literal("")),
  dpoContactEmail: z
    .string()
    .email("Email no válido")
    .optional()
    .or(z.literal("")),
});

type ComplianceFormData = z.infer<typeof complianceFormSchema>;

interface ClientComplianceFormProps {
  clientId: string;
  compliance: {
    listaRobinsonEnabled: boolean;
    unsubscribeUrlTemplate: string | null;
    senderPhysicalAddress: string | null;
    privacyPolicyUrl: string | null;
    dpoContactEmail: string | null;
  } | null;
}

export function ClientComplianceForm({
  clientId,
  compliance,
}: ClientComplianceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ComplianceFormData>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: {
      listaRobinsonEnabled: compliance?.listaRobinsonEnabled ?? false,
      unsubscribeUrlTemplate: compliance?.unsubscribeUrlTemplate ?? "",
      senderPhysicalAddress: compliance?.senderPhysicalAddress ?? "",
      privacyPolicyUrl: compliance?.privacyPolicyUrl ?? "",
      dpoContactEmail: compliance?.dpoContactEmail ?? "",
    },
  });

  function onSubmit(data: ComplianceFormData) {
    setServerError(null);
    setSuccessMessage(false);
    startTransition(async () => {
      try {
        await updateComplianceAction({
          clientId,
          listaRobinsonEnabled: data.listaRobinsonEnabled,
          unsubscribeUrlTemplate: data.unsubscribeUrlTemplate || undefined,
          senderPhysicalAddress: data.senderPhysicalAddress || undefined,
          privacyPolicyUrl: data.privacyPolicyUrl || undefined,
          dpoContactEmail: data.dpoContactEmail || undefined,
        });
        setSuccessMessage(true);
        router.refresh();
        setTimeout(() => setSuccessMessage(false), 3000);
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "Error al actualizar compliance"
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          Compliance actualizado correctamente.
        </div>
      )}

      {/* Lista Robinson */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="lista-robinson" className="text-sm font-medium">
            Lista Robinson
          </Label>
          <p className="text-xs text-muted-foreground">
            Comprobar la Lista Robinson antes de enviar comunicaciones
            comerciales (obligatorio en España).
          </p>
        </div>
        <Controller
          name="listaRobinsonEnabled"
          control={control}
          render={({ field }) => (
            <Switch
              id="lista-robinson"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Unsubscribe URL */}
      <div className="space-y-1.5">
        <Label htmlFor="unsubscribe-url">URL de baja (unsubscribe)</Label>
        <p className="text-xs text-muted-foreground">
          URL a la que apuntará el enlace de baja en los emails. Usa
          {" {"}lead_id{"}"} como placeholder para el ID del lead.
        </p>
        <Input
          id="unsubscribe-url"
          placeholder="https://tudominio.com/unsubscribe?id={lead_id}"
          {...register("unsubscribeUrlTemplate")}
          aria-invalid={!!errors.unsubscribeUrlTemplate}
        />
        {errors.unsubscribeUrlTemplate && (
          <p className="text-xs text-destructive">
            {errors.unsubscribeUrlTemplate.message}
          </p>
        )}
      </div>

      {/* Sender Physical Address */}
      <div className="space-y-1.5">
        <Label htmlFor="sender-address">Dirección física del remitente</Label>
        <p className="text-xs text-muted-foreground">
          Requerida por CAN-SPAM y GDPR. Se incluye en el pie de los emails.
        </p>
        <Input
          id="sender-address"
          placeholder="Calle Ejemplo 123, 28001 Madrid, España"
          {...register("senderPhysicalAddress")}
        />
      </div>

      {/* Privacy Policy URL */}
      <div className="space-y-1.5">
        <Label htmlFor="privacy-policy">URL de política de privacidad</Label>
        <Input
          id="privacy-policy"
          placeholder="https://tudominio.com/privacidad"
          {...register("privacyPolicyUrl")}
          aria-invalid={!!errors.privacyPolicyUrl}
        />
        {errors.privacyPolicyUrl && (
          <p className="text-xs text-destructive">
            {errors.privacyPolicyUrl.message}
          </p>
        )}
      </div>

      {/* DPO Contact */}
      <div className="space-y-1.5">
        <Label htmlFor="dpo-email">Email del DPO</Label>
        <p className="text-xs text-muted-foreground">
          Email de contacto del Delegado de Protección de Datos.
        </p>
        <Input
          id="dpo-email"
          type="email"
          placeholder="dpo@tudominio.com"
          {...register("dpoContactEmail")}
          aria-invalid={!!errors.dpoContactEmail}
        />
        {errors.dpoContactEmail && (
          <p className="text-xs text-destructive">
            {errors.dpoContactEmail.message}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar compliance"}
        </Button>
      </div>
    </form>
  );
}
