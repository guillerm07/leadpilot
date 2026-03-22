"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createLeadAction } from "@/app/(dashboard)/leads/actions";

// ─── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  companyName: z.string().min(1, "El nombre de empresa es obligatorio"),
  email: z.string().email("Email no válido").or(z.literal("")).optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateLeadDialog({
  open,
  onOpenChange,
  clientId,
}: CreateLeadDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      email: "",
      phone: "",
      website: "",
      country: "",
      category: "",
      address: "",
      notes: "",
    },
  });

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        await createLeadAction({
          clientId,
          companyName: data.companyName,
          email: data.email,
          phone: data.phone,
          website: data.website,
          country: data.country,
          category: data.category,
          address: data.address,
          notes: data.notes,
          source: "manual",
        });
        handleClose(false);
        router.refresh();
      } catch {
        alert("Error al crear el lead. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir lead</DialogTitle>
          <DialogDescription>
            Introduce los datos del nuevo lead manualmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3">
            {/* Empresa */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName">
                Empresa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                placeholder="Nombre de la empresa"
                {...register("companyName")}
                aria-invalid={!!errors.companyName}
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            {/* Email & Phone row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+34 600 000 000"
                  {...register("phone")}
                />
              </div>
            </div>

            {/* Web */}
            <div className="space-y-1.5">
              <Label htmlFor="website">Web</Label>
              <Input
                id="website"
                placeholder="https://ejemplo.com"
                {...register("website")}
              />
            </div>

            {/* Country & Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  placeholder="España"
                  {...register("country")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  placeholder="Restaurantes, Dentistas..."
                  {...register("category")}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Calle, Ciudad, CP"
                {...register("address")}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales..."
                {...register("notes")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              <Plus className="size-4" data-icon="inline-start" />
              Crear lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
