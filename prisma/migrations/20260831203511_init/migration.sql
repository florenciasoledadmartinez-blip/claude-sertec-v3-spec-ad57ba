-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('RESPONSABLE_OPERATIVO', 'ANALISTA_CXP', 'COMPRAS', 'GERENCIA', 'TESORERIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "Periodicidad" AS ENUM ('MENSUAL', 'QUINCENAL', 'TRIMESTRAL', 'ANUAL', 'POR_EVENTO');

-- CreateEnum
CREATE TYPE "EstadoPrestacion" AS ENUM ('PENDIENTE', 'CUMPLIDO', 'PARCIAL', 'NO_CUMPLIDO');

-- CreateEnum
CREATE TYPE "TipoResolucionParcial" AS ENUM ('NOTA_CREDITO', 'PAGO_PARCIAL', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "PrecioEstado" AS ENUM ('PENDIENTE_CONFIRMAR', 'COINCIDE', 'CONFLICTO');

-- CreateEnum
CREATE TYPE "ResolutorConflicto" AS ENUM ('RESPONSABLE_OPERATIVO', 'COMPRAS');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "area" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "role" "RoleName" NOT NULL,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsableOperativoId" TEXT NOT NULL,
    "precioVigente" DECIMAL(14,2) NOT NULL,
    "periodicidad" "Periodicidad" NOT NULL,
    "actualizacionFrecuencia" TEXT,
    "actualizacionBase" TEXT,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "duracionEnPeriodos" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialPrecio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "precioAnterior" DECIMAL(14,2) NOT NULL,
    "precioNuevo" DECIMAL(14,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "cambiadoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestacion" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" "EstadoPrestacion" NOT NULL DEFAULT 'PENDIENTE',
    "validadoPorId" TEXT,
    "fecha" TIMESTAMP(3),
    "observacion" TEXT,
    "creadoManualmente" BOOLEAN NOT NULL DEFAULT false,
    "resolucionParcialTipo" "TipoResolucionParcial",
    "resolucionParcialDetalle" TEXT,
    "resolucionParcialImporteAjustado" DECIMAL(14,2),
    "resolucionParcialResueltoPorId" TEXT,
    "resolucionParcialFecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "periodoAConfirmar" BOOLEAN NOT NULL DEFAULT false,
    "numeroFactura" TEXT NOT NULL,
    "fechaFactura" TIMESTAMP(3) NOT NULL,
    "importeFacturado" DECIMAL(14,2) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" TEXT NOT NULL,
    "precioEstado" "PrecioEstado" NOT NULL DEFAULT 'PENDIENTE_CONFIRMAR',
    "rechazadaPrecio" BOOLEAN NOT NULL DEFAULT false,
    "rechazadaPrecioMotivo" TEXT,
    "rechazadaPrecioPorId" TEXT,
    "rechazadaPrecioFecha" TIMESTAMP(3),
    "rechazadaGerencia" BOOLEAN NOT NULL DEFAULT false,
    "rechazadaGerenciaMotivo" TEXT,
    "rechazadaGerenciaPorId" TEXT,
    "rechazadaGerenciaFecha" TIMESTAMP(3),
    "autorizado" BOOLEAN NOT NULL DEFAULT false,
    "autorizadoPorId" TEXT,
    "autorizadoFecha" TIMESTAMP(3),
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "comprobanteNumero" TEXT,
    "comprobanteFecha" TIMESTAMP(3),
    "pagadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaPeriodo" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "prestacionId" TEXT NOT NULL,

    CONSTRAINT "FacturaPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigSistema" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "resolutorConflictoPrecio" "ResolutorConflicto" NOT NULL DEFAULT 'RESPONSABLE_OPERATIVO',
    "slaConflictoPrecioDias" INTEGER NOT NULL DEFAULT 3,
    "slaCumplimientoParcialDias" INTEGER NOT NULL DEFAULT 5,
    "slaPeriodoAConfirmarDias" INTEGER NOT NULL DEFAULT 2,
    "presupuestoContratoActivo" BOOLEAN NOT NULL DEFAULT false,
    "fechaCorte" TIMESTAMP(3) NOT NULL DEFAULT '2026-04-01 00:00:00 +00:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioRol_usuarioId_role_key" ON "UsuarioRol"("usuarioId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Prestacion_servicioId_periodo_key" ON "Prestacion"("servicioId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_servicioId_numeroFactura_key" ON "Factura"("servicioId", "numeroFactura");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaPeriodo_facturaId_prestacionId_key" ON "FacturaPeriodo"("facturaId", "prestacionId");

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_responsableOperativoId_fkey" FOREIGN KEY ("responsableOperativoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPrecio" ADD CONSTRAINT "HistorialPrecio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPrecio" ADD CONSTRAINT "HistorialPrecio_cambiadoPorId_fkey" FOREIGN KEY ("cambiadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestacion" ADD CONSTRAINT "Prestacion_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestacion" ADD CONSTRAINT "Prestacion_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestacion" ADD CONSTRAINT "Prestacion_resolucionParcialResueltoPorId_fkey" FOREIGN KEY ("resolucionParcialResueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_rechazadaPrecioPorId_fkey" FOREIGN KEY ("rechazadaPrecioPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_rechazadaGerenciaPorId_fkey" FOREIGN KEY ("rechazadaGerenciaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_pagadoPorId_fkey" FOREIGN KEY ("pagadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaPeriodo" ADD CONSTRAINT "FacturaPeriodo_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaPeriodo" ADD CONSTRAINT "FacturaPeriodo_prestacionId_fkey" FOREIGN KEY ("prestacionId") REFERENCES "Prestacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
