const PASOS = [
  {
    paso: "1. Alta o edición del servicio",
    quien: "Responsable operativo",
    cuando: "Al contratar el servicio, o cuando cambian sus condiciones",
    que: "Carga proveedor, precio acordado, periodicidad y base de actualización.",
  },
  {
    paso: "2. Generación del período",
    quien: "Sistema (job automático o botón del administrador)",
    cuando: "Al iniciar cada mes, quincena, trimestre o año, según la periodicidad",
    que: "Crea el registro de prestación en estado \"Pendiente\", antes de que exista cualquier factura.",
  },
  {
    paso: "3. El proveedor presta el servicio",
    quien: "Proveedor",
    cuando: "Durante el período",
    que: "—",
  },
  {
    paso: "4. Certificación de la prestación",
    quien: "Responsable operativo",
    cuando: "Apenas termina el período, sin esperar la factura",
    que: "Marca el período como Cumplido, Parcial o No cumplido, con observación si no fue Cumplido.",
  },
  {
    paso: "5. Registro de la factura",
    quien: "Analista de Cuentas a Pagar",
    cuando: "Cuando llega la factura del proveedor",
    que: "La asocia al servicio y elige el o los períodos que cubre. Si no está claro, la marca \"a confirmar\".",
  },
  {
    paso: "6. Confirmación de precio",
    quien: "Analista de Cuentas a Pagar",
    cuando: "Después de registrar la factura",
    que: "El sistema calcula si el importe coincide con precio acordado × cantidad de períodos; el analista confirma o deriva la excepción.",
  },
  {
    paso: "7. Resolución de excepciones (si las hay)",
    quien: "Responsable operativo o Compras, según el caso",
    cuando: "Mientras la excepción esté abierta",
    que: "Período a confirmar y conflicto de precio (por defecto) los resuelve el responsable operativo. Cumplimiento parcial lo resuelve Compras.",
  },
  {
    paso: "8. Autorización",
    quien: "Gerencia",
    cuando: "Cuando la factura ya pasó prestación y precio",
    que: "Autoriza el pago o rechaza la factura con motivo.",
  },
  {
    paso: "9. Pago",
    quien: "Tesorería",
    cuando: "Después de la autorización",
    que: "Marca la factura como pagada y genera el número de comprobante.",
  },
];

export default function InstructivoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Instructivo del circuito</h1>
        <p className="text-slate-500">
          Circuito de aprobación de facturas de servicio sin orden de compra ni remito (alquileres, seguridad e
          higiene, transporte de personal, honorarios, mantenimiento, etc.).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Paso</th>
              <th className="px-4 py-3">Quién lo completa</th>
              <th className="px-4 py-3">Cuándo</th>
              <th className="px-4 py-3">Qué hace</th>
            </tr>
          </thead>
          <tbody>
            {PASOS.map((p) => (
              <tr key={p.paso} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{p.paso}</td>
                <td className="px-4 py-3 text-slate-600">{p.quien}</td>
                <td className="px-4 py-3 text-slate-600">{p.cuando}</td>
                <td className="px-4 py-3 text-slate-600">{p.que}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-900">
          ¿Por qué se certifica la prestación antes de que llegue la factura?
        </h2>
        <p className="text-sm text-slate-600">
          Hoy nadie constata de forma sistemática que un servicio se prestó antes de pagar su factura. Si se espera
          a la factura para preguntar &quot;¿esto se cumplió?&quot;, la respuesta suele ser un trámite apurado y sin
          respaldo. Certificar apenas termina el período —sin depender de cuándo llega el papel— separa dos
          preguntas distintas: si el servicio se prestó (control de prestación) y si el importe facturado es
          correcto (control de precio). Son controles de naturaleza distinta y pueden dar resultados independientes:
          un mes puede estar perfectamente prestado y aun así tener un precio mal facturado, o viceversa.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-900">
          ¿Por qué la clave es servicio + período, y no el número de factura?
        </h2>
        <p className="text-sm text-slate-600">
          El número de factura es un dato que decide el proveedor, no el circuito interno: cada proveedor numera
          como quiere, puede facturar más de un período junto, o corregir una factura con otro número. Si el
          control se basara en el número de factura, cualquier error de numeración rompería la trazabilidad. En
          cambio, &quot;este servicio, en este período&quot; es una unidad de control estable que existe desde
          antes de que la factura llegue —por eso el período se certifica primero— y permite comparar siempre
          contra una condición de referencia real (el precio acordado), en vez de arrastrar el error del mes
          anterior como pasaba antes.
        </p>
      </section>
    </div>
  );
}
