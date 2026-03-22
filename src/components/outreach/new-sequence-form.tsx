"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { Mail, MessageCircle, Shuffle } from "lucide-react";
import { createSequenceAction } from "@/app/(dashboard)/outreach/sequences/actions";

export function NewSequenceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "mixed">("email");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("channel", channel);

    startTransition(async () => {
      try {
        const result = await createSequenceAction(formData);
        if (result.success && result.data) {
          router.push(`/outreach/sequences/${result.data.id}`);
        }
      } catch (e) {
        setError("Error al crear la secuencia. Intentalo de nuevo.");
      }
    });
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="space-y-5 pt-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="seq-name">Nombre de la secuencia</Label>
          <Input
            id="seq-name"
            placeholder="Ej: Seguimiento restaurantes Madrid"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            autoFocus
          />
        </div>

        {/* Channel */}
        <div className="space-y-2">
          <Label>Canal principal</Label>
          <Select
            value={channel}
            onValueChange={(v) => {
              if (v) setChannel(v as "email" | "whatsapp" | "mixed");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                <Mail className="size-3.5 text-blue-500" />
                Email
              </SelectItem>
              <SelectItem value="whatsapp">
                <MessageCircle className="size-3.5 text-green-500" />
                WhatsApp
              </SelectItem>
              <SelectItem value="mixed">
                <Shuffle className="size-3.5 text-purple-500" />
                Mixto
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creando..." : "Crear secuencia"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/outreach/sequences")}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
