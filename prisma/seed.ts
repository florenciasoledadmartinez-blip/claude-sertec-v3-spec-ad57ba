import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "sertec123";

async function usuario(
  nombre: string,
  email: string,
  area: string,
  roles: (
    | "RESPONSABLE_OPERATIVO"
    | "ANALISTA_CXP"
    | "COMPRAS"
    | "GERENCIA"
    | "TESORERIA"
    | "ADMIN"
  )[]
) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nombre,
      email,
      area,
      passwordHash,
      roles: { create: roles.map((role) => ({ role })) },
    },
  });
}

function fecha(iso: string) {
  return new Date(iso);
}

async function main() {
  await prisma.configSistema.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const responsable1 = await usuario("Marcos Ibarra", "marcos.ibarra@sertec.com", "Operaciones", [
    "RESPONSABLE_OPERATIVO",
  ]);
  const responsable2 = await usuario("Lucía Fernández", "lucia.fernandez@sertec.com", "RRHH", [
    "RESPONSABLE_OPERATIVO",
  ]);
  const analista = await usuario("Diego Torres", "diego.torres@sertec.com", "Adm y Finanzas", ["ANALISTA_CXP"]);
  const compras = await usuario("Valeria Gómez", "valeria.gomez@sertec.com", "Compras", ["COMPRAS"]);
  const gerente = await usuario("Roberto Paz", "roberto.paz@sertec.com", "Gerencia", ["GERENCIA"]);
  const tesorero = await usuario("Sofía Núñez", "sofia.nunez@sertec.com", "Tesorería", ["TESORERIA"]);
  await usuario("Admin SERTEC", "admin@sertec.com", "Sistemas", ["ADMIN"]);

  // --- Servicio 1: limpieza y seguridad e higiene (mensual, activo) ---
  const s1 = await prisma.servicio.create({
    data: {
      proveedor: "CleanCo SRL",
      cuit: "30-71234567-8",
      area: "Operaciones",
      descripcion: "Limpieza y seguridad e higiene de planta",
      responsableOperativoId: responsable1.id,
      precioVigente: 150000,
      periodicidad: "MENSUAL",
      actualizacionFrecuencia: "Anual",
      actualizacionBase: "IPC INDEC",
      vigenteDesde: fecha("2026-04-01"),
      estado: "ACTIVO",
      aprobadoPorId: gerente.id,
      fechaAprobacion: fecha("2026-03-28"),
    },
  });
  await prisma.historialPrecio.create({
    data: {
      servicioId: s1.id,
      precioAnterior: 140000,
      precioNuevo: 150000,
      motivo: "Actualización anual por IPC",
      origen: "SOLICITUD_CAMBIO_PRECIO",
      cambiadoPorId: gerente.id,
      fecha: fecha("2026-04-01"),
    },
  });

  const s1_04 = await prisma.prestacion.create({
    data: { servicioId: s1.id, periodo: "2026-04", estado: "CUMPLIDO", validadoPorId: responsable1.id, fecha: fecha("2026-05-01") },
  });
  const s1_05 = await prisma.prestacion.create({
    data: { servicioId: s1.id, periodo: "2026-05", estado: "CUMPLIDO", validadoPorId: responsable1.id, fecha: fecha("2026-06-01") },
  });
  const s1_06 = await prisma.prestacion.create({
    data: {
      servicioId: s1.id,
      periodo: "2026-06",
      estado: "PARCIAL",
      validadoPorId: responsable1.id,
      fecha: fecha("2026-07-01"),
      observacion: "No se cubrió el turno noche durante 6 días por falta de personal del proveedor.",
    },
  });
  const s1_07 = await prisma.prestacion.create({
    data: {
      servicioId: s1.id,
      periodo: "2026-07",
      estado: "PARCIAL",
      validadoPorId: responsable1.id,
      fecha: fecha("2026-08-01"),
      observacion: "Cubrieron parcialmente el turno tarde.",
      importeEsperadoAjustado: 140000,
    },
  });
  const s1_08 = await prisma.prestacion.create({
    data: { servicioId: s1.id, periodo: "2026-08", estado: "PENDIENTE" },
  });

  // --- Servicio 2: alquiler de depósito (mensual, con presupuesto de contrato) ---
  const s2 = await prisma.servicio.create({
    data: {
      proveedor: "Inversiones del Sur SA",
      cuit: "30-70998877-1",
      area: "Adm y Finanzas",
      descripcion: "Alquiler de depósito logístico",
      responsableOperativoId: responsable2.id,
      precioVigente: 400000,
      periodicidad: "MENSUAL",
      actualizacionFrecuencia: "Semestral",
      actualizacionBase: "Contrato de locación",
      vigenteDesde: fecha("2026-04-01"),
      duracionEnPeriodos: 12,
      estado: "ACTIVO",
      aprobadoPorId: gerente.id,
      fechaAprobacion: fecha("2026-03-28"),
    },
  });
  const s2_04 = await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-04", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: fecha("2026-05-01") },
  });
  const s2_05 = await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-05", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: fecha("2026-06-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-06", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: fecha("2026-07-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-07", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: fecha("2026-08-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-08", estado: "PENDIENTE" },
  });

  // --- Servicio 3: transporte de personal (quincenal, activo) ---
  const s3 = await prisma.servicio.create({
    data: {
      proveedor: "Transportes Rápido SRL",
      cuit: "30-69887766-4",
      area: "RRHH",
      descripcion: "Transporte de personal turno mañana y tarde",
      responsableOperativoId: responsable2.id,
      precioVigente: 80000,
      periodicidad: "QUINCENAL",
      actualizacionFrecuencia: "Trimestral",
      actualizacionBase: "Costo combustible + km recorridos",
      vigenteDesde: fecha("2026-05-01"),
      estado: "ACTIVO",
      aprobadoPorId: gerente.id,
      fechaAprobacion: fecha("2026-04-25"),
    },
  });
  const s3_ago_q1 = await prisma.prestacion.create({
    data: {
      servicioId: s3.id,
      periodo: "2026-08-Q1",
      estado: "NO_CUMPLIDO",
      validadoPorId: responsable2.id,
      fecha: fecha("2026-08-16"),
      observacion: "El proveedor no prestó el servicio entre el 3 y el 10/08 por paro de choferes; no hubo reposición.",
    },
  });
  await prisma.prestacion.create({
    data: { servicioId: s3.id, periodo: "2026-08-Q2", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: fecha("2026-08-31") },
  });

  // --- Servicio 4: propuesto, pendiente de aprobación de Gerencia ---
  await prisma.servicio.create({
    data: {
      proveedor: "Consultora ABC",
      cuit: "30-68877665-2",
      area: "Dirección",
      descripcion: "Consultoría estratégica mensual",
      responsableOperativoId: responsable1.id,
      precioVigente: 500000,
      periodicidad: "MENSUAL",
      vigenteDesde: fecha("2026-09-01"),
      estado: "PENDIENTE_DE_APROBACION",
    },
  });

  // --- Servicio 5: rechazado por Gerencia ---
  await prisma.servicio.create({
    data: {
      proveedor: "Seguridad XYZ",
      cuit: "30-67766554-3",
      area: "Operaciones",
      descripcion: "Vigilancia perimetral nocturna",
      responsableOperativoId: responsable1.id,
      precioVigente: 600000,
      periodicidad: "MENSUAL",
      vigenteDesde: fecha("2026-09-01"),
      estado: "RECHAZADO",
      aprobadoPorId: gerente.id,
      fechaAprobacion: fecha("2026-08-20"),
      motivoRechazo: "Ya tenemos cobertura de seguridad con CleanCo, evaluar si corresponde duplicar el gasto.",
    },
  });

  // --- Solicitud de cambio de precio pendiente ---
  await prisma.solicitudCambioPrecio.create({
    data: {
      servicioId: s3.id,
      precioActual: s3.precioVigente,
      precioPropuesto: 90000,
      observaciones: "Aumento del costo de combustible acordado con el proveedor a partir de septiembre.",
      solicitadoPorId: responsable2.id,
    },
  });

  // --- Facturas: una por cada estado relevante del motor ---

  // F1: lista para autorizar, con un anticipo aplicado (saldo restante)
  const f1 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012340",
      fechaFactura: fecha("2026-05-03"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
      precioConfirmadoFecha: fecha("2026-05-04"),
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f1.id, prestacionId: s1_04.id } });

  // F2: autorizada, pendiente de pago
  const f2 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012410",
      fechaFactura: fecha("2026-06-02"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
      precioConfirmadoFecha: fecha("2026-06-03"),
      autorizado: true,
      autorizadoPorId: gerente.id,
      autorizadoFecha: fecha("2026-06-05"),
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f2.id, prestacionId: s1_05.id } });

  // F3: pendiente de ajuste del proveedor (periodo Parcial sin importe ajustado cargado)
  const f3 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012480",
      fechaFactura: fecha("2026-07-03"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f3.id, prestacionId: s1_06.id } });

  // F4: conflicto de precio (factura no coincide con el importe ajustado) con excepcion pedida
  const f4 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012550",
      fechaFactura: fecha("2026-08-02"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      precioEstado: "CONFLICTO",
      precioConfirmadoFecha: fecha("2026-08-03"),
      solicitaExcepcionPrecio: true,
      solicitaExcepcionMotivo: "El proveedor no envió la nota de crédito por los 10.000 de diferencia; se pide habilitar esta factura puntual.",
      solicitaExcepcionPorId: analista.id,
      solicitaExcepcionFecha: fecha("2026-08-10"),
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f4.id, prestacionId: s1_07.id } });

  // F5: período a confirmar
  await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012600",
      fechaFactura: fecha("2026-08-20"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      periodoAConfirmar: true,
    },
  });

  // F6: pagada
  const f6 = await prisma.factura.create({
    data: {
      servicioId: s2.id,
      numeroFactura: "0002-00098100",
      fechaFactura: fecha("2026-05-03"),
      importeFacturado: 400000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
      precioConfirmadoFecha: fecha("2026-05-04"),
      autorizado: true,
      autorizadoPorId: gerente.id,
      autorizadoFecha: fecha("2026-05-06"),
      pagado: true,
      comprobanteNumero: "PAG-2026-000045",
      comprobanteFecha: fecha("2026-05-10"),
      pagadoPorId: tesorero.id,
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f6.id, prestacionId: s2_04.id } });

  // F7: rechazada por Gerencia (para probar reapertura desde Administrador)
  const f7 = await prisma.factura.create({
    data: {
      servicioId: s2.id,
      numeroFactura: "0002-00098150",
      fechaFactura: fecha("2026-06-03"),
      importeFacturado: 400000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
      precioConfirmadoFecha: fecha("2026-06-04"),
      rechazada: true,
      rechazadaMotivo: "Se pospone: revisar primero el flujo de caja de junio.",
      rechazadaPorId: gerente.id,
      rechazadaFecha: fecha("2026-06-06"),
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f7.id, prestacionId: s2_05.id } });

  // F8: bloqueada — no se prestó el servicio
  const f8 = await prisma.factura.create({
    data: {
      servicioId: s3.id,
      numeroFactura: "0003-00055210",
      fechaFactura: fecha("2026-08-18"),
      importeFacturado: 80000,
      registradoPorId: analista.id,
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f8.id, prestacionId: s3_ago_q1.id } });

  // F9: pendiente de validar prestación (llegó antes de certificar el período)
  const f9 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012650",
      fechaFactura: fecha("2026-08-31"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f9.id, prestacionId: s1_08.id } });

  // --- Anticipos (categoría C) ---

  // A1: bajo el umbral, autorizado automáticamente, pendiente de pago
  await prisma.anticipo.create({
    data: {
      proveedor: "Materiales Norte SA",
      cuit: "30-65544332-1",
      numeroProforma: "PF-2026-0011",
      monto: 300000,
      solicitadoPorId: compras.id,
      fechaEstimadaEntrega: fecha("2026-09-15"),
      requiereAutorizacion: false,
      estado: "AUTORIZADO",
    },
  });

  // A2: supera el umbral, pendiente de autorización de Gerencia
  await prisma.anticipo.create({
    data: {
      proveedor: "Importadora Sur",
      cuit: "30-64433221-0",
      numeroProforma: "PF-2026-0012",
      monto: 800000,
      solicitadoPorId: compras.id,
      fechaEstimadaEntrega: fecha("2026-09-20"),
      requiereAutorizacion: true,
      estado: "PENDIENTE_AUTORIZACION",
    },
  });

  // A3: pagado hace más de 15 días corridos, sin aplicar (para el panel de vencimientos)
  await prisma.anticipo.create({
    data: {
      proveedor: "Repuestos Este",
      cuit: "30-63322110-9",
      numeroProforma: "PF-2026-0009",
      monto: 200000,
      solicitadoPorId: compras.id,
      fechaSolicitud: fecha("2026-08-05"),
      fechaEstimadaEntrega: fecha("2026-08-20"),
      requiereAutorizacion: false,
      estado: "PAGADO",
      pagadoPorId: tesorero.id,
      fechaPago: fecha("2026-08-10"),
    },
  });

  // A4: pagado y ya aplicado a una factura real (F1, variante saldo restante)
  const a4 = await prisma.anticipo.create({
    data: {
      proveedor: "Insumos Oeste",
      cuit: "30-62211009-8",
      numeroProforma: "PF-2026-0007",
      monto: 100000,
      solicitadoPorId: compras.id,
      fechaSolicitud: fecha("2026-04-20"),
      requiereAutorizacion: false,
      estado: "PAGADO",
      pagadoPorId: tesorero.id,
      fechaPago: fecha("2026-04-25"),
      aplicado: true,
    },
  });
  await prisma.factura.update({
    where: { id: f1.id },
    data: { anticipoId: a4.id, varianteAplicacionAnticipo: "SALDO_RESTANTE" },
  });

  console.log("Seed completado.");
  console.log(`Password de todos los usuarios de prueba: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
