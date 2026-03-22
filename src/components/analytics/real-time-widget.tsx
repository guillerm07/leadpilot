"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Eye, MessageCircle, Zap } from "lucide-react";

interface RealtimeMetrics {
  emailsSentToday: number;
  opensLastHour: number;
  repliesToday: number;
  activeSequences: number;
  timestamp: string;
}

const POLLING_INTERVAL = 30_000; // 30 seconds

export function RealTimeWidget() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/realtime");
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }
      const data: RealtimeMetrics = await res.json();
      setMetrics(data);
      setError(null);
    } catch {
      setError("Error al cargar metricas en tiempo real");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (error && !metrics) {
    return null;
  }

  const items = [
    {
      label: "Emails enviados hoy",
      value: metrics?.emailsSentToday ?? 0,
      icon: Mail,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Aperturas ultima hora",
      value: metrics?.opensLastHour ?? 0,
      icon: Eye,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      label: "Respuestas hoy",
      value: metrics?.repliesToday ?? 0,
      icon: MessageCircle,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Secuencias activas",
      value: metrics?.activeSequences ?? 0,
      icon: Zap,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="relative overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg ${item.bgColor} p-2.5`}>
              <item.icon className={`size-5 ${item.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {isLoading ? (
                    <span className="inline-block h-7 w-10 animate-pulse rounded bg-zinc-200" />
                  ) : (
                    item.value
                  )}
                </p>
                {/* Live pulse indicator */}
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {item.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
