import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

export function KpiCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        {trend && (
          <div className={`mt-2 text-sm ${trend.positive ? "text-green-600" : "text-red-600"}`}>
            {trend.positive ? "\u2191" : "\u2193"} {Math.abs(trend.value)}% vs semana anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}
