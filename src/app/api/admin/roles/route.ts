import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

interface JwtPayload {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    iat?: number;
    exp?: number;
}

// Helper function to get user from JWT token
async function getUserFromToken(): Promise<JwtPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return null;

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (
            typeof payload === "object" &&
            "username" in payload &&
            "email" in payload &&
            "id" in payload
        ) {
            return payload as JwtPayload;
        }
    } catch {
        // Invalid token
    }
    return null;
}

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
