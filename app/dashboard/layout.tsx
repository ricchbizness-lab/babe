import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavigationProgress, Sidebar, ToastProvider } from "@/components/ui";
import { getDisplayName, getInitials } from "@/lib/userDisplay";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const business = await prisma.business.findUnique({ where: { userId } });
  if (!business) redirect("/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });

  return (
    <ToastProvider>
      <NavigationProgress />
      <div className="nova-shell">
        <Sidebar
          businessName={business.name}
          logoBase64={business.logoBase64}
          userName={user ? getDisplayName(user.firstName, user.lastName, user.email) : ""}
          userInitials={user ? getInitials(user.firstName, user.lastName, user.email) : ""}
        />
        <main className="nova-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
