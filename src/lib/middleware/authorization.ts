import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/utils/session";
import { userHasPermission, getUserPermissions } from "@/lib/roles/permission";

// Standardized error responses
export function handleAuthorizationError(
    errorType: "unauthenticated" | "unauthorized" | "server_error",
) {
    const responses = {
        unauthenticated: { status: 401, message: "Authentication required" },
        unauthorized: { status: 403, message: "Access denied" },
        server_error: { status: 500, message: "Internal server error" },
    };

    const response = responses[errorType] || responses.server_error;
    return NextResponse.json(
        { error: response.message },
        { status: response.status },
    );
}

// Role-based authorization middleware
export function requireRole(allowedRoles: string[]) {
    return async (
        token: string,
    ): Promise<{ user: any; error?: NextResponse }> => {
        try {
            // Check if user is authenticated
            const user = getUserFromSession(token);
            if (!user) {
                return {
                    user: null,
                    error: handleAuthorizationError("unauthenticated"),
                };
            }

            // Get user roles by checking their permissions (since we need to query the database)
            const userPermissions = await getUserPermissions(user.id);

            // For now, we'll implement a simple role mapping based on permissions
            // This is a pragmatic approach since we have permission checking working
            const userRoles: string[] = [];

            if (userPermissions.includes("admin_access")) {
                userRoles.push("admin");
            }
            if (userPermissions.includes("manage_users")) {
                userRoles.push("manager");
            }
            // All authenticated users are considered 'user' role
            userRoles.push("user");

            const hasPermission = userRoles.some((role) =>
                allowedRoles.includes(role),
            );

            if (!hasPermission) {
                return {
                    user,
                    error: handleAuthorizationError("unauthorized"),
                };
            }

            return { user, error: undefined };
        } catch (error) {
            console.error("Role authorization check failed:", error);
            return {
                user: null,
                error: handleAuthorizationError("server_error"),
            };
        }
    };
}

// Permission-based authorization middleware
export function requirePermission(requiredPermission: string) {
    return async (
        token: string,
    ): Promise<{ user: any; error?: NextResponse }> => {
        try {
            // Check if user is authenticated
            const user = getUserFromSession(token);
            if (!user) {
                return {
                    user: null,
                    error: handleAuthorizationError("unauthenticated"),
                };
            }

            // Check if user has the required permission
            const hasPermission = await userHasPermission(
                user.id,
                requiredPermission,
            );

            if (!hasPermission) {
                return {
                    user,
                    error: handleAuthorizationError("unauthorized"),
                };
            }

            return { user, error: undefined };
        } catch (error) {
            console.error("Permission authorization check failed:", error);
            return {
                user: null,
                error: handleAuthorizationError("server_error"),
            };
        }
    };
}

// Combined middleware for API routes that need both authentication and authorization
export async function withRoleAuthorization(
    token: string,
    allowedRoles: string[],
) {
    const authCheck = requireRole(allowedRoles);
    return await authCheck(token);
}

export async function withPermissionAuthorization(
    token: string,
    requiredPermission: string,
) {
    const authCheck = requirePermission(requiredPermission);
    return await authCheck(token);
}
