import { redirect } from "next/navigation";
import { serverApiClient } from "@/lib/api-client.server";
import { defineAbilityFor } from "@/lib/casl/ability";
import type { Locale } from "@/lib/i18n/config";
import EditVideoClient from "./edit-client";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  const api = await serverApiClient();
  const meRes = await api.users.me.$get();
  if (!meRes.ok) redirect(`/${lang}/login`);
  const { user: me } = await meRes.json();

  const customPermissions = JSON.parse(me.customPermissions || "[]") as string[];
  const allPermissions = [...(me.role?.permissions ?? []), ...customPermissions];
  const ability = defineAbilityFor(allPermissions);

  if (!ability.can("update", "Video")) {
    redirect(`/${lang}/dashboard/practice/${id}`);
  }

  const videoRes = await api.videos[":id"].$get({ param: { id } });
  if (!videoRes.ok) redirect(`/${lang}/dashboard/practice`);
  const { video } = await videoRes.json();

  return <EditVideoClient lang={lang as Locale} video={video} />;
}
