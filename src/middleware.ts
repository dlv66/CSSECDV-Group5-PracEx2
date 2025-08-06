import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    verifySessionTokenEdge,
    renewSessionToken,
    setSessionCookie,
} from "@/lib/utils/session";

// Define protected routes
const protectedRoutes = ["/admin", "/dashboard", "/profile", "/users"];

// Note: Role-based protection is handled by the pages/APIs themselves
// since it requires database queries that can't be done in middleware

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the route is protected
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route),
    );

    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Get the JWT token from cookies
    const token = request.cookies.get("id")?.value;

    if (!token) {
        // No token, redirect to login
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Verify session token with activity renewal
        const result = verifySessionTokenEdge(token, request);

        if (!result.valid) {
            // Invalid or expired token, clear cookie and redirect to login
            const loginUrl = new URL("/login", request.url);
            const response = NextResponse.redirect(loginUrl);

            // Clear the session cookie
            response.cookies.set("id", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 0, // Immediate expiration
            });

            return response;
        }

        // Check if token needs renewal
        if (result.needsRenewal) {
            const renewedToken = renewSessionToken(token);
            if (renewedToken) {
                // Create response with renewed token
                const response = NextResponse.next();
                setSessionCookie(response, renewedToken);
                return response;
            }
        }

        // Token is valid, allow the request
        return NextResponse.next();
    } catch {
        // Error checking session, redirect to login
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
        "/profile/:path*",
        "/users/:path*",
    ],
};
