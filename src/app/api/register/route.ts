import { NextResponse } from "next/server";
import { validatePasswordStrength, hashPassword } from "@/lib/password_auth";
import { TablesInsert } from "../../../../database.types";
import { createClient, createAdminClient } from "@/lib/utils/supabase/server";

type UserInsert = TablesInsert<"users">;

export async function POST(req: Request) {
    const { displayName, username, email, password } = await req.json();

    if (!displayName || !username || !email || !password) {
        return NextResponse.json(
            { error: "All fields are required" },
            { status: 400 },
        );
    }

    const error = validatePasswordStrength(password, username, email);
    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    try {
        const supabase = await createClient();
        const adminSupabase = await createAdminClient();

        // Check if email already exists in Supabase Auth
        const { data: existingAuthUser, error: listError } =
            await adminSupabase.auth.admin.listUsers();

        if (listError) {
            console.error("Error listing users:", listError);
            return NextResponse.json(
                { error: "Failed to check existing users" },
                { status: 500 },
            );
        }

        const authUserExists = existingAuthUser.users.some(
            (user) => user.email?.toLowerCase() === email.toLowerCase(),
        );

        if (authUserExists) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 400 },
            );
        }

        // Check if username already exists in our users table
        const { data: existingUsername, error: usernameCheckError } =
            await supabase
                .from("users")
                .select("username")
                .eq("username", username.toLowerCase())
                .single();

        if (usernameCheckError && usernameCheckError.code !== "PGRST116") {
            console.error("Username check error:", usernameCheckError);
            return NextResponse.json(
                { error: "Failed to check username availability" },
                { status: 500 },
            );
        }

        if (existingUsername) {
            return NextResponse.json(
                { error: "Username already exists" },
                { status: 400 },
            );
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } =
            await adminSupabase.auth.admin.createUser({
                email: email.toLowerCase(),
                password: password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    username: username,
                    display_name: displayName,
                },
            });

        if (authError) {
            console.error("Auth user creation error:", authError);
            return NextResponse.json(
                {
                    error: `Failed to create user account: ${authError.message}`,
                },
                { status: 500 },
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                {
                    error: "Failed to create user account: No user data returned",
                },
                { status: 500 },
            );
        }

        // Create user record in our users table
        const password_hash = await hashPassword(password);
        const now = new Date().toISOString();

        const newUser: UserInsert = {
            user_id: authData.user.id, // <-- set this to the Supabase Auth UUID
            username: username.toLowerCase(),
            display_name: displayName,
            email: email.toLowerCase(),
            password_hash,
            hash_algorithm: "bcrypt",
            created_at: now,
            updated_at: now,
            last_login: now,
        };
        const { data, error: insertError } = await supabase
            .from("users")
            .insert(newUser)
            .select()
            .single();

        if (insertError) {
            console.error("Database insert error:", insertError);
            // Note: We don't fail here as the auth user was created successfully
            // But we should log this for debugging
        }

        return NextResponse.json({
            message: "User registered successfully",
            user: {
                id: authData.user.id,
                username: data?.username || username,
                email: authData.user.email,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Registration failed. Please try again." },
            { status: 500 },
        );
    }
}
