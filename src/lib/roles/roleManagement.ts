import { createClient } from "@/lib/utils/supabase/server";

const supabase = await createClient();

export async function assignUserRole(userId: number, roleId: number) {
  return supabase.from("user_roles").insert([
    { user_id: userId, role_id: roleId, assigned_at: new Date().toISOString() },
  ]);
}

export async function removeUserRoles(userId: number) {
  return supabase.from("user_roles").delete().eq("user_id", userId);
}

export async function updateUserRoles(userId: number, roleIds: number[]) {
  await removeUserRoles(userId);
  for (const roleId of roleIds) {
    await assignUserRole(userId, roleId);
  }
}