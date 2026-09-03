import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getVencimientos } from "@/lib/vencimientos";

export default async function VencimientosPage() {
  await requireRole("GERENCIA");
  const items = await getVencimientos();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Vencimientos</h1>
        <p className="text-slate-500">Toda tarea pendiente que superó su plazo, con quién la tiene atrasada.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tipo de tarea</th>
              <th className="px-4 py-3">Persona</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Días de atraso</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={`${it.entidadTipo}-${it.entidadId}`} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-800">{it.tipo}</td>
                <td className="px-4 py-3 text-slate-600">{it.persona}</td>
                <td className="px-4 py-3">
                  <Link href={it.href} className="text-slate-600 hover:underline">
                    {it.detalle}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-red-600">{it.diasAtraso}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No hay tareas vencidas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
