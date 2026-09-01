import Link from "next/link";
import { requireUser, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { getConfigSistema } from "@/lib/config";
import { ROLE_LABELS } from "@/lib/roles";
import type { RoleName } from "@/generated/prisma/client";

type Pendiente = { label: string; count: number; href: string };

export default async function DashboardPage() {
  const user = await requireUser();
  const config = await getConfigSistema();

  const necesitaFacturas = ["ANALISTA_CXP", "COMPRAS", "GERENCIA", "TESORERIA"].some((r) =>
    hasRole(user, r as RoleName)
  );
  const facturas = necesitaFacturas ? await cargarFacturasConEstado({}) : [];

  const grupos: { role: RoleName; items: Pendiente[] }[] = [];

  if (hasRole(user, "RESPONSABLE_OPERATIVO")) {
    const [periodosPendientes, facturasAConfirmar] = await Promise.all([
      prisma.prestacion.count({
        where: { estado: "PENDIENTE", servicio: { responsableOperativoId: user.id, activo: true } },
      }),
      prisma.factura.count({
        where: { periodoAConfirmar: true, servicio: { responsableOperativoId: user.id } },
      }),
    ]);
    grupos.push({
      role: "RESPONSABLE_OPERATIVO",
      items: [
        { label: "Períodos pendientes de certificar", count: periodosPendientes, href: "/servicios" },
        { label: "Facturas con período a confirmar", count: facturasAConfirmar, href: "/servicios" },
      ],
    });
  }

  if (hasRole(user, "ANALISTA_CXP")) {
    const bloqueadas = facturas.filter((f) =>
      [
        "PERIODO_A_CONFIRMAR",
        "PENDIENTE_VALIDAR_PRESTACION",
        "CONFLICTO_PARCIAL",
        "CONFLICTO_PRECIO",
        "CONFLICTO_PRESUPUESTO",
      ].includes(f.estado)
    ).length;
    const paraConfirmarPrecio = facturas.filter((f) => f.estado === "PARA_CONFIRMAR_PRECIO").length;
    grupos.push({
      role: "ANALISTA_CXP",
      items: [
        { label: "Facturas bloqueadas", count: bloqueadas, href: "/facturas/bloqueadas" },
        { label: "Para confirmar precio", count: paraConfirmarPrecio, href: "/facturas?estado=PARA_CONFIRMAR_PRECIO" },
      ],
    });
  }

  if (hasRole(user, "COMPRAS")) {
    const parciales = facturas.filter((f) => f.estado === "CONFLICTO_PARCIAL").length;
    const conflictosPrecio =
      config.resolutorConflictoPrecio === "COMPRAS"
        ? facturas.filter((f) => f.estado === "CONFLICTO_PRECIO").length
        : 0;
    const items: Pendiente[] = [{ label: "Cumplimiento parcial", count: parciales, href: "/compras/parciales" }];
    if (config.resolutorConflictoPrecio === "COMPRAS") {
      items.push({ label: "Conflictos de precio", count: conflictosPrecio, href: "/compras/precios" });
    }
    grupos.push({ role: "COMPRAS", items });
  }

  if (hasRole(user, "GERENCIA")) {
    const paraAutorizar = facturas.filter((f) => f.estado === "LISTA_PARA_AUTORIZAR").length;
    grupos.push({
      role: "GERENCIA",
      items: [{ label: "Para autorizar", count: paraAutorizar, href: "/gerencia" }],
    });
  }

  if (hasRole(user, "TESORERIA")) {
    const pendientesPago = facturas.filter((f) => f.estado === "AUTORIZADA_PENDIENTE_PAGO").length;
    grupos.push({
      role: "TESORERIA",
      items: [{ label: "Pendientes de pago", count: pendientesPago, href: "/tesoreria" }],
    });
  }

  if (hasRole(user, "ADMIN")) {
    const [noCumplidos, rechazadas] = await Promise.all([
      prisma.prestacion.count({ where: { estado: "NO_CUMPLIDO" } }),
      prisma.factura.count({ where: { OR: [{ rechazadaGerencia: true }, { rechazadaPrecio: true }] } }),
    ]);
    grupos.push({
      role: "ADMIN",
      items: [
        { label: "Períodos bloqueados por incumplimiento", count: noCumplidos, href: "/admin/periodos" },
        { label: "Facturas rechazadas (revisar / reabrir)", count: rechazadas, href: "/admin/rechazadas" },
      ],
    });
  }

  const totalPendiente = grupos.reduce((acc, g) => acc + g.items.reduce((a, i) => a + i.count, 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hola, {user.nombre}</h1>
        <p className="text-slate-500">
          {totalPendiente > 0
            ? `Tenés ${totalPendiente} cosa${totalPendiente === 1 ? "" : "s"} pendiente${totalPendiente === 1 ? "" : "s"} de resolver.`
            : "No tenés nada pendiente por ahora."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map(({ role, items }) => (
          <div key={role} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-medium text-slate-900">{ROLE_LABELS[role]}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.count > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {item.count}
                    </span>
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
