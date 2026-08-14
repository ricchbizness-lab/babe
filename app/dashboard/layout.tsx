import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavigationProgress, Sidebar, ToastProvider } from "@/components/ui";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const business = await prisma.business.findUnique({ where: { userId } });
  if (!business) redirect("/onboarding");

  return (
    <ToastProvider>
      <NavigationProgress />
      <div className="nova-shell">
        <Sidebar businessName={business.name} />
        <main className="nova-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
