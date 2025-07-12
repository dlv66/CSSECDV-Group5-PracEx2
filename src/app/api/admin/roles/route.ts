import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromToken } from "@/lib/utils/jwt";

// GET - Retrieve all available roles
export async function GET() {
    const user = await getUserFromToken();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
