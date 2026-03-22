"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClientAction } from "@/app/(dashboard)/clients/actions";

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

const createClientFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  website: z
    .string()
    .url("Introduce una URL válida (ej: https://ejemplo.com)")
    .optional()
    .or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  brandDescription: z.string().max(2000).optional().or(z.literal("")),
  brandVoice: z.string().max(2000).optional().or(z.literal("")),
});

type CreateClientFormData = z.infer<typeof createClientFormSchema>;

export function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientFormSchema),
    defaultValues: {
      name: "",
      website: "",
      industry: "",
      country: "",
      brandDescription: "",
      brandVoice: "",
    },
  });

  const countryValue = watch("country");

  function onSubmit(data: CreateClientFormData) {
    setServerError(null);
    startTransition(async () => {
      try {
        await createClientAction({
          name: data.name,
          website: data.website || undefined,
          industry: data.industry || undefined,
          country: data.country || undefined,
          brandDescription: data.brandDescription || undefined,
          brandVoice: data.brandVoice || undefined,
        });
        setOpen(false);
        reset();
        router.refresh();
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "Error al crear el cliente"
        );
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button />}
      >
        <Plus data-icon="inline-start" />
        Nuevo cliente
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Añade un nuevo cliente a tu agencia. Podrás configurar
            integraciones y compliance después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Nombre del cliente o empresa"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
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
            {/* Industria */}
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industria</Label>
              <Input
                id="industry"
                placeholder="Ej: Restaurantes"
                {...register("industry")}
              />
            </div>

            {/* País */}
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

          {/* Descripción de marca */}
          <div className="space-y-1.5">
            <Label htmlFor="brandDescription">Descripción de marca</Label>
            <Textarea
              id="brandDescription"
              placeholder="Describe brevemente el negocio del cliente, su propuesta de valor y público objetivo..."
              rows={3}
              {...register("brandDescription")}
            />
          </div>

          {/* Voz de marca */}
          <div className="space-y-1.5">
            <Label htmlFor="brandVoice">Voz de marca</Label>
            <Textarea
              id="brandVoice"
              placeholder="Describe el tono y estilo de comunicación: formal, cercano, técnico..."
              rows={3}
              {...register("brandVoice")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
