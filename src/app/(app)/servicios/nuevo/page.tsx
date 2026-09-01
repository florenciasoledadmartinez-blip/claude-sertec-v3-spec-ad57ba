import { requireRole, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { crearServicioAction } from "@/actions/servicios";
import { ServicioForm } from "../servicio-form";

export default async function NuevoServicioPage() {
  const user = await requireRole("RESPONSABLE_OPERATIVO");
  const esAdmin = hasRole(user, "ADMIN");

  // Un responsable operativo solo se ve a si mismo. El admin puede asignar el servicio
  // a cualquier responsable (por ejemplo, para cargarlo en nombre de otra area).
  const responsables = esAdmin
    ? await prisma.usuario.findMany({
        where: { activo: true, roles: { some: { role: "RESPONSABLE_OPERATIVO" } } },
        orderBy: { nombre: "asc" },
      })
    : [{ id: user.id, nombre: user.nombre }];
  const puedeElegirOtroResponsable = esAdmin && responsables.length > 1;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo servicio</h1>
        <p className="text-slate-500">
          Alta de un servicio contratado sin orden de compra. Queda asignado a vos.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <ServicioForm
          action={crearServicioAction}
          responsables={responsables}
          currentUserId={user.id}
          mostrarResponsable
          responsableEditable={puedeElegirOtroResponsable}
          submitLabel="Crear servicio"
        />
      </div>
    </div>
  );
}
