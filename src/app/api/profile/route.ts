import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { validateEmailUniqueness } from "@/lib/validation/emailUniqueness";
import { validateUsernameDetailed } from "@/lib/validation/username";
import {
    getUserFromToken,
    generateToken,
    setAuthCookie,
} from "@/lib/utils/jwt";
import { withPermissionAuthorization } from "@/lib/middleware/authorization";

// GET - Retrieve user profile
export async function GET() {
    // Check authorization: edit_profile permission required
    const { user, error: authError } = await withPermissionAuthorization('edit_profile');
    if (authError) {
        return authError;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("users")
        .select("id, username, email, display_name, created_at, last_login")
        .eq("id", user.id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
        id: data.id,
        username: data.username,
        email: data.email,
        displayName: data.display_name,
        createdAt: data.created_at,
        lastLogin: data.last_login,
    });
}

// PUT - Update user profile
export async function PUT(req: Request) {
    // Check authorization: edit_profile permission required
    const { user, error: authError } = await withPermissionAuthorization('edit_profile');
    if (authError) {
        return authError;
    }

    const { displayName, email, username } = await req.json();

    // Validate email if provided
    if (email && email !== user.email) {
        const emailValidation = await validateEmailUniqueness(
            email,
            parseInt(user.id),
        );
        if (!emailValidation.isUnique) {
            return NextResponse.json(
                { error: emailValidation.error || "Email validation failed" },
                { status: 400 },
            );
        }
    }

    const supabase = await createClient();

    // Validate username if provided
    if (username && username !== user.username) {
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
                .neq("id", parseInt(user.id))
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
        .eq("id", user.id)
        .select("id, username, email, display_name, created_at, last_login")
        .single();

    if (error) {
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 },
        );
    }

    // Generate new JWT with updated information
    const newToken = generateToken({
        id: data.id,
        username: data.username,
        email: data.email,
        displayName: data.display_name,
    });

    const response = NextResponse.json({
        message: "Profile updated successfully",
        user: {
            id: data.id,
            username: data.username,
            email: data.email,
            displayName: data.display_name,
            createdAt: data.created_at,
            lastLogin: data.last_login,
        },
    });

    // Update the auth token cookie
    setAuthCookie(response, newToken);

    return response;
}
