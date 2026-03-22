import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconBgClass = "bg-blue-100",
  iconClass = "text-blue-600",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  iconBgClass?: string;
  iconClass?: string;
}) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-4xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  trend.positive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.positive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(trend.value)}% vs semana anterior
              </div>
            )}
          </div>
          <div className={cn("rounded-xl p-3", iconBgClass)}>
            <Icon className={cn("h-6 w-6", iconClass)} />
          </div>
        </div>
      </CardContent>
      {/* Decorative gradient bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
    </Card>
  );
}
