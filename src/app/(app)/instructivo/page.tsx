const PASOS_B = [
  {
    paso: "1. Propuesta de servicio",
    quien: "Responsable operativo",
    cuando: "Al contratar el servicio",
    que: "Carga proveedor, precio propuesto, periodicidad y base de actualización. Queda \"Pendiente de aprobación\".",
  },
  {
    paso: "2. Aprobación del servicio",
    quien: "Gerencia",
    cuando: "Antes de que el servicio pueda generar períodos o admitir facturas",
    que: "Aprueba (pasa a Activo) o rechaza con motivo (el responsable puede volver a proponerlo).",
  },
  {
    paso: "3. Generación del período",
    quien: "Sistema (job automático o botón del administrador)",
    cuando: "Al iniciar cada mes, quincena, trimestre o año, solo para servicios Activos",
    que: "Crea el registro de prestación en estado \"Pendiente\", antes de que exista cualquier factura.",
  },
  {
    paso: "4. Certificación de la prestación",
    quien: "Responsable operativo",
    cuando: "Apenas termina el período, sin esperar la factura",
    que: "Marca Cumplido, Parcial o No cumplido. Si es Parcial, después carga el importe esperado ajustado que negoció con el proveedor.",
  },
  {
    paso: "5. Registro de la factura",
    quien: "Analista de Cuentas a Pagar",
    cuando: "Cuando llega la factura, contra un servicio Activo",
    que: "La asocia al período (o la marca \"a confirmar\") y confirma si el importe coincide con lo esperado.",
  },
  {
    paso: "6. Excepción de precio (si no coincide)",
    quien: "Analista, y si hace falta Gerencia",
    cuando: "Mientras el conflicto esté abierto",
    que: "El Analista gestiona la corrección directo con el proveedor. Si no llega a tiempo, pide una autorización excepcional puntual a Gerencia.",
  },
  {
    paso: "7. Cambio de precio permanente",
    quien: "Responsable operativo, aprueba Gerencia",
    cuando: "Cuando el aumento corresponde a una condición real del contrato",
    que: "El responsable eleva una solicitud de cambio de precio. Es la única forma en que cambia el precio vigente del servicio.",
  },
  {
    paso: "8. Autorización de pago",
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

const PASOS_C = [
  {
    paso: "1. Solicitud de anticipo",
    quien: "Compras",
    cuando: "Cuando el proveedor exige un anticipo y envía una proforma",
    que: "Carga proveedor, número de proforma y monto. Va directo a Tesorería — no pasa por el Analista, todavía no hay factura fiscal.",
  },
  {
    paso: "2. Autorización (si supera el umbral)",
    quien: "Gerencia",
    cuando: "Solo si el monto supera el umbral configurado",
    que: "Autoriza antes de que Tesorería pueda pagar.",
  },
  {
    paso: "3. Pago del anticipo",
    quien: "Tesorería",
    cuando: "Después de la autorización (o directo, si no la necesitaba)",
    que: "Ejecuta el pago contra la proforma y queda registrado en el tracking de anticipos.",
  },
  {
    paso: "4. Llega la factura real",
    quien: "Analista de Cuentas a Pagar",
    cuando: "Cuando llega la mercadería/servicio y su factura fiscal",
    que: "Busca en el tracking si hay un anticipo sin aplicar de ese proveedor y lo vincula: por el saldo restante, o por el total con el anticipo como crédito.",
  },
];

export default function InstructivoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Instructivo del circuito</h1>
        <p className="text-slate-500">
          SERTEC cubre dos circuitos: servicios sin orden de compra ni remito (categoría B — alquileres, seguridad
          e higiene, transporte de personal, honorarios, mantenimiento) y el registro de anticipos a proveedores
          que los exigen antes de entregar (categoría C).
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Categoría B — servicios</h2>
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
              {PASOS_B.map((p) => (
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
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Categoría C — anticipos</h2>
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
              {PASOS_C.map((p) => (
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
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-900">
          ¿Por qué se certifica la prestación antes de que llegue la factura?
        </h2>
        <p className="text-sm text-slate-600">
          Hoy nadie constata de forma sistemática que un servicio se prestó antes de pagar su factura. Certificar
          apenas termina el período —sin depender de cuándo llega el papel— separa dos preguntas distintas: si el
          servicio se prestó (control de prestación) y si el importe facturado es correcto (control de precio). Son
          controles de naturaleza distinta y pueden dar resultados independientes: un mes puede estar perfectamente
          prestado y aun así tener un precio mal facturado, o viceversa.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-900">
          ¿Por qué la clave es servicio + período, y no el número de factura?
        </h2>
        <p className="text-sm text-slate-600">
          El número de factura es un dato que decide el proveedor, no el circuito interno: cada proveedor numera
          como quiere, puede facturar más de un período junto, o corregir una factura con otro número. En cambio,
          &quot;este servicio, en este período&quot; es una unidad de control estable que existe desde antes de que
          la factura llegue. El número de factura sí sirve como clave para conciliar contra el sistema contable
          (reporte de conciliación de pagos), pero no es la clave de control interno.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-900">¿Por qué el precio nunca se edita directo?</h2>
        <p className="text-sm text-slate-600">
          Antes, cualquiera con acceso podía cambiar el precio de referencia de un servicio, y un error de carga se
          arrastraba mes a mes sin que nadie lo notara. Ahora el precio vigente solo cambia si Gerencia aprueba una
          solicitud de cambio de precio formal, con motivo, y queda en el historial. Un conflicto de precio puntual
          (una factura que no coincide) no cambia el precio de referencia — se resuelve corrigiendo esa factura
          puntual o, si hace falta, con una autorización excepcional también de Gerencia.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-900">
          ¿Rechazar o dejar pendiente? (Gerencia y control de precio)
        </h2>
        <p className="text-sm text-slate-600">
          &quot;Rechazar&quot; es una decisión terminal: la factura queda marcada como rechazada y no avanza sola.
          Si lo que se necesita es postergar la decisión unos días (por ejemplo, esperar caja), no hace falta
          rechazar nada — alcanza con no tocar la factura, que sigue esperando en la cola de quien tiene que
          actuar. Una factura rechazada por error se puede reabrir desde Administrador → Facturas rechazadas, con
          motivo y queda registrado en la auditoría.
        </p>
      </section>
    </div>
  );
}
