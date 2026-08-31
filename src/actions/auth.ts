"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { registrarAuditoria } from "@/lib/auditoria";

const LoginSchema = z.object({
  email: z.string().email({ message: "Ingresá un email válido." }),
  password: z.string().min(1, { message: "Ingresá tu contraseña." }),
});

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Revisá el email y la contraseña." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });

  if (!usuario || !usuario.activo) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const passwordOk = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
  if (!passwordOk) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  await createSession(usuario.id);
  await registrarAuditoria({
    usuarioId: usuario.id,
    entidadTipo: "usuario",
    entidadId: usuario.id,
    accion: "LOGIN",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const { getCurrentUser } = await import("@/lib/dal");
  const user = await getCurrentUser();
  if (user) {
    await registrarAuditoria({
      usuarioId: user.id,
      entidadTipo: "usuario",
      entidadId: user.id,
      accion: "LOGOUT",
    });
  }
  await deleteSession();
  redirect("/login");
}
