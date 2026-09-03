import { z } from "zod";

export const PeriodicidadEnum = z.enum(["MENSUAL", "QUINCENAL", "TRIMESTRAL", "ANUAL", "POR_EVENTO"]);

export const ServicioSchema = z.object({
  proveedor: z.string().trim().min(1, "Ingresá el proveedor."),
  cuit: z.string().trim().min(1, "Ingresá el CUIT."),
  area: z.string().trim().min(1, "Ingresá el área."),
  descripcion: z.string().trim().min(1, "Ingresá una descripción."),
  responsableOperativoId: z.string().min(1, "Elegí un responsable."),
  precioVigente: z.coerce.number().positive("El precio debe ser mayor a 0."),
  periodicidad: PeriodicidadEnum,
  actualizacionFrecuencia: z.string().trim().optional(),
  actualizacionBase: z.string().trim().optional(),
  vigenteDesde: z.string().min(1, "Ingresá la fecha de vigencia."),
  duracionEnPeriodos: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
});

/** Edicion de un servicio existente: nunca incluye precioVigente (solo cambia via solicitud). */
export const ServicioEdicionSchema = ServicioSchema.omit({
  responsableOperativoId: true,
  precioVigente: true,
});

export const CertificacionSchema = z.object({
  prestacionId: z.string().min(1),
  estado: z.enum(["CUMPLIDO", "PARCIAL", "NO_CUMPLIDO"]),
  observacion: z.string().trim().optional(),
});

export const FacturaSchema = z.object({
  servicioId: z.string().min(1, "Elegí un servicio."),
  numeroFactura: z.string().trim().min(1, "Ingresá el número de factura."),
  fechaFactura: z.string().min(1, "Ingresá la fecha de la factura."),
  importeFacturado: z.coerce.number().positive("El importe debe ser mayor a 0."),
  periodoModo: z.enum(["periodos", "a_confirmar"]),
  periodoIds: z.array(z.string()).optional(),
  anticipoId: z.string().trim().optional(),
  varianteAplicacionAnticipo: z.enum(["SALDO_RESTANTE", "TOTAL_CON_CREDITO"]).optional(),
});

export const SolicitudPrecioSchema = z.object({
  servicioId: z.string().min(1),
  precioPropuesto: z.coerce.number().positive("El precio propuesto debe ser mayor a 0."),
  observaciones: z.string().trim().min(1, "Contá por qué corresponde el cambio de precio."),
});

export const AnticipoSchema = z.object({
  proveedor: z.string().trim().min(1, "Ingresá el proveedor."),
  cuit: z.string().trim().min(1, "Ingresá el CUIT."),
  numeroProforma: z.string().trim().min(1, "Ingresá el número de proforma."),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0."),
  fechaEstimadaEntrega: z.string().trim().optional(),
});
