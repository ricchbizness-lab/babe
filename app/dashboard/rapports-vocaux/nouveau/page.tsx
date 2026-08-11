import { VoiceReportForm } from "./VoiceReportForm";

export default function NewVoiceReportPage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  // Vérifié côté serveur uniquement — la clé elle-même ne quitte jamais le
  // serveur, seul ce booléen est transmis au formulaire client.
  const audioEnabled = Boolean(process.env.GROQ_API_KEY);

  return <VoiceReportForm audioEnabled={audioEnabled} defaultProjectId={searchParams.projectId} />;
}
