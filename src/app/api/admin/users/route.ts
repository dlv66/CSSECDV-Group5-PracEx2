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

// GET - Retrieve all users with their roles
export async function GET() {
    const user = await getUserFromToken();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all users with their roles
    const { data: users, error: usersError } = await supabase
        .from("users")
        .select(
            `
            id,
            username,
            email,
            display_name,
            created_at,
            last_login,
            user_roles(
                role_id,
                roles(name)
            )
        `,
        )
        .order("created_at", { ascending: false });

    if (usersError) {
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 },
        );
    }

    // Transform the data to a more usable format
    const transformedUsers = users?.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        roles:
            user.user_roles?.map((ur: any) => ({
                id: ur.role_id,
                name: ur.roles.name,
            })) || [],
    }));

    return NextResponse.json({
        users: transformedUsers || [],
    });
}
