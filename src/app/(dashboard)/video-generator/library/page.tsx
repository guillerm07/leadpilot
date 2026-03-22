import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { videoProjects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Plus, Download, Calendar, Clock, Film } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-zinc-100 text-zinc-700" },
  researching: { label: "Investigando", className: "bg-blue-100 text-blue-700" },
  scripted: { label: "Con guion", className: "bg-purple-100 text-purple-700" },
  generating_audio: { label: "Generando audio", className: "bg-yellow-100 text-yellow-700" },
  generating_video: { label: "Generando video", className: "bg-orange-100 text-orange-700" },
  completed: { label: "Completado", className: "bg-green-100 text-green-700" },
  failed: { label: "Error", className: "bg-red-100 text-red-700" },
};

export default async function VideoLibraryPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  const videos = await db
    .select()
    .from(videoProjects)
    .where(eq(videoProjects.clientId, clientId))
    .orderBy(desc(videoProjects.createdAt));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Biblioteca de Videos
          </h1>
          <p className="text-sm text-zinc-500">
            {videos.length} {videos.length === 1 ? "video" : "videos"} generados
          </p>
        </div>
        <Link href="/video-generator">
          <Button>
            <Plus className="size-4" />
            Nuevo video
          </Button>
        </Link>
      </div>

      {/* Content */}
      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-100 p-4">
              <Film className="size-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-base font-medium text-zinc-900">
              No hay videos
            </h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Crea tu primer video con IA usando el generador de videos.
            </p>
            <Link href="/video-generator" className="mt-4">
              <Button>
                <Plus className="size-4" />
                Crear video
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => {
            const statusConfig =
              STATUS_CONFIG[video.status] ?? STATUS_CONFIG.draft;
            return (
              <Card
                key={video.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-zinc-100 flex items-center justify-center relative">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Video className="size-12 text-zinc-300" />
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={statusConfig.className}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      {video.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {video.duration}s
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(video.createdAt)}
                      </span>
                    </div>
                  </div>

                  {video.metaAdId && (
                    <Badge variant="outline" className="text-xs">
                      Vinculado a Meta Ads
                    </Badge>
                  )}

                  {video.status === "completed" && video.videoUrl && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="size-3" />
                        Descargar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
