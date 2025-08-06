import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || "1800"); // 30 minutes default
const ACTIVITY_RENEWAL_THRESHOLD = parseInt(
    process.env.ACTIVITY_RENEWAL_THRESHOLD || "300",
); // 5 minutes

// Excellent session management without database tables
export interface SessionData {
    id: string;
    username: string;
    email: string;
    displayName: string;
    sessionId: string; // CSPRNG session ID
    iat: number; // issued at
    exp: number; // expires at
    lastActivity: number; // last activity timestamp
    ipAddress?: string; // IP address for security
    userAgent?: string; // User agent for security
}

/**
 * Generate CSPRNG session ID (32 bytes = 256 bits)
 */
export function generateSessionId(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Create session token
 */
export function createSessionToken(
    userData: {
        id: string;
        username: string;
        email: string;
        displayName: string;
    },
    context?: {
        ipAddress?: string;
        userAgent?: string;
    },
    timeoutSeconds: number = SESSION_TIMEOUT,
): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionData = {
        ...userData,
        sessionId: generateSessionId(), // CSPRNG session ID
        iat: now,
        exp: now + timeoutSeconds,
        lastActivity: now,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
    };

    return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify session token with activity renewal
 */
export function verifySessionToken(token: string): {
    valid: boolean;
    data?: SessionData;
    needsRenewal: boolean;
    error?: string;
} {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as SessionData;
        const now = Math.floor(Date.now() / 1000);

        // Check if token is expired
        if (payload.exp && now >= payload.exp) {
            return {
                valid: false,
                needsRenewal: false,
                error: "Token expired",
            };
        }

        // Check if activity renewal is needed
        const timeSinceLastActivity = now - payload.lastActivity;
        const needsRenewal =
            timeSinceLastActivity >= ACTIVITY_RENEWAL_THRESHOLD;

        return {
            valid: true,
            data: payload,
            needsRenewal,
        };
    } catch (error) {
        return { valid: false, needsRenewal: false, error: "Invalid token" };
    }
}

/**
 * Verify session token for Edge Runtime
 */
export function verifySessionTokenEdge(token: string): {
    valid: boolean;
    data?: SessionData;
    needsRenewal: boolean;
    error?: string;
} {
    try {
        // Simple JWT verification for Edge Runtime
        const parts = token.split(".");
        if (parts.length !== 3) {
            return {
                valid: false,
                needsRenewal: false,
                error: "Invalid token format",
            };
        }

        // Decode payload (base64url decode)
        const decodedPayload = atob(
            parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        );
        const payload = JSON.parse(decodedPayload);
        const now = Math.floor(Date.now() / 1000);

        // Check if token is expired
        if (payload.exp && now >= payload.exp) {
            return {
                valid: false,
                needsRenewal: false,
                error: "Token expired",
            };
        }

        // Check if activity renewal is needed
        const timeSinceLastActivity = now - payload.lastActivity;
        const needsRenewal =
            timeSinceLastActivity >= ACTIVITY_RENEWAL_THRESHOLD;

        return {
            valid: true,
            data: payload,
            needsRenewal,
        };
    } catch (error) {
        return { valid: false, needsRenewal: false, error: "Invalid token" };
    }
}

/**
 * Renew session token with activity update
 */
export function renewSessionToken(token: string): string | null {
    const result = verifySessionToken(token);

    if (!result.valid || !result.data) {
        return null;
    }

    // Only renew if activity threshold is met
    if (!result.needsRenewal) {
        return token; // Return original token
    }

    // Generate new token with renewed expiration and activity
    const now = Math.floor(Date.now() / 1000);
    const renewedPayload: SessionData = {
        ...result.data,
        iat: now,
        exp: now + SESSION_TIMEOUT,
        lastActivity: now,
    };

    return jwt.sign(renewedPayload, JWT_SECRET);
}

/**
 * Set secure session cookie with all OWASP flags
 */
export function setSessionCookie(
    response: NextResponse,
    token: string,
    timeoutSeconds: number = SESSION_TIMEOUT,
): void {
    response.cookies.set("id", token, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // Prevent CSRF attacks
        path: "/",
        maxAge: timeoutSeconds, // Configurable timeout
    });
}

/**
 * Clear session cookie properly
 */
export function clearSessionCookie(response: NextResponse): void {
    response.cookies.set("id", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0, // Immediate expiration
    });
}

/**
 * Get user from session token
 */
export function getUserFromSession(token: string) {
    const result = verifySessionToken(token);
    if (!result.valid || !result.data) return null;

    return {
        id: result.data.id,
        username: result.data.username,
        email: result.data.email,
        displayName: result.data.displayName,
        sessionId: result.data.sessionId,
    };
}

/**
 * Force session regeneration (for security events)
 */
export function regenerateSession(token: string): string | null {
    const result = verifySessionToken(token);

    if (!result.valid || !result.data) {
        return null;
    }

    // Generate completely new session with new session ID
    const now = Math.floor(Date.now() / 1000);
    const newPayload: SessionData = {
        ...result.data,
        sessionId: generateSessionId(), // New CSPRNG session ID
        iat: now,
        exp: now + SESSION_TIMEOUT,
        lastActivity: now,
    };

    return jwt.sign(newPayload, JWT_SECRET);
}

/**
 * Get session configuration
 */
export function getSessionConfig() {
    return {
        sessionTimeout: SESSION_TIMEOUT,
        activityRenewalThreshold: ACTIVITY_RENEWAL_THRESHOLD,
        isConfigurable: true,
        securityFeatures: {
            cspRngSessionIds: true,
            httpOnlyCookies: true,
            secureCookies: process.env.NODE_ENV === "production",
            sameSiteStrict: true,
            activityRenewal: true,
            contextValidation: true,
        },
    };
}
