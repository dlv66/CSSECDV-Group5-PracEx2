import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromSession } from "@/lib/utils/session";
import { userHasPermission } from "@/lib/roles/permission";

// GET - Retrieve all users (Admin/Manager only)
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

    // Check if user has admin or manager permissions
    const hasAdminPermission = await userHasPermission(user.id, "admin_access");
    const hasManagerPermission = await userHasPermission(
        user.id,
        "manage_users",
    );

    if (!hasAdminPermission && !hasManagerPermission) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
            displayName,
            createdAt,
            lastLogin,
            user_roles (
                roles (
                    id,
                    name
                )
            )
        `,
        )
        .order("createdAt", { ascending: false });

    if (usersError) {
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 },
        );
    }

    // Transform the data to match the expected format
    const transformedUsers =
        users?.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            roles: user.user_roles?.map((ur) => ur.roles) || [],
        })) || [];

    return NextResponse.json({ users: transformedUsers });
}

// PUT - Update user information (Admin/Manager only)
export async function PUT(request: NextRequest) {
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

    // Check if user has admin or manager permissions
    const hasAdminPermission = await userHasPermission(user.id, "admin_access");
    const hasManagerPermission = await userHasPermission(
        user.id,
        "manage_users",
    );

    if (!hasAdminPermission && !hasManagerPermission) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, displayName, email, username, roleIds } = body;

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 },
        );
    }

    const supabase = await createClient();

    // Validate email uniqueness (if email is being updated)
    if (email) {
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .neq("id", userId)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 400 },
            );
        }
    }

    // Validate username uniqueness (if username is being updated)
    if (username) {
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("username", username)
            .neq("id", userId)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "Username already exists" },
                { status: 400 },
            );
        }
    }

    // Update user information
    const updateData: {
        displayName?: string;
        email?: string;
        username?: string;
    } = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;

    const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 },
        );
    }

    // Update user roles if roleIds is provided
    if (roleIds !== undefined) {
        // First, remove all existing roles for this user
        await supabase.from("user_roles").delete().eq("user_id", userId);

        // Then, add the new roles
        if (roleIds.length > 0) {
            const roleInserts = roleIds.map((roleId: number) => ({
                user_id: userId,
                role_id: roleId,
            }));

            const { error: roleError } = await supabase
                .from("user_roles")
                .insert(roleInserts);

            if (roleError) {
                return NextResponse.json(
                    { error: "Failed to update roles" },
                    { status: 500 },
                );
            }
        }
    }

    // Get updated user with roles
    const { data: updatedUserWithRoles, error: fetchError } = await supabase
        .from("users")
        .select(
            `
            id,
            username,
            email,
            displayName,
            createdAt,
            lastLogin,
            user_roles (
                roles (
                    id,
                    name
                )
            )
        `,
        )
        .eq("id", userId)
        .single();

    if (fetchError) {
        return NextResponse.json(
            { error: "Failed to fetch updated user" },
            { status: 500 },
        );
    }

    const result = {
        id: updatedUserWithRoles.id,
        username: updatedUserWithRoles.username,
        email: updatedUserWithRoles.email,
        displayName: updatedUserWithRoles.displayName,
        createdAt: updatedUserWithRoles.createdAt,
        lastLogin: updatedUserWithRoles.lastLogin,
        roles: updatedUserWithRoles.user_roles?.map((ur) => ur.roles) || [],
    };

    return NextResponse.json({ user: result });
}
