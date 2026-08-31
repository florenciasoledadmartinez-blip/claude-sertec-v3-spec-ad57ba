import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { CrearUsuarioForm, EditarUsuarioRow } from "../admin-forms";

export default async function AdminUsuariosPage() {
  await requireRole("ADMIN");

  const usuarios = await prisma.usuario.findMany({
    include: { roles: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-slate-500">Gestión de usuarios y asignación de roles.</p>
      </div>

      <CrearUsuarioForm />

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-medium text-slate-900">Usuarios existentes</h2>
        {usuarios.map((u) => (
          <EditarUsuarioRow
            key={u.id}
            usuario={{ id: u.id, nombre: u.nombre, email: u.email, activo: u.activo, roles: u.roles.map((r) => r.role) }}
          />
        ))}
      </div>
    </div>
  );
}
