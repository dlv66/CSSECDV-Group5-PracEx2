import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";

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
            .select("id, username, email, password_hash")
            .eq("email", usernameOrEmail.toLowerCase())
            .maybeSingle();
    } else {
        query = supabase
            .from("users")
            .select("id, username, email, password_hash")
            .ilike("username", usernameOrEmail)
            .maybeSingle();
    }
    const { data, error } = await query;
    if (error || !data) {
        return NextResponse.json(
            { error: "Invalid credentials" },
            { status: 401 },
        );
    }
    const user = data;

    // Compare password
    const passwordMatch = await compare(password, user.password_hash);
    if (!passwordMatch) {
        return NextResponse.json(
            { error: "Invalid credentials" },
            { status: 401 },
        );
    }

    // Update last_login
    await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", user.id);

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || "dev_secret";
    const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        jwtSecret,
        { expiresIn: JWT_EXPIRES_IN },
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
}
