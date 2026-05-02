import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLoader } from "@/components/page-loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/components/users-table";
import type { UserWithRole } from "@/db/schema";
import { serverApiClient } from "@/lib/api-client.server";
import { defineAbilityFor } from "@/lib/casl/ability";
import type { Locale } from "@/lib/i18n/config";
import { type Dictionary, getDictionary } from "@/lib/i18n/get-dictionary";
import { getSession } from "@/lib/session";

async function UsersTableWrapper({ dict }: { dict: Dictionary }) {
  const api = await serverApiClient();
  const res = await api.users.$get();
  const users = res.ok ? ((await res.json()).users as unknown as UserWithRole[]) : [];
  return <UsersTable users={users} dict={dict} />;
}

export default async function UsersPage({ params }: { params: Promise<{ lang: string }> }) {
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

  if (!ability.can("read", "User")) {
    redirect(`/${lang}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{dict.users.title}</h1>
          <p className="text-muted-foreground">{dict.users.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>View and manage users in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PageLoader />}>
            <UsersTableWrapper dict={dict} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
