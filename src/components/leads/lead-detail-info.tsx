"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Star,
  MessageSquare,
  Sparkles,
  StickyNote,
  ExternalLink,
  Pencil,
  Trash2,
  ArrowLeft,
  Save,
} from "lucide-react";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  type LeadStatus,
} from "@/types";
import {
  updateLeadStatusAction,
  updateLeadNotesAction,
  deleteLeadAction,
} from "@/app/(dashboard)/leads/actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadData {
  id: string;
  clientId: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  category: string | null;
  status: string;
  source: string;
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
  notes: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadDetailInfoProps {
  lead: LeadData;
}

// TikTok icon (not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadDetailInfo({ lead }: LeadDetailInfoProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(true);

  async function handleStatusChange(status: string) {
    startTransition(async () => {
      try {
        await updateLeadStatusAction(lead.id, status);
        toast.success("Estado actualizado");
      } catch {
        toast.error("Error al cambiar el estado");
      }
    });
  }

  async function handleSaveNotes() {
    startTransition(async () => {
      try {
        await updateLeadNotesAction(lead.id, notes);
        setNotesSaved(true);
        toast.success("Notas guardadas");
      } catch {
        toast.error("Error al guardar las notas");
      }
    });
  }

  async function handleDelete() {
    if (!confirm("¿Estás seguro de que quieres eliminar este lead?")) return;
    startTransition(async () => {
      await deleteLeadAction(lead.id);
      router.push("/leads");
    });
  }

  const socialLinks = [
    { key: "facebook", value: lead.facebook, icon: Facebook, label: "Facebook" },
    { key: "instagram", value: lead.instagram, icon: Instagram, label: "Instagram" },
    { key: "linkedin", value: lead.linkedin, icon: Linkedin, label: "LinkedIn" },
    { key: "twitter", value: lead.twitter, icon: Twitter, label: "Twitter" },
    { key: "youtube", value: lead.youtube, icon: Youtube, label: "YouTube" },
    { key: "tiktok", value: lead.tiktok, icon: TikTokIcon, label: "TikTok" },
  ].filter((s) => s.value);

  const rating = lead.googleRating ? parseFloat(lead.googleRating) : null;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => router.push("/leads")}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <CardTitle className="text-xl">{lead.companyName}</CardTitle>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  {lead.category && <span>{lead.category}</span>}
                  {lead.category && lead.country && <span>·</span>}
                  {lead.country && <span>{lead.country}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={lead.status}
                onValueChange={(v) => { if (v) handleStatusChange(v); }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    <Badge
                      className={LEAD_STATUS_COLORS[lead.status as LeadStatus] ?? ""}
                      variant="secondary"
                    >
                      {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" />
            Contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={Mail} label="Email" value={lead.email} />
            <InfoRow icon={Phone} label="Teléfono" value={lead.phone} />
            <InfoRow
              icon={Globe}
              label="Web"
              value={lead.website}
              href={lead.website ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`) : undefined}
            />
            <InfoRow icon={MapPin} label="Dirección" value={lead.address} />
          </div>
        </CardContent>
      </Card>

      {/* Social links */}
      {socialLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="size-4" />
              Redes Sociales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                const url = social.value!.startsWith("http")
                  ? social.value!
                  : `https://${social.value}`;
                return (
                  <a
                    key={social.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <Icon className="size-4" />
                    {social.label}
                    <ExternalLink className="size-3 text-zinc-400" />
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Maps */}
      {lead.googlePlaceId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" />
              Google Maps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {rating !== null && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-4 ${
                          star <= Math.round(rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-zinc-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                </div>
              )}
              {lead.googleRatingCount !== null && (
                <div className="flex items-center gap-1 text-sm text-zinc-500">
                  <MessageSquare className="size-3.5" />
                  {lead.googleRatingCount} reseñas
                </div>
              )}
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${lead.googlePlaceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                Ver en Google Maps
                <ExternalLink className="size-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {lead.aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Resumen IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
              {lead.aiSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="size-4" />
            Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              placeholder="Añade notas sobre este lead..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
              rows={4}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                {notesSaved ? "Guardado" : "Sin guardar"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNotes}
                disabled={notesSaved || isPending}
              >
                <Save className="size-3.5" data-icon="inline-start" />
                Guardar notas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Info row helper ─────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 text-zinc-400" />
      <div className="min-w-0">
        <p className="text-xs text-zinc-400">{label}</p>
        {value ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {value}
            </a>
          ) : (
            <p className="text-sm text-zinc-900 break-all">{value}</p>
          )
        ) : (
          <p className="text-sm text-zinc-300">-</p>
        )}
      </div>
    </div>
  );
}
