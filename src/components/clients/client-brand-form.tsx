"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClientAction } from "@/app/(dashboard)/clients/actions";

const brandFormSchema = z.object({
  brandDescription: z.string().max(2000).optional().or(z.literal("")),
  brandVoice: z.string().max(2000).optional().or(z.literal("")),
});

type BrandFormData = z.infer<typeof brandFormSchema>;

interface ClientBrandFormProps {
  client: {
    id: string;
    brandDescription: string | null;
    brandVoice: string | null;
  };
}

export function ClientBrandForm({ client }: ClientBrandFormProps) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      brandDescription: client.brandDescription ?? "",
      brandVoice: client.brandVoice ?? "",
    },
  });

  function onSubmit(data: BrandFormData) {
    setServerError(null);
    setSuccessMessage(false);
    startTransition(async () => {
      try {
        await updateClientAction({
          id: client.id,
          brandDescription: data.brandDescription || undefined,
          brandVoice: data.brandVoice || undefined,
        });
        setSuccessMessage(true);
        router.refresh();
        setTimeout(() => setSuccessMessage(false), 3000);
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "Error al actualizar la marca"
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          Marca actualizada correctamente.
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="brand-description">Descripción de marca</Label>
        <p className="text-xs text-muted-foreground">
          Describe el negocio del cliente, su propuesta de valor y público
          objetivo. Se usa para generar contenido personalizado con IA.
        </p>
        <Textarea
          id="brand-description"
          placeholder="Ej: Clínica dental especializada en ortodoncia invisible para adultos jóvenes en Madrid. Su propuesta de valor es tratamiento sin brackets visibles con seguimiento por app..."
          rows={5}
          {...register("brandDescription")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="brand-voice">Voz de marca</Label>
        <p className="text-xs text-muted-foreground">
          Define el tono y estilo de comunicación. Se usa para adaptar los
          emails y mensajes generados por IA.
        </p>
        <Textarea
          id="brand-voice"
          placeholder="Ej: Tono cercano y profesional. Tutear al lector. Evitar tecnicismos médicos. Usar frases cortas. Transmitir confianza y modernidad..."
          rows={5}
          {...register("brandVoice")}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar marca"}
        </Button>
      </div>
    </form>
  );
}
