import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionPayload } from "@/lib/session";
import type { RoleName } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  nombre: string;
  email: string;
  area: string | null;
  roles: RoleName[];
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const payload = await getSessionPayload();
  if (!payload?.userId) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId, activo: true },
    include: { roles: true },
  });
  if (!usuario) return null;

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    area: usuario.area,
    roles: usuario.roles.map((r) => r.role),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** El Administrador (2.6) ve y puede hacer todo lo de los demas roles, ademas de lo suyo. */
export async function requireRole(...allowed: RoleName[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.roles.includes("ADMIN") && !user.roles.some((r) => allowed.includes(r))) {
    redirect("/dashboard");
  }
  return user;
}

export function hasRole(user: CurrentUser, ...roles: RoleName[]) {
  return user.roles.includes("ADMIN") || user.roles.some((r) => roles.includes(r));
}
