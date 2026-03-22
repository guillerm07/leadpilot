import Link from "next/link";
import { Building2, Globe, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
  leadCount?: number;
}

export function ClientCard({
  id,
  name,
  industry,
  country,
  website,
  logoUrl,
  leadCount = 0,
}: ClientCardProps) {
  return (
    <Link href={`/clients/${id}/settings`} className="group block">
      <Card
        className={cn(
          "transition-all duration-200",
          "hover:ring-2 hover:ring-primary/20 hover:shadow-md",
          "cursor-pointer"
        )}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={name}
                  className="size-10 rounded-lg object-cover"
                />
              ) : (
                <Building2 className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{name}</CardTitle>
              {industry && (
                <Badge variant="secondary" className="mt-1">
                  {industry}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {country && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{country}</span>
              </div>
            )}
            {website && (
              <div className="flex items-center gap-1.5">
                <Globe className="size-3.5 shrink-0" />
                <span className="truncate">
                  {website.replace(/^https?:\/\//, "")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-xs font-medium text-foreground">
                {leadCount}
              </span>
              <span className="text-xs">
                {leadCount === 1 ? "lead" : "leads"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
