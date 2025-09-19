import React, { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useForm, useFieldArray, type Path } from "react-hook-form";
import { z, type ZodTypeAny } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

/**
 * THREE SEPARATE FORMS (one per service) — TypeScript edition
 * - <SoftlabForm />
 * - <WunderGuardForm />
 * - <WunderCloudForm />
 *
 * Default export <ThreeServiceForms /> renders the three forms in tabs/columns/stacked.
 * Strongly typed with Zod + react-hook-form generics.
 */

// =========================
// Types & Schemas
// =========================
const EFFORT_TO_HOURS = { S: 8, M: 24, L: 56 } as const;

const ServiceEnum = z.enum(["Softlab", "WunderGuard", "WunderCloud"]);
export type Service = z.infer<typeof ServiceEnum>;

const ModalidadEnum = z.enum(["SaaS", "Obra por encargo"]);
export type Modalidad = z.infer<typeof ModalidadEnum>;

const NivelEnum = z.enum(["Básico", "Intermedio", "Avanzado"]);
export type Nivel = z.infer<typeof NivelEnum>;

// Normalized deliverable item
const DeliverableSchema = z.object({
  id: z.string(),
  service: ServiceEnum,
  title: z.string(),
  nivel: NivelEnum,
  modalidad: z.enum(["SaaS", "Obra por encargo", "Ambas"]).default("Ambas"),
  viable: z.boolean().default(true),
  esfuerzo: z.enum(["S", "M", "L"]).default("M"),
  evidencia: z.string().optional().default(""),
  slaImpact: z.string().optional().default(""),
  dependencias: z.array(z.string()).optional().default([]),
});
export type Deliverable = z.infer<typeof DeliverableSchema>;

export const DELIVERABLES: Deliverable[] = [
  // WunderGuard
  { id: "WG-SEC-001", service: "WunderGuard", title: "Alta + agentes endpoint + políticas base", nivel: "Básico", modalidad: "Ambas", viable: true, esfuerzo: "M", evidencia: "Inventario + políticas", slaImpact: "MTTD" },
  { id: "WG-SEC-002", service: "WunderGuard", title: "Simulaciones de phishing + awareness", nivel: "Básico", modalidad: "SaaS", viable: true, esfuerzo: "S", evidencia: "Reporte baseline", slaImpact: "Riesgo humano" },
  { id: "WG-SEC-003", service: "WunderGuard", title: "XDR con IA (detección/bloqueo)", nivel: "Intermedio", modalidad: "Ambas", viable: true, esfuerzo: "M", evidencia: "Alertas priorizadas", slaImpact: "MTTR" },
  { id: "WG-SEC-004", service: "WunderGuard", title: "Integración SIEM/SOAR + casos", nivel: "Intermedio", modalidad: "Obra por encargo", viable: true, esfuerzo: "L", evidencia: "Playbooks", slaImpact: "Automatización" },
  { id: "WG-SEC-005", service: "WunderGuard", title: "Vulnerability scanning + plan", nivel: "Intermedio", modalidad: "Ambas", viable: true, esfuerzo: "M", evidencia: "Backlog fixes", slaImpact: "Superficie" },
  { id: "WG-SEC-006", service: "WunderGuard", title: "MDR 24/7 administrado (Plan W)", nivel: "Avanzado", modalidad: "SaaS", viable: true, esfuerzo: "L", evidencia: "Reportes mensuales", slaImpact: "Cobertura 24/7" },

  // WunderCloud
  { id: "WC-OPS-001", service: "WunderCloud", title: "Landing Zone segura + cuentas", nivel: "Básico", modalidad: "Ambas", viable: true, esfuerzo: "M", evidencia: "Accesos/redes base", slaImpact: "Base SLA" },
  { id: "WC-OPS-002", service: "WunderCloud", title: "Snapshots diarios + restore validado", nivel: "Básico", modalidad: "SaaS", viable: true, esfuerzo: "S", evidencia: "Prueba restore", slaImpact: "RPO/RTO" },
  { id: "WC-OPS-003", service: "WunderCloud", title: "Observabilidad (logs/métricas/trazas) + alertas", nivel: "Intermedio", modalidad: "Ambas", viable: true, esfuerzo: "M", evidencia: "Dashboards", slaImpact: "Detección temprana" },
  { id: "WC-OPS-004", service: "WunderCloud", title: "IaC (Terraform) + CI/CD", nivel: "Intermedio", modalidad: "Obra por encargo", viable: true, esfuerzo: "L", evidencia: "Repos/pipelines", slaImpact: "Repetibilidad" },
  { id: "WC-OPS-005", service: "WunderCloud", title: "Alta disponibilidad (multi‑AZ) + failover", nivel: "Avanzado", modalidad: "Obra por encargo", viable: true, esfuerzo: "L", evidencia: "Prueba de conmutación", slaImpact: "SLA 99.99%+" },

  // Softlab
  { id: "SL-INT-001", service: "Softlab", title: "Parametrización básica de catálogos/flows", nivel: "Básico", modalidad: "SaaS", viable: true, esfuerzo: "M", evidencia: "Catálogos listos", slaImpact: "Time to run" },
  { id: "SL-INT-002", service: "Softlab", title: "SSO (OIDC/SAML) + MFA", nivel: "Intermedio", modalidad: "Ambas", viable: true, esfuerzo: "M", evidencia: "Pruebas auth", slaImpact: "Seguridad" },
  { id: "SL-INT-003", service: "Softlab", title: "Integración HL7/REST con HIS/LIS/EMR", nivel: "Intermedio", modalidad: "Obra por encargo", viable: true, esfuerzo: "L", evidencia: "Mapeos/Flujos", slaImpact: "Interoperabilidad" },
  { id: "SL-INT-004", service: "Softlab", title: "Analítica: reportes y dashboards", nivel: "Avanzado", modalidad: "Ambas", viable: true, esfuerzo: "L", evidencia: "KPIs + diccionario", slaImpact: "Decisiones" },
].map((d) => DeliverableSchema.parse(d));

