import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { compare } from "bcryptjs";
import { generateToken, setAuthCookie } from "@/lib/utils/jwt";

export async function POST(req: Request) {
    const { usernameOrEmail, password } = await req.json();

    if (!usernameOrEmail || !password) {
        return NextResponse.json(
            { error: "Username/email and password are required" },
            { status: 400 },
        );
    }

    const supabase = await createClient();
    let query;
    if (usernameOrEmail.includes("@")) {
        query = supabase
            .from("users")
            .select("id, username, email, display_name, password_hash")
            .eq("email", usernameOrEmail.toLowerCase())
            .maybeSingle();
    } else {
        query = supabase
            .from("users")
            .select("id, username, email, display_name, password_hash")
            .ilike("username", usernameOrEmail)
            .maybeSingle();
    }
    const { data, error } = await query;
    if (error || !data) {
        return NextResponse.json(
            { error: "Invalid username/email or password" },
            { status: 401 },
        );
    }
    const user = data;

    // Compare password
    const passwordMatch = await compare(password, user.password_hash);
    if (!passwordMatch) {
        return NextResponse.json(
            { error: "Invalid username/email or password" },
            { status: 401 },
        );
    }

    // Update last_login
    await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", user.id);

    // Generate JWT
    const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({ message: "Login successful" });
    setAuthCookie(response, token);
    return response;
}
