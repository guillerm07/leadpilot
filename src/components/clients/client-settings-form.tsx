"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateClientAction } from "@/app/(dashboard)/clients/actions";

const COUNTRIES = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Estados Unidos",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Portugal",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
];

const settingsFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  website: z
    .string()
    .url("Introduce una URL válida")
    .optional()
    .or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface ClientSettingsFormProps {
  client: {
    id: string;
    name: string;
    website: string | null;
    industry: string | null;
    country: string | null;
  };
}

export function ClientSettingsForm({ client }: ClientSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: client.name,
      website: client.website ?? "",
      industry: client.industry ?? "",
      country: client.country ?? "",
    },
  });

  const countryValue = watch("country");

  function onSubmit(data: SettingsFormData) {
    startTransition(async () => {
      try {
        await updateClientAction({
          id: client.id,
          name: data.name,
          website: data.website || undefined,
          industry: data.industry || undefined,
          country: data.country || undefined,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="settings-name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="settings-name"
          placeholder="Nombre del cliente"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="settings-website">Website</Label>
        <Input
          id="settings-website"
          placeholder="https://ejemplo.com"
          {...register("website")}
          aria-invalid={!!errors.website}
        />
        {errors.website && (
          <p className="text-xs text-destructive">
            {errors.website.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="settings-industry">Industria</Label>
          <Input
            id="settings-industry"
            placeholder="Ej: Restaurantes"
            {...register("industry")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>País</Label>
          <Select
            value={countryValue || undefined}
            onValueChange={(val) => setValue("country", val ?? "", { shouldValidate: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar país" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
