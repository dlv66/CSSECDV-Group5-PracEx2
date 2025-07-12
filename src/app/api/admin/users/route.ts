import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { validateEmailUniqueness } from "@/lib/validation/emailUniqueness";
import { validateUsernameDetailed } from "@/lib/validation/username";
import { getUserFromToken } from "@/lib/utils/jwt";

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

    const { userId, displayName, email, username, roleIds } = await req.json();

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

    // --- Role update logic ---
    if (Array.isArray(roleIds)) {
        // Remove all existing roles for the user
        const { error: deleteError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", userId);

        if (deleteError) {
            console.error("Failed to remove existing roles:", deleteError);
            return NextResponse.json(
                { error: "Failed to remove existing roles" },
                { status: 500 },
            );
        }

        // Assign new roles
        if (roleIds.length > 0) {
            const newRoles = roleIds.map((roleId: number) => ({
                user_id: userId,
                role_id: roleId,
                assigned_at: new Date().toISOString(),
            }));

            const { error: insertError } = await supabase
                .from("user_roles")
                .insert(newRoles);

            if (insertError) {
                console.error("Failed to assign new roles:", insertError);
                return NextResponse.json(
                    { error: "Failed to assign new roles" },
                    { status: 500 },
                );
            }
        }
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