// ===== Shared Base Schema
const BaseSchema = z.object({
  service: ServiceEnum,
  companyName: z.string().min(2, "Organización requerida"),
  modalidad: ModalidadEnum,
  contactTech: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(7) }),
  contactOps: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(7) }),
  systemType: z.enum(["Nuevo", "Heredado"]).default("Nuevo"),
  legacyInfo: z.object({ status: z.string().optional(), tech: z.string().optional(), version: z.string().optional(), limitations: z.string().optional() }).optional(),
  environments: z.array(z.enum(["Dev", "QA", "Prod"]).default("Prod")).min(1),
  requiresIntegrations: z.boolean().default(false),
  integrations: z.array(z.object({
    systemName: z.string().min(2),
    direction: z.enum(["Pull", "Push", "Bidireccional"]).default("Pull"),
    protocol: z.enum(["REST", "SOAP", "SFTP", "HL7", "Otro"]).default("REST"),
    auth: z.enum(["API Key", "OAuth2", "SAML", "Ninguna"]).default("OAuth2"),
    frequency: z.string().default("Diaria"),
    volume: z.string().default("Bajo"),
    dataOwner: z.string().default("")
  })).optional().default([]),
  rtoHours: z.number({ invalid_type_error: "RTO requerido" }).min(0),
  rpoHours: z.number({ invalid_type_error: "RPO requerido" }).min(0),
  maintenanceWindow: z.string().optional(),
  selectedDeliverables: z.array(z.string()).default([]),
});

// ===== Service Schemas
const SoftlabSchema = BaseSchema.extend({
  service: z.literal("Softlab"),
  sso: z.enum(["OIDC", "SAML", "LDAP", "Ninguno"]).default("OIDC"),
  mfa: z.boolean().default(true),
  dataSensitivity: z.enum(["PII", "PHI", "Mixto", "Ninguno"]).default("PII"),
  hl7: z.boolean().default(false),
});
export type SoftlabValues = z.infer<typeof SoftlabSchema>;

const WGuardSchema = BaseSchema.extend({
  service: z.literal("WunderGuard"),
  platform: z.enum(["M365", "Google Workspace"]).default("M365"),
  licenseLevel: z.string().min(1, "Nivel de licencia requerido"),
  endpoints: z.array(z.enum(["Windows", "macOS", "Linux", "Móvil"]).default("Windows")).min(1, "Selecciona al menos un endpoint"),
  xdr: z.boolean().default(true),
  phishingTraining: z.enum(["Mensual", "Trimestral", "Semestral", "Anual"]).default("Trimestral"),
  darkWeb: z.boolean().default(true),
  vulnScan: z.boolean().default(true),
});
export type WGuardValues = z.infer<typeof WGuardSchema>;

