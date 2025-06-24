import { NextResponse } from "next/server";
import { validatePasswordStrength, hashPassword } from "@/lib/password_auth";
import { createClient } from "@/lib/utils/supabase/server";

export async function POST(req: Request) {
    const { username, displayName, email, password } = await req.json();

    if (!username || !email || !password) {
        return NextResponse.json(
            { error: "All fields are required" },
            { status: 400 },
        );
    }

    const error = validatePasswordStrength(password, username, email);
    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if email or username already exists
    const { data: existingEmail, error: emailError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

    if (emailError) {
        return NextResponse.json(
            { error: "Database error (email check)" },
            { status: 500 },
        );
    }
    if (existingEmail) {
        return NextResponse.json(
            { error: "Email already exists" },
            { status: 400 },
        );
    }

    const { data: existingUsername, error: usernameError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();

    if (usernameError) {
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

    const password_hash = await hashPassword(password);

    const { error: insertError } = await supabase.from("users").insert([
        {
            username: username.toLowerCase(),
            display_name: displayName,
            email: email.toLowerCase(),
            password_hash,
            hash_algorithm: "bcrypt",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
        },
    ]);

    if (insertError) {
        return NextResponse.json(
            { error: `Database error (insert): ${insertError.message}` },
            { status: 500 },
        );
    }

    return NextResponse.json({ message: "User registered successfully" });
}
