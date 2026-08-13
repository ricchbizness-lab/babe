import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CopiloteLocked } from "./CopiloteLocked";
import { CopiloteView } from "./CopiloteView";

export default async function CopilotePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const subscription = userId ? await prisma.subscription.findUnique({ where: { userId } }) : null;
  const hasAccess = subscription?.status === "active" && subscription.plan !== "essentiel";

  if (!hasAccess) {
    return <CopiloteLocked />;
  }

  return <CopiloteView />;
}
