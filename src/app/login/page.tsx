import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <Image src="/logo-sertec.png" alt="SERTEC Global" width={300} height={112} priority className="mb-3 h-10 w-auto" />
        <p className="mb-6 text-sm text-slate-500">
          Circuito de aprobación de facturas de servicio
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
