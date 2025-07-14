import { createClient } from '../utils/supabase/server';

// Get all permissions for a user through their roles
export async function getUserPermissions(userId: string): Promise<string[]> {
    const db = await createClient();

    // Step 1: Get all role IDs for the user
    const { data: userRoles, error: userRolesError } = await db
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);
    if (userRolesError) throw userRolesError;
    const roleIds = (userRoles || []).map(row => row.role_id);
    if (roleIds.length === 0) return [];

    // Step 2: Get all permission IDs for those roles
    const { data: rolePermissions, error: rolePermissionsError } = await db
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', roleIds);
    if (rolePermissionsError) throw rolePermissionsError;
    const permissionIds = (rolePermissions || []).map(row => row.permission_id);
    if (permissionIds.length === 0) return [];

    // Step 3: Get all permission names for those permission IDs
    const { data: permissions, error: permissionsError } = await db
        .from('permissions')
        .select('name')
        .in('id', permissionIds);
    if (permissionsError) throw permissionsError;
    return (permissions || []).map(row => row.name);
}

// Permission checking function
export async function userHasPermission(userId: string, requiredPermission: string): Promise<boolean> {
    const userPermissions = await getUserPermissions(userId);
    return userPermissions.includes(requiredPermission);
} 