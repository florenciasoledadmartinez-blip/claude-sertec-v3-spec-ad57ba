import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { crearServicioAction } from "@/actions/servicios";
import { ServicioForm } from "../servicio-form";

export default async function NuevoServicioPage() {
  const user = await requireRole("RESPONSABLE_OPERATIVO");

  const responsables = await prisma.usuario.findMany({
    where: { activo: true, roles: { some: { role: "RESPONSABLE_OPERATIVO" } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo servicio</h1>
        <p className="text-slate-500">
          Alta de un servicio contratado sin orden de compra. Queda asignado a vos, salvo que lo cargues en nombre
          de otra área.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <ServicioForm
          action={crearServicioAction}
          responsables={responsables}
          currentUserId={user.id}
          submitLabel="Crear servicio"
        />
      </div>
    </div>
  );
}
