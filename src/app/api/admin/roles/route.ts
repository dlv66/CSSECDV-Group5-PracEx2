import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromSession } from "@/lib/utils/session";
import { userHasPermission } from "@/lib/roles/permission";

// GET - Retrieve all available roles
export async function GET() {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("id")?.value;
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = getUserFromSession(token);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN Permission check: must have 'admin_access' permission
    const hasAdminPermission = await userHasPermission(user.id, "admin_access");
    if (!hasAdminPermission) {
        console.log(
            "--- NOT ADMIN: You are not authorized to access this resource ---",
        );
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // MANAGER Permission check: must have 'manager_access' permission
    const hasManagerPermission = await userHasPermission(
        user.id,
        "manage_users",
    );
    if (!hasManagerPermission) {
        console.log(
            "--- NOT MANAGER: You are not authorized to access this resource ---",
        );
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();

    // Get all available roles
    const { data: roles, error: rolesError } = await supabase
        .from("roles")
        .select("id, name, description")
        .order("name");

    if (rolesError) {
        // If roles table doesn't exist yet, return empty array
        console.warn("Roles table might not exist yet:", rolesError.message);
        return NextResponse.json({
            roles: [],
        });
    }

    return NextResponse.json({
        roles: roles || [],
    });
}
