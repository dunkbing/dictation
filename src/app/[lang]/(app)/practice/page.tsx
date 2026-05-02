import { Pencil, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadVideoDialog } from "@/components/upload-video-dialog";
import type { SelectVideo } from "@/db/schema/videos";
import { serverApiClient } from "@/lib/api-client.server";
import { defineAbilityFor } from "@/lib/casl/ability";
import type { Locale } from "@/lib/i18n/config";

export default async function PracticeIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  const api = await serverApiClient();
  const [meRes, listRes] = await Promise.all([api.users.me.$get(), api.videos.$get()]);

  const me = meRes.ok ? (await meRes.json()).user : null;
  const videos: SelectVideo[] = listRes.ok ? (await listRes.json()).videos : [];

  const customPermissions = me ? (JSON.parse(me.customPermissions || "[]") as string[]) : [];
  const allPermissions = [...(me?.role?.permissions ?? []), ...customPermissions];
  const ability = defineAbilityFor(allPermissions);
  const canEdit = ability.can("update", "Video");
  const canCreate = ability.can("create", "Video");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Practice</h1>
          <p className="text-muted-foreground">Pick a video to start dictation practice.</p>
        </div>
        {canCreate && <UploadVideoDialog />}
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {canCreate
              ? 'No videos yet. Click "Add video" to scrape one from YouTube.'
              : "No videos yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <Card key={v.id} className="overflow-hidden flex flex-col">
              {v.thumbnailUrl && (
                // biome-ignore lint: external thumbnail
                <img src={v.thumbnailUrl} alt="" className="w-full aspect-video object-cover" />
              )}
              <CardHeader>
                <CardTitle className="text-base line-clamp-2">{v.title}</CardTitle>
                <CardDescription>{v.channel}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/${lang as Locale}/dashboard/practice/${v.id}`}>
                    <Play className="w-4 h-4 mr-1" /> Practice
                  </Link>
                </Button>
                {canEdit && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${lang as Locale}/practice/${v.id}/edit`}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