const WCloudSchema = BaseSchema.extend({
  service: z.literal("WunderCloud"),
  slaTarget: z.enum(["99.9%", "99.99%", "99.999%"]).default("99.99%"),
  snapshotsDaily: z.boolean().default(true),
  vpnNeeded: z.boolean().default(false),
});
export type WCloudValues = z.infer<typeof WCloudSchema>;

// =========================
// Generic Wizard (fully typed)
// =========================
type StepKey = "datos" | "servicio" | "integraciones" | "sla" | "entregables" | "resumen";
interface StepDef { key: StepKey; label: string }

interface GenericWizardProps<TSchema extends ZodTypeAny, TValue extends z.infer<TSchema>> {
  service: Service;
  schema: TSchema;
  defaultValues: TValue;
  deliverables: Deliverable[];
}

function GenericFormWizard<TSchema extends ZodTypeAny, TValue extends z.infer<TSchema>>(
  { service, schema, defaultValues, deliverables }: GenericWizardProps<TSchema, TValue>
) {
  const { register, handleSubmit, control, watch, formState, reset, trigger, getValues, setValue } = useForm<TValue>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });
  const { errors } = formState;
  const [step, setStep] = useState<number>(0);

  const requiresIntegrations = watch("requiresIntegrations" as Path<TValue>) as unknown as boolean;
  const systemType = watch("systemType" as Path<TValue>) as unknown as "Nuevo" | "Heredado";
  const modalidad = watch("modalidad" as Path<TValue>) as unknown as Modalidad;

  const { fields: rows, append, remove } = useFieldArray({ control, name: "integrations" as Path<TValue> });

  const steps: StepDef[] = useMemo(() => buildStepsForService(service), [service]);
  const currentStepKey = steps[step]?.key;

  const filteredDeliverables = useMemo(
    () => deliverables.filter(d => d.service === service && (d.modalidad === "Ambas" || d.modalidad === modalidad)),
    [service, modalidad, deliverables]
  );

  const selectedIds = (watch("selectedDeliverables" as Path<TValue>) as unknown as string[]) || [];
  const totalHours = selectedIds.reduce((sum, id) => {
    const d = filteredDeliverables.find(x => x.id === id);
    return d ? sum + (EFFORT_TO_HOURS[d.esfuerzo] ?? 0) : sum;
  }, 0);

  const onSubmit = () => {/* handled via JSON export */};

  const goNext = async () => {
    const fieldsToValidate = stepValidationFields(service, currentStepKey);
    // Cast to Path<TValue>[] simply for RHF typing purposes
    const ok = await trigger(fieldsToValidate as unknown as Path<TValue>[], { shouldFocus: true });
    if (!ok) return; setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const restart = () => { reset(defaultValues); setStep(0); };
  const exportJSON = () => {
    const data = getValues();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${service}-intake.json`; a.click(); URL.revokeObjectURL(url);
  };
  const selectByLevel = (nivel: Nivel) => {
    const add = filteredDeliverables.filter(d => d.nivel === nivel).map(d => d.id);
    const curr = new Set<string>(selectedIds);
    add.forEach(id => curr.add(id));
    setValue("selectedDeliverables" as Path<TValue>, Array.from(curr) as unknown as TValue[Path<TValue>]);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <header className="mb-4">
        <h2 className="text-xl font-bold">{service}</h2>
        <p className="text-gray-600 text-sm">Formulario paso a paso con validaciones y catálogo de entregables</p>
      </header>

      <nav className="grid grid-cols-7 gap-2 mb-4">
        {steps.map((st, i) => (
          <div key={st.key} className={`h-2 rounded-full ${i <= step ? "bg-black" : "bg-gray-300"}`} title={`${i+1}. ${st.label}`}></div>
        ))}
      </nav>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {currentStepKey === "datos" && (
            <Step key="datos">
              <Section title="Datos de la organización" subtitle="Responsables, modalidad y ambientes">
                <Field label="Organización" error={(errors as any)?.companyName?.message}><TextInput {...register("companyName" as Path<TValue>)} placeholder="Ej. Clinisalud S.A."/></Field>
                <Field label="Modalidad" error={(errors as any)?.modalidad?.message}><Select value={modalidad} onChange={(v)=>setValue("modalidad" as Path<TValue>, v as any)} options={["SaaS","Obra por encargo"]} /></Field>
                <Field label="Contacto técnico (nombre)" error={(errors as any)?.contactTech?.name?.message}><TextInput {...register("contactTech.name" as Path<TValue>)} /></Field>
                <Field label="Contacto técnico (email)" error={(errors as any)?.contactTech?.email?.message}><TextInput {...register("contactTech.email" as Path<TValue>)} /></Field>
                <Field label="Contacto técnico (teléfono)" error={(errors as any)?.contactTech?.phone?.message}><TextInput {...register("contactTech.phone" as Path<TValue>)} /></Field>
                <Field label="Contacto operativo (nombre)" error={(errors as any)?.contactOps?.name?.message}><TextInput {...register("contactOps.name" as Path<TValue>)} /></Field>
                <Field label="Contacto operativo (email)" error={(errors as any)?.contactOps?.email?.message}><TextInput {...register("contactOps.email" as Path<TValue>)} /></Field>
                <Field label="Contacto operativo (teléfono)" error={(errors as any)?.contactOps?.phone?.message}><TextInput {...register("contactOps.phone" as Path<TValue>)} /></Field>
                <Field label="Ambientes">
                  <div className="flex flex-wrap gap-3">
                    {["Dev","QA","Prod"].map(env => (
                      <Checkbox key={env} label={env} checked={((watch("environments" as Path<TValue>) as unknown as string[])||[]).includes(env)} onChange={(ck)=>{
                        const all = new Set<string>((watch("environments" as Path<TValue>) as unknown as string[])||[]);
                        ck ? all.add(env) : all.delete(env);
                        setValue("environments" as Path<TValue>, Array.from(all) as unknown as TValue[Path<TValue>]);
                      }} />
                    ))}
                  </div>
                </Field>
              </Section>

              <Section title="Contexto del sistema" subtitle="Nuevo vs Heredado">
                <Field label="Tipo de sistema">
                  <div className="flex gap-3">{["Nuevo","Heredado"].map(t => (
                    <Chip key={t} active={systemType===t} onClick={()=>setValue("systemType" as Path<TValue>, t as any)}>{t}</Chip>
                  ))}</div>
                </Field>
                {systemType === "Heredado" && (
                  <>
                    <Field label="Estatus actual"><TextInput {...register("legacyInfo.status" as Path<TValue>)} /></Field>
                    <Field label="Tecnología base"><TextInput {...register("legacyInfo.tech" as Path<TValue>)} /></Field>
                    <Field label="Versión"><TextInput {...register("legacyInfo.version" as Path<TValue>)} /></Field>
                    <Field label="Limitaciones"><TextInput {...register("legacyInfo.limitations" as Path<TValue>)} /></Field>
                  </>
                )}
              </Section>
            </Step>
          )}

          {currentStepKey === "servicio" && (
            <Step key="servicio">
              {service === "Softlab" && (
                <Section title="Softlab – Seguridad y datos" subtitle="Autenticación e información sensible">
                  <Field label="SSO"><Select value={watch("sso" as Path<TValue>) as unknown as string} onChange={(v)=>setValue("sso" as Path<TValue>, v as any)} options={["OIDC","SAML","LDAP","Ninguno"]} /></Field>
                  <Field label="MFA"><Toggle value={Boolean(watch("mfa" as Path<TValue>))} onChange={(v)=>setValue("mfa" as Path<TValue>, v as any)} /></Field>
                  <Field label="Sensibilidad de datos"><Select value={watch("dataSensitivity" as Path<TValue>) as unknown as string} onChange={(v)=>setValue("dataSensitivity" as Path<TValue>, v as any)} options={["PII","PHI","Mixto","Ninguno"]} /></Field>
                  <Field label="Integración HL7"><Toggle value={Boolean(watch("hl7" as Path<TValue>))} onChange={(v)=>setValue("hl7" as Path<TValue>, v as any)} /></Field>
                </Section>
              )}

              {service === "WunderGuard" && (
                <Section title="WunderGuard – Plataforma y cobertura" subtitle="Requisitos base">
                  <Field label="Plataforma"><Select value={watch("platform" as Path<TValue>) as unknown as string} onChange={(v)=>setValue("platform" as Path<TValue>, v as any)} options={["M365","Google Workspace"]} /></Field>
                  <Field label="Nivel de licencia"><TextInput placeholder="Ej. M365 E5" {...register("licenseLevel" as Path<TValue>)} /><span className="text-xs text-red-600">{(errors as any)?.licenseLevel?.message as ReactNode}</span></Field>
                  <Field label="Endpoints cubiertos">
                    <div className="flex flex-wrap gap-3">{["Windows","macOS","Linux","Móvil"].map(e => (
                      <Checkbox key={e} label={e} checked={((watch("endpoints" as Path<TValue>) as unknown as string[])||[]).includes(e)} onChange={(ck)=>{ const all = new Set<string>((watch("endpoints" as Path<TValue>) as unknown as string[])||[]); ck ? all.add(e) : all.delete(e); setValue("endpoints" as Path<TValue>, Array.from(all) as unknown as TValue[Path<TValue>]); }} />
                    ))}</div>
                    <span className="text-xs text-red-600">{(errors as any)?.endpoints?.message as ReactNode}</span>
                  </Field>
                  <Field label="XDR activo"><Toggle value={Boolean(watch("xdr" as Path<TValue>))} onChange={(v)=>setValue("xdr" as Path<TValue>, v as any)} /></Field>
                  <Field label="Simulaciones de phishing"><Select value={watch("phishingTraining" as Path<TValue>) as unknown as string} onChange={(v)=>setValue("phishingTraining" as Path<TValue>, v as any)} options={["Mensual","Trimestral","Semestral","Anual"]} /></Field>
                  <Field label="Dark Web Monitoring"><Toggle value={Boolean(watch("darkWeb" as Path<TValue>))} onChange={(v)=>setValue("darkWeb" as Path<TValue>, v as any)} /></Field>
                  <Field label="Vulnerability Scanning periódico"><Toggle value={Boolean(watch("vulnScan" as Path<TValue>))} onChange={(v)=>setValue("vulnScan" as Path<TValue>, v as any)} /></Field>
                </Section>
              )}

              {service === "WunderCloud" && (
                <Section title="WunderCloud – SLA y red" subtitle="Objetivos de resiliencia y conectividad">
                  <Field label="SLA objetivo"><Select value={watch("slaTarget" as Path<TValue>) as unknown as string} onChange={(v)=>setValue("slaTarget" as Path<TValue>, v as any)} options={["99.9%","99.99%","99.999%"]} /></Field>
                  <Field label="Snapshots diarios"><Toggle value={Boolean(watch("snapshotsDaily" as Path<TValue>))} onChange={(v)=>setValue("snapshotsDaily" as Path<TValue>, v as any)} /></Field>
                  <Field label="¿Requiere VPN?"><Toggle value={Boolean(watch("vpnNeeded" as Path<TValue>))} onChange={(v)=>setValue("vpnNeeded" as Path<TValue>, v as any)} /></Field>
                </Section>
              )}
            </Step>
          )}

          {currentStepKey === "integraciones" && (
            <Step key="integraciones">
              <Section title="Integraciones" subtitle="Define conexiones con sistemas internos/externos">
                <Field label="¿Requiere integraciones?"><Toggle value={Boolean(requiresIntegrations)} onChange={(v)=>setValue("requiresIntegrations" as Path<TValue>, v as any)} /></Field>
                {requiresIntegrations && (
                  <div className="md:col-span-2">
                    <div className="rounded-xl border p-4 space-y-4">
                      {rows.map((r, idx) => (
                        <div key={r.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <Field label="Sistema"><TextInput {...register(`integrations.${idx}.systemName` as Path<TValue>)} /></Field>
                          <Field label="Dirección"><Select value={(watch(`integrations.${idx}.direction` as Path<TValue>) as unknown as string) || "Pull"} onChange={(v)=>setValue(`integrations.${idx}.direction` as Path<TValue>, v as any)} options={["Pull","Push","Bidireccional"]} /></Field>
                          <Field label="Protocolo"><Select value={(watch(`integrations.${idx}.protocol` as Path<TValue>) as unknown as string) || "REST"} onChange={(v)=>setValue(`integrations.${idx}.protocol` as Path<TValue>, v as any)} options={["REST","SOAP","SFTP","HL7","Otro"]} /></Field>
                          <Field label="Auth"><Select value={(watch(`integrations.${idx}.auth` as Path<TValue>) as unknown as string) || "OAuth2"} onChange={(v)=>setValue(`integrations.${idx}.auth` as Path<TValue>, v as any)} options={["API Key","OAuth2","SAML","Ninguna"]} /></Field>
                          <Field label="Frecuencia"><TextInput placeholder="Ej. cada hora" {...register(`integrations.${idx}.frequency` as Path<TValue>)} /></Field>
                          <Field label="Volumen"><TextInput placeholder="Ej. 10k/día" {...register(`integrations.${idx}.volume` as Path<TValue>)} /></Field>
                          <Field label="Data Owner"><TextInput placeholder="Ej. Operaciones" {...register(`integrations.${idx}.dataOwner` as Path<TValue>)} /></Field>
                          <div className="md:col-span-6 flex justify-end"><button type="button" onClick={() => remove(idx)} className="text-sm text-red-600 underline">Quitar</button></div>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <button type="button" onClick={() => append({ systemName: "", direction: "Pull", protocol: "REST", auth: "OAuth2", frequency: "Diaria", volume: "Bajo", dataOwner: "" } as any)} className="px-3 py-2 rounded-xl bg-black text-white">+ Agregar integración</button>
                        <span className="text-xs text-gray-500">Define protocolo, auth, frecuencia y volumen.</span>
                      </div>
                    </div>
                  </div>
                )}
              </Section>
            </Step>
          )}

          {currentStepKey === "sla" && (
            <Step key="sla">
              <Section title="SLA / DR" subtitle="RTO/RPO y ventanas de mantenimiento">
                <Field label="RTO (horas)" error={(errors as any)?.rtoHours?.message}><NumberInput step={1} min={0} {...register("rtoHours" as Path<TValue>, { valueAsNumber: true })} /></Field>
                <Field label="RPO (horas)" error={(errors as any)?.rpoHours?.message}><NumberInput step={1} min={0} {...register("rpoHours" as Path<TValue>, { valueAsNumber: true })} /></Field>
                <Field label="Ventana de mantenimiento"><TextInput placeholder="Ej. Domingos 01:00–03:00" {...register("maintenanceWindow" as Path<TValue>)} /></Field>
              </Section>
            </Step>
          )}

          {currentStepKey === "entregables" && (
            <Step key="entregables">
              <Section title={`${service} – Selección de entregables`} subtitle="Filtra por nivel / modalidad y selecciona">
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 mr-2">Acciones rápidas:</span>
                  {["Básico","Intermedio","Avanzado"].map((n) => (
                    <Chip key={n} active={false} onClick={()=>selectByLevel(n as Nivel)}>{`Seleccionar ${n}`}</Chip>
                  ))}
                </div>
                <div className="md:col-span-2">
                  <div className="overflow-auto border rounded-2xl">
                    <table className="min-w-full">
                      <thead className="bg-gray-100 text-sm"><tr><th className="text-left p-3">✔</th><th className="text-left p-3">ID</th><th className="text-left p-3">Entregable</th><th className="text-left p-3">Nivel</th><th className="text-left p-3">Modalidad</th><th className="text-left p-3">Esfuerzo</th><th className="text-left p-3">Evidencia</th></tr></thead>
                      <tbody>
                        {filteredDeliverables.map((d) => {
                          const checked = selectedIds.includes(d.id);
                          return (
                            <tr key={d.id} className="border-t">
                              <td className="p-3"><input type="checkbox" checked={checked} onChange={(e)=>{ const curr = new Set<string>(selectedIds); e.target.checked ? curr.add(d.id) : curr.delete(d.id); setValue("selectedDeliverables" as Path<TValue>, Array.from(curr) as unknown as TValue[Path<TValue>]); }} /></td>
                              <td className="p-3 font-mono text-xs">{d.id}</td>
                              <td className="p-3">{d.title}</td>
                              <td className="p-3 text-sm">{d.nivel}</td>
                              <td className="p-3 text-sm">{d.modalidad}</td>
                              <td className="p-3 text-sm">{d.esfuerzo}</td>
                              <td className="p-3 text-xs text-gray-500">{d.evidencia}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-sm text-gray-600">Seleccionados: <b>{selectedIds.length}</b> – Esfuerzo estimado: <b>{totalHours} h</b></div>
                    <div className="text-xs text-gray-500">S=8h, M=24h, L=56h (ajustable)</div>
                  </div>
                </div>
              </Section>
            </Step>
          )}

          {currentStepKey === "resumen" && (
            <Step key="resumen">
              <Section title="Resumen & Export" subtitle="Vista previa JSON para enviar a Jira/CRM">
                <div className="md:col-span-2">
                  <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-auto max-h-[420px]">{JSON.stringify(getValues(), null, 2)}</pre>
                  <div className="flex justify-end gap-3 mt-3">
                    <button type="button" onClick={exportJSON} className="px-4 py-2 rounded-xl bg-black text-white">Exportar JSON</button>
                    <button type="button" onClick={restart} className="px-4 py-2 rounded-xl bg-white border">Limpiar</button>
                  </div>
                </div>
              </Section>
            </Step>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-4">
          <button type="button" onClick={goPrev} disabled={step===0} className={`px-4 py-2 rounded-xl border ${step===0?"opacity-40 cursor-not-allowed":""}`}>Atrás</button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={goNext} className="px-4 py-2 rounded-xl bg-black text-white">Siguiente</button>
          ) : (
            <button type="submit" className="px-4 py-2 rounded-xl bg-green-600 text-white">Finalizar</button>
          )}
        </div>
      </form>
    </div>
  );
}

// =========================
// Presentational bits (typed)
// =========================
const Step: React.FC<{ children: ReactNode }> = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full">{children}</motion.div>
);

const Chip: React.FC<{ active?: boolean; children: ReactNode; onClick?: () => void }> = ({ active, children, onClick }) => (
  <button type="button" onClick={onClick} className={`px-3 py-1 rounded-2xl text-sm border transition ${active ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"}`}>{children}</button>
);

const Section: React.FC<{ title: string; subtitle?: string; children: ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-2xl shadow p-5 mb-6"><h3 className="text-lg font-semibold mb-1">{title}</h3>{subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div></div>
);

const Field: React.FC<{ label: string; error?: ReactNode; children: ReactNode }> = ({ label, error, children }) => (
  <div className="flex flex-col"><label className="text-sm font-medium mb-1">{label}</label>{children}{error && <span className="text-xs text-red-600 mt-1">{error}</span>}</div>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button type="button" onClick={() => onChange(!value)} className={`w-16 h-8 rounded-full relative transition ${value ? "bg-green-600" : "bg-gray-300"}`}>
    <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition ${value ? "translate-x-8" : "translate-x-0"}`} />
  </button>
);

const Checkbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center space-x-2"><input type="checkbox" className="w-4 h-4" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="text-sm">{label}</span></label>
);

const NumberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input type="number" {...props} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input type="text" {...props} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
);

const Select: React.FC<{ value: string; onChange: (v: string) => void; options: string[] }> = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black">
    {options.map((o) => (<option key={o} value={o}>{o}</option>))}
  </select>
);

// =========================
// Public components (strictly typed per service)
// =========================
export function SoftlabForm() {
  const defaults: SoftlabValues = getDefaultSoftlabValues();
  return (
    <GenericFormWizard<typeof SoftlabSchema, SoftlabValues>
      service="Softlab"
      schema={SoftlabSchema}
      defaultValues={defaults}
      deliverables={DELIVERABLES}
    />
  );
}

export function WunderGuardForm() {
  const defaults: WGuardValues = getDefaultWGuardValues();
  return (
    <GenericFormWizard<typeof WGuardSchema, WGuardValues>
      service="WunderGuard"
      schema={WGuardSchema}
      defaultValues={defaults}
      deliverables={DELIVERABLES}
    />
  );
}

export function WunderCloudForm() {
  const defaults: WCloudValues = getDefaultWCloudValues();
  return (
    <GenericFormWizard<typeof WCloudSchema, WCloudValues>
      service="WunderCloud"
      schema={WCloudSchema}
      defaultValues={defaults}
      deliverables={DELIVERABLES}
    />
  );
}

// =========================
// Default export: Layout with three forms
// =========================
export default function ThreeServiceForms() {
  const [layout, setLayout] = useState<"tabs" | "columns" | "stacked">("tabs");
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tres formularios: Softlab / WunderGuard / WunderCloud</h1>
            <p className="text-gray-600 mt-1">Cada formulario es independiente (estado/validaciones propios). Exporta JSON por servicio.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Vista:</span>
            {["tabs","columns","stacked"].map(v => (<Chip key={v} active={layout===v} onClick={()=>setLayout(v as typeof layout)}>{v}</Chip>))}
          </div>
        </header>

        {layout === "tabs" && <Tabs />}
        {layout === "columns" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SoftlabForm />
            <WunderGuardForm />
            <WunderCloudForm />
          </div>
        )}
        {layout === "stacked" && (
          <div className="space-y-6">
            <SoftlabForm />
            <WunderGuardForm />
            <WunderCloudForm />
          </div>
        )}
      </div>
    </div>
  );
}

function Tabs(){
  const [tab, setTab] = useState<Service>("Softlab");
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {["Softlab","WunderGuard","WunderCloud"].map(t => (<Chip key={t} active={tab===t} onClick={()=>setTab(t as Service)}>{t}</Chip>))}
      </div>
      {tab === "Softlab" && <SoftlabForm />}
      {tab === "WunderGuard" && <WunderGuardForm />}
      {tab === "WunderCloud" && <WunderCloudForm />}
    </div>
  );
}

// =========================
// Utilities (typed)
// =========================
function getDefaultSoftlabValues(): SoftlabValues {
  return {
    service: "Softlab",
    companyName: "",
    modalidad: "SaaS",
    contactTech: { name: "", email: "", phone: "" },
    contactOps: { name: "", email: "", phone: "" },
    systemType: "Nuevo",
    legacyInfo: { status: "", tech: "", version: "", limitations: "" },
    environments: ["Prod"],
    requiresIntegrations: false,
    integrations: [],
    rtoHours: 4,
    rpoHours: 1,
    maintenanceWindow: "",
    selectedDeliverables: [],
    sso: "OIDC",
    mfa: true,
    dataSensitivity: "PII",
    hl7: false,
  };
}

function getDefaultWGuardValues(): WGuardValues {
  return {
    service: "WunderGuard",
    companyName: "",
    modalidad: "SaaS",
    contactTech: { name: "", email: "", phone: "" },
    contactOps: { name: "", email: "", phone: "" },
    systemType: "Nuevo",
    legacyInfo: { status: "", tech: "", version: "", limitations: "" },
    environments: ["Prod"],
    requiresIntegrations: false,
    integrations: [],
    rtoHours: 4,
    rpoHours: 1,
    maintenanceWindow: "",
    selectedDeliverables: [],
    platform: "M365",
    licenseLevel: "",
    endpoints: ["Windows"],
    xdr: true,
    phishingTraining: "Trimestral",
    darkWeb: true,
    vulnScan: true,
  };
}

function getDefaultWCloudValues(): WCloudValues {
  return {
    service: "WunderCloud",
    companyName: "",
    modalidad: "SaaS",
    contactTech: { name: "", email: "", phone: "" },
    contactOps: { name: "", email: "", phone: "" },
    systemType: "Nuevo",
    legacyInfo: { status: "", tech: "", version: "", limitations: "" },
    environments: ["Prod"],
    requiresIntegrations: false,
    integrations: [],
    rtoHours: 4,
    rpoHours: 1,
    maintenanceWindow: "",
    selectedDeliverables: [],
    slaTarget: "99.99%",
    snapshotsDaily: true,
    vpnNeeded: false,
  };
}

function buildStepsForService(service: Service): StepDef[] {
  return [
    { key: "datos", label: "Datos" },
    { key: "servicio", label: service },
    { key: "integraciones", label: "Integraciones" },
    { key: "sla", label: "SLA/DR" },
    { key: "entregables", label: "Entregables" },
    { key: "resumen", label: "Resumen" },
  ];
}

function stepValidationFields(service: Service, key?: StepKey): string[] {
  const common: Record<StepKey, string[]> = {
    datos: ["companyName","modalidad","contactTech.name","contactTech.email","contactTech.phone","contactOps.name","contactOps.email","contactOps.phone","systemType"],
    integraciones: ["requiresIntegrations"],
    sla: ["rtoHours","rpoHours"],
    entregables: ["selectedDeliverables"],
    servicio: [],
    resumen: [],
  } as const as any;

  const byService: Partial<Record<Service, Partial<Record<StepKey, string[]>>>> = {
    Softlab: { servicio: ["sso","mfa","dataSensitivity","hl7"] },
    WunderGuard: { servicio: ["platform","licenseLevel","endpoints","xdr","phishingTraining","darkWeb","vulnScan"] },
    WunderCloud: { servicio: ["slaTarget","snapshotsDaily","vpnNeeded"] },
  };

  return [ ...(common[key ?? "datos"] ?? []), ...((byService[service]?.[key ?? "datos"]) ?? []) ];
}