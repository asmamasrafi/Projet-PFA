import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auditorSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  entity: z.enum(["CMRPI", "AUSIM", "ADD", "Autre cabinet"]),
  entityOther: z.string().trim().max(120).optional(),
  accessCode: z.string().trim().min(1).max(120),
});

export const registerAuditor = createServerFn({ method: "POST" })
  .validator((data: unknown) => auditorSchema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env["AUDITOR_ACCESS_CODE"] || "CYBERAUDIT-AUDITEUR-2026";
    if (data.accessCode !== expected) {
      return { ok: false as const, error: "Code d'agrément invalide. Contactez l'administrateur." };
    }

    const supabaseUrl = process.env["SUPABASE_URL"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        ok: false as const,
        error: "La configuration Supabase du serveur est incomplète. Vérifiez les variables d'environnement.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        job_title: "Auditeur",
        account_type: "auditor",
      },
    });

    if (error || !created.user) {
  console.error("ERREUR SUPABASE CREATE USER:", error);

  return {
    ok: false as const,
    error: error?.message ?? "La création du compte auditeur a échoué.",
  };
}

    const userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      job_title: "Auditeur",
      account_type: "auditor",
    });

    await supabaseAdmin.from("auditor_profiles").upsert({
      user_id: userId,
      entity: data.entity,
      entity_other: data.entity === "Autre cabinet" ? (data.entityOther ?? null) : null,
      verified: true,
    });

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "auditor" },
      { onConflict: "user_id,role" },
    );

    return { ok: true as const };
  });
