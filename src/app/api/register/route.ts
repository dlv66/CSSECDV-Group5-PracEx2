import { NextResponse } from "next/server";
import { validatePasswordStrength, hashPassword } from "@/lib/password_auth";
import { validateEmailUniqueness } from "@/lib/validation/emailUniqueness";
import { createClient } from "@/lib/utils/supabase/server";
import { validateUsernameDetailed } from "@/lib/validation/username";

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

    // Validate email uniqueness using the new validation module
    const emailValidation = await validateEmailUniqueness(email);
    if (!emailValidation.isUnique) {
        return NextResponse.json(
            { error: emailValidation.error || "Email validation failed" },
            { status: 400 },
        );
    }

    // Use the new username validation
    const usernameValidation = validateUsernameDetailed(username);
    if (!usernameValidation.isValid) {
        return NextResponse.json(
            { error: usernameValidation.error || "Username validation failed" },
            { status: 400 },
        );
    }

    const supabase = await createClient();

    // Check if username already exists
    const { data: existingUsername, error: usernameDbError } = await supabase
        .from("users")
        .select("id")
        .ilike("username", username)
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

    const password_hash = await hashPassword(password);

    const { error: insertError } = await supabase.from("users").insert([
        {
            username: username,
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
