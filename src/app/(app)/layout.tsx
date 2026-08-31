import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { NAV_BY_ROLE, ROLE_LABELS } from "@/lib/roles";
import { logoutAction } from "@/actions/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const links = user.roles.flatMap((role) => NAV_BY_ROLE[role]);
  const uniqueLinks = Array.from(new Map(links.map((l) => [l.href, l])).values());

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
              SERTEC
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
              {uniqueLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-slate-900">
                  {link.label}
                </Link>
              ))}
              <Link href="/instructivo" className="hover:text-slate-900">
                Instructivo
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-medium text-slate-800">{user.nombre}</div>
              <div className="text-xs text-slate-500">
                {user.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
