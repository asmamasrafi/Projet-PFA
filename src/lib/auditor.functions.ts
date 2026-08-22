import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auditorSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  accessCode: z.string().trim().min(1).max(120),
});

export const registerAuditor = createServerFn({ method: "POST" })
  .validator((data: unknown) => auditorSchema.parse(data))
  .handler(async ({ data }) => {
    const expected = "CYBERAUDIT-AUDITEUR-2026";
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

    const { data: auditorRows, error: existingAuditorError } = await supabaseAdmin
      .from("auditor_profiles")
      .select("user_id")
      .limit(1000);

    if (existingAuditorError) {
      return { ok: false as const, error: "Impossible de vérifier le compte auditeur existant." };
    }
    const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) {
      return { ok: false as const, error: "Impossible de vérifier les utilisateurs existants." };
    }

    const activeUserIds = new Set((usersPage.users ?? []).map((user) => user.id));
    const { data: auditorProfiles, error: auditorProfilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("account_type", "auditor")
      .limit(1000);
    if (auditorProfilesError) {
      return { ok: false as const, error: "Impossible de vérifier le compte auditeur existant." };
    }

    const candidateIds = new Set([
      ...(auditorRows ?? []).map((row) => row.user_id),
      ...(auditorProfiles ?? []).map((row) => row.id),
    ]);
    const liveAuditor = [...candidateIds].find((userId) => activeUserIds.has(userId));

    if (liveAuditor) {
      return {
        ok: false as const,
        error: "Le compte auditeur CMRPI existe déjà. Utilisez ce compte unique.",
      };
    }

    for (const userId of candidateIds) {
      await Promise.all([
        supabaseAdmin.from("auditor_profiles").delete().eq("user_id", userId),
        supabaseAdmin.from("profiles").delete().eq("id", userId),
        supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
      ]);
    }

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
      entity: "CMRPI",
      entity_other: null,
      verified: true,
    });

    const { error: auditorRoleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "auditor" },
      { onConflict: "user_id,role" },
    );
    const { error: adminRoleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" },
    );
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "pme");

    if (auditorRoleError || adminRoleError) {
      return { ok: false as const, error: "Les rôles du compte auditeur n'ont pas pu être configurés." };
    }

    return { ok: true as const };
  });
