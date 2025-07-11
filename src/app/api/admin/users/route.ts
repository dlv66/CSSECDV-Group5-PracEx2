import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { validateEmailUniqueness } from "@/lib/validation/emailUniqueness";
import { validateUsernameDetailed } from "@/lib/validation/username";
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

// PUT - Update user information
export async function PUT(req: Request) {
    const user = await getUserFromToken();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, displayName, email, username } = await req.json();

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 },
        );
    }

    const supabase = await createClient();

    // Validate email if provided
    if (email) {
        const emailValidation = await validateEmailUniqueness(email, userId);
        if (!emailValidation.isUnique) {
            return NextResponse.json(
                { error: emailValidation.error || "Email validation failed" },
                { status: 400 },
            );
        }
    }

    // Validate username if provided
    if (username) {
        const usernameValidation = validateUsernameDetailed(username);
        if (!usernameValidation.isValid) {
            return NextResponse.json(
                {
                    error:
                        usernameValidation.error ||
                        "Username validation failed",
                },
                { status: 400 },
            );
        }

        // Check if username already exists in database
        const { data: existingUsername, error: usernameDbError } =
            await supabase
                .from("users")
                .select("id")
                .ilike("username", username)
                .neq("id", userId)
                .maybeSingle();

        if (usernameDbError) {
            return NextResponse.json(
                { error: "Database error (username check)" },
                { status: 500 },
            );
        }
        if (existingUsername) {
            return NextResponse.json(
                { error: "Username already exists" },
                { status: 400 },
            );
        }
    }

    // Prepare update data
    const updateData: {
        updated_at: string;
        display_name?: string;
        email?: string;
        username?: string;
    } = {
        updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) {
        updateData.display_name = displayName;
    }

    if (email !== undefined) {
        updateData.email = email.toLowerCase();
    }

    if (username !== undefined) {
        updateData.username = username;
    }

    const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select("id, username, email, display_name, created_at, last_login")
        .single();

    if (error) {
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 },
        );
    }

    return NextResponse.json({
        message: "User updated successfully",
        user: {
            id: data.id,
            username: data.username,
            email: data.email,
            displayName: data.display_name,
            createdAt: data.created_at,
            lastLogin: data.last_login,
        },
    });
}
