import type { RoleName } from "@/generated/prisma/client";

export const ROLE_LABELS: Record<RoleName, string> = {
  RESPONSABLE_OPERATIVO: "Responsable operativo",
  ANALISTA_CXP: "Analista de Cuentas a Pagar",
  COMPRAS: "Compras",
  GERENCIA: "Gerencia",
  TESORERIA: "Tesorería",
  ADMIN: "Administrador",
};

export const NAV_BY_ROLE: Record<RoleName, { href: string; label: string }[]> = {
  RESPONSABLE_OPERATIVO: [{ href: "/servicios", label: "Mis servicios" }],
  ANALISTA_CXP: [
    { href: "/facturas", label: "Facturas" },
    { href: "/facturas/nueva", label: "Registrar factura" },
    { href: "/facturas/bloqueadas", label: "Bloqueadas" },
    { href: "/facturas/por-proveedor", label: "Por proveedor" },
    { href: "/reportes/excepciones", label: "Rep. excepciones" },
    { href: "/reportes/conciliacion", label: "Rep. conciliación" },
  ],
  COMPRAS: [
    { href: "/compras/parciales", label: "Cumplimiento parcial" },
    { href: "/compras/precios", label: "Conflictos de precio" },
    { href: "/compras/historial-precios", label: "Historial de precios" },
  ],
  GERENCIA: [
    { href: "/gerencia", label: "Para autorizar" },
    { href: "/reportes/excepciones", label: "Rep. excepciones" },
  ],
  TESORERIA: [
    { href: "/tesoreria", label: "Pendientes de pago" },
    { href: "/tesoreria/historial", label: "Comprobantes emitidos" },
    { href: "/reportes/conciliacion", label: "Rep. conciliación" },
  ],
  ADMIN: [
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/config", label: "Configuración" },
    { href: "/admin/periodos", label: "Generar períodos" },
    { href: "/admin/importar", label: "Importación" },
    { href: "/admin/auditoria", label: "Trazabilidad" },
  ],
};
