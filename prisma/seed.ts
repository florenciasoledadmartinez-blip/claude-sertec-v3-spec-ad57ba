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

async function main() {
  await prisma.configSistema.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const responsable1 = await usuario(
    "Marcos Ibarra",
    "marcos.ibarra@sertec.com",
    "Operaciones",
    ["RESPONSABLE_OPERATIVO"]
  );
  const responsable2 = await usuario(
    "Lucía Fernández",
    "lucia.fernandez@sertec.com",
    "RRHH",
    ["RESPONSABLE_OPERATIVO"]
  );
  const analista = await usuario(
    "Diego Torres",
    "diego.torres@sertec.com",
    "Adm y Finanzas",
    ["ANALISTA_CXP"]
  );
  await usuario("Valeria Gómez", "valeria.gomez@sertec.com", "Compras", ["COMPRAS"]);
  await usuario("Roberto Paz", "roberto.paz@sertec.com", "Gerencia", ["GERENCIA"]);
  await usuario("Sofía Núñez", "sofia.nunez@sertec.com", "Tesorería", ["TESORERIA"]);
  await usuario("Admin SERTEC", "admin@sertec.com", "Sistemas", ["ADMIN"]);

  // --- Servicio 1: limpieza y seguridad e higiene (mensual) ---
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
      vigenteDesde: new Date("2026-04-01"),
      duracionEnPeriodos: null,
    },
  });
  await prisma.historialPrecio.create({
    data: {
      servicioId: s1.id,
      precioAnterior: 140000,
      precioNuevo: 150000,
      motivo: "Actualización anual por IPC",
      cambiadoPorId: responsable1.id,
      fecha: new Date("2026-04-01"),
    },
  });

  const s1_04 = await prisma.prestacion.create({
    data: { servicioId: s1.id, periodo: "2026-04", estado: "CUMPLIDO", validadoPorId: responsable1.id, fecha: new Date("2026-05-01") },
  });
  const s1_05 = await prisma.prestacion.create({
    data: { servicioId: s1.id, periodo: "2026-05", estado: "CUMPLIDO", validadoPorId: responsable1.id, fecha: new Date("2026-06-01") },
  });
  const s1_06 = await prisma.prestacion.create({
    data: {
      servicioId: s1.id,
      periodo: "2026-06",
      estado: "PARCIAL",
      validadoPorId: responsable1.id,
      fecha: new Date("2026-07-01"),
      observacion: "No se cubrió el turno noche durante 6 días por falta de personal del proveedor.",
    },
  });
  const s1_07 = await prisma.prestacion.create({
    data: { servicioId: s1.id, periodo: "2026-07", estado: "CUMPLIDO", validadoPorId: responsable1.id, fecha: new Date("2026-08-01") },
  });
  await prisma.prestacion.create({
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
      vigenteDesde: new Date("2026-04-01"),
      duracionEnPeriodos: 12,
    },
  });
  const s2_04 = await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-04", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: new Date("2026-05-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-05", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: new Date("2026-06-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-06", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: new Date("2026-07-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-07", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: new Date("2026-08-01") },
  });
  await prisma.prestacion.create({
    data: { servicioId: s2.id, periodo: "2026-08", estado: "PENDIENTE" },
  });

  // --- Servicio 3: transporte de personal (quincenal) ---
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
      vigenteDesde: new Date("2026-05-01"),
    },
  });
  const s3_ago_q1 = await prisma.prestacion.create({
    data: {
      servicioId: s3.id,
      periodo: "2026-08-Q1",
      estado: "NO_CUMPLIDO",
      validadoPorId: responsable2.id,
      fecha: new Date("2026-08-16"),
      observacion: "El proveedor no prestó el servicio entre el 3 y el 10/08 por paro de choferes; no hubo reposición.",
    },
  });
  const s3_ago_q2 = await prisma.prestacion.create({
    data: { servicioId: s3.id, periodo: "2026-08-Q2", estado: "CUMPLIDO", validadoPorId: responsable2.id, fecha: new Date("2026-08-31") },
  });

  // --- Facturas: una por cada estado relevante del motor ---

  // F1: lista para autorizar (precio coincide, prestación cumplida, sin autorizar)
  const f1 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012340",
      fechaFactura: new Date("2026-05-03"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f1.id, prestacionId: s1_04.id } });

  // F2: autorizada, pendiente de pago
  const f2 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012410",
      fechaFactura: new Date("2026-06-02"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
      autorizado: true,
      autorizadoFecha: new Date("2026-06-05"),
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f2.id, prestacionId: s1_05.id } });

  // F3: conflicto - cumplimiento parcial (cola Compras)
  const f3 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012480",
      fechaFactura: new Date("2026-07-03"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f3.id, prestacionId: s1_06.id } });

  // F4: conflicto de precio (importe no coincide con precio vigente)
  const f4 = await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012550",
      fechaFactura: new Date("2026-08-02"),
      importeFacturado: 160000,
      registradoPorId: analista.id,
      precioEstado: "CONFLICTO",
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f4.id, prestacionId: s1_07.id } });

  // F5: período a confirmar (el analista no supo a qué mes asignarla)
  await prisma.factura.create({
    data: {
      servicioId: s1.id,
      numeroFactura: "0001-00012600",
      fechaFactura: new Date("2026-08-20"),
      importeFacturado: 150000,
      registradoPorId: analista.id,
      periodoAConfirmar: true,
    },
  });

  // F6: pagada (Tesorería ya emitió comprobante)
  const f6 = await prisma.factura.create({
    data: {
      servicioId: s2.id,
      numeroFactura: "0002-00098100",
      fechaFactura: new Date("2026-05-03"),
      importeFacturado: 400000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
      autorizado: true,
      autorizadoFecha: new Date("2026-05-06"),
      pagado: true,
      comprobanteNumero: "PAG-2026-000045",
      comprobanteFecha: new Date("2026-05-10"),
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f6.id, prestacionId: s2_04.id } });

  // F7: rechazada — no se prestó el servicio (bloqueo automático)
  const f7 = await prisma.factura.create({
    data: {
      servicioId: s3.id,
      numeroFactura: "0003-00055210",
      fechaFactura: new Date("2026-08-18"),
      importeFacturado: 80000,
      registradoPorId: analista.id,
      precioEstado: "COINCIDE",
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f7.id, prestacionId: s3_ago_q1.id } });

  // F8: pendiente de validar prestación (llegó la factura antes de certificar el período)
  const f8 = await prisma.factura.create({
    data: {
      servicioId: s3.id,
      numeroFactura: "0003-00055260",
      fechaFactura: new Date("2026-08-31"),
      importeFacturado: 80000,
      registradoPorId: analista.id,
      precioEstado: "PENDIENTE_CONFIRMAR",
    },
  });
  await prisma.facturaPeriodo.create({ data: { facturaId: f8.id, prestacionId: s3_ago_q2.id } });

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
