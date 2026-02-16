import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject, getLink } from "@/lib/mock-data";
import { getServerSession } from "@/lib/auth-session";
import LinkEditorForm from "@/components/LinkEditorForm";

export default async function EditLinkPage({
  params,
}: {
  params: Promise<{ projectId: string; linkId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { projectId, linkId } = await params;
  const project = await getProject(projectId, userId);
  const link = await getLink(linkId, userId);

  if (!project || !link || link.project_id !== projectId) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a {project.title || project.name}
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Editar Enlace</h2>
        <p className="text-sm text-gray-500">
          Proyecto:{" "}
          <span className="font-medium text-gray-700">
            {project.title || project.name}
          </span>
        </p>
      </div>

      <LinkEditorForm initialLink={link} projectId={projectId} />
    </div>
  );
}
