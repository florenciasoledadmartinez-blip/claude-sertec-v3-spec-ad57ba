import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { NAV_BY_ROLE, ROLE_LABELS } from "@/lib/roles";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hola, {user.nombre}</h1>
        <p className="text-slate-500">
          Circuito de facturas de servicio (categoría B). Elegí una sección para empezar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {user.roles.map((role) => (
          <div key={role} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-medium text-slate-900">{ROLE_LABELS[role]}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {NAV_BY_ROLE[role].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-600 hover:text-slate-900 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
