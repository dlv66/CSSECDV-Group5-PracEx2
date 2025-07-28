import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    iat?: number;
    exp?: number;
}

/**
 * Helper function to get user from JWT token in cookies
 */
export async function getUserFromToken(): Promise<JwtPayload | null> {
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

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: {
    id: string;
    username: string;
    email: string;
    displayName?: string;
}): string {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
    );
}

/**
 * Set auth token cookie on a response
 */
export function setAuthCookie(response: NextResponse, token: string): void {
    response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
}

/**
 * Clear auth token cookie (for logout)
 */
export function clearAuthCookie(response: NextResponse): void {
    response.cookies.set("auth_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });
}

/**
 * Verify if a user is authenticated and return user data or null
 */
export async function requireAuth(): Promise<JwtPayload | null> {
    const user = await getUserFromToken();
    return user;
}

/**
 * Verify if a user is authenticated and throw error if not
 */
export async function requireAuthOrFail(): Promise<JwtPayload> {
    const user = await getUserFromToken();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}
