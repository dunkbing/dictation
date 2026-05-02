import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverApiClient } from "@/lib/api-client.server";
import type { Locale } from "@/lib/i18n/config";
import PracticeClient from "./practice-client";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const api = await serverApiClient();
  const res = await api.videos[":id"].$get({ param: { id } });

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn't load that video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {body.error ?? "The video may not exist."}
          </p>
          <Button asChild>
            <Link href={`/${lang as Locale}/topics`}>Back to library</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { video } = await res.json();
  return <PracticeClient lang={lang as Locale} video={video} />;
}
