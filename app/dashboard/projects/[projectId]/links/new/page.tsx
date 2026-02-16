import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject, createEmptyLink } from "@/lib/mock-data";
import { getServerSession } from "@/lib/auth-session";
import LinkEditorForm from "@/components/LinkEditorForm";

export default async function NewLinkPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { projectId } = await params;
  const project = await getProject(projectId, userId);

  if (!project) {
    notFound();
  }

  const newLink = await createEmptyLink(projectId, userId);

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
        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          Nuevo Enlace de Rotación
        </h2>
        <p className="text-sm text-gray-500">
          Proyecto:{" "}
          <span className="font-medium text-gray-700">
            {project.title || project.name}
          </span>
        </p>
      </div>

      <LinkEditorForm initialLink={newLink} projectId={projectId} />
    </div>
  );
}
