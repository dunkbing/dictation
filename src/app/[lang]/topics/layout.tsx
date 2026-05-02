import { DashboardLayout } from "@/components/dashboard-layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getSession } from "@/lib/session";

export default async function TopicsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const session = await getSession();

  return (
    <DashboardLayout lang={lang as Locale} dict={dict} email={session?.email ?? null}>
      {children}
    </DashboardLayout>
  );
}
