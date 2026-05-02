import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import type { SelectRole } from "@/db/schema";
import { serverApiClient } from "@/lib/api-client.server";
import { defineAbilityFor } from "@/lib/casl/ability";
import { AbilityProvider } from "@/lib/casl/context";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getSession } from "@/lib/session";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  const session = await getSession();
  if (!session) {
    redirect(`/${lang}/login`);
  }

  const api = await serverApiClient();
  const meRes = await api.users.me.$get();
  if (!meRes.ok) {
    redirect(`/${lang}/login`);
  }
  const { user: userData } = await meRes.json();

  const customPermissions = JSON.parse(userData.customPermissions || "[]") as string[];
  const allPermissions = [...(userData.role?.permissions || []), ...customPermissions];

  const ability = defineAbilityFor(allPermissions);

  let roles: SelectRole[] = [];
  if (ability.can("update", "User")) {
    const rolesRes = await api.roles.$get();
    if (rolesRes.ok) {
      const data = await rolesRes.json();
      roles = (data.roles ?? []) as unknown as SelectRole[];
    }
  }

  return (
    <AbilityProvider roles={roles} permissions={allPermissions}>
      <DashboardLayout lang={lang as Locale} dict={dict} email={session.email}>
        {children}
      </DashboardLayout>
    </AbilityProvider>
  );
}
