import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, createEmptyLink } from "@/lib/mock-data";
import LinkEditorForm from "@/components/LinkEditorForm";

export default async function NewLinkPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProject(projectId);

  if (!project) {
    notFound();
  }

  const newLink = createEmptyLink(projectId);

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
