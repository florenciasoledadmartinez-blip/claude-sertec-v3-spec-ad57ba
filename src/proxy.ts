import { NextRequest, NextResponse } from "next/server";
import { decrypt, SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_ROUTES = ["/login"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(cookie);
  const isAuthenticated = !!session?.userId;

  if (!isPublic && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Ademas de los excluidos de siempre, deja pasar sin auth cualquier archivo estatico servido
  // desde /public (logo, iconos, etc.) — si no, el logo del login nunca carga para quien todavia
  // no inicio sesion, porque el middleware lo redirige a /login antes de servir el archivo.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
