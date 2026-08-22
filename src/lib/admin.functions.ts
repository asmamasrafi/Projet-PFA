import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPendingAuditors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: adminRole, error: adminError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError || !adminRole) {
      throw new Error("Unauthorized: admin role required");
    }

    const { data, error } = await supabase
      .from("auditor_profiles")
      .select(
        "*, profiles: user_id (id, first_name, last_name, email, job_title, account_type)",
      )
      .eq("verified", false)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });

export const approveAuditor = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ userId: z.string().min(1) }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: adminRole, error: adminError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError || !adminRole) {
      throw new Error("Unauthorized: admin role required");
    }

    const auditorUserId =
      typeof data === "object" && data !== null
        ? String((data as unknown as { userId?: string }).userId ?? "")
        : "";
    if (!auditorUserId) {
      throw new Error("Missing auditor user id");
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ account_type: "auditor", job_title: "Auditeur" })
      .eq("id", auditorUserId);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: auditorError } = await supabaseAdmin
      .from("auditor_profiles")
      .update({ verified: true })
      .eq("user_id", auditorUserId);

    if (auditorError) {
      throw new Error(auditorError.message);
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: auditorUserId, role: "auditor" }, { onConflict: "user_id,role" });

    if (roleError) {
      throw new Error(roleError.message);
    }

    const { error: pmeRoleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", auditorUserId)
      .eq("role", "pme");

    if (pmeRoleError) {
      throw new Error(pmeRoleError.message);
    }

    return { ok: true };
  });
