// Set environment variable before importing
process.env.JWT_SECRET = "test-secret";

import { 
    requireRole, 
    requirePermission, 
    handleAuthorizationError,
    withRoleAuthorization,
    withPermissionAuthorization 
} from "@/lib/middleware/authorization";
import { getUserFromToken } from "@/lib/utils/jwt";
import { userHasPermission, getUserPermissions } from "@/lib/roles/permission";

// Mock dependencies
jest.mock("@/lib/utils/jwt", () => ({
    getUserFromToken: jest.fn(),
}));

jest.mock("@/lib/roles/permission", () => ({
    userHasPermission: jest.fn(),
    getUserPermissions: jest.fn(),
}));

const mockGetUserFromToken = jest.mocked(getUserFromToken);
const mockUserHasPermission = jest.mocked(userHasPermission);
const mockGetUserPermissions = jest.mocked(getUserPermissions);

describe("Authorization Middleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockUser = {
        id: "123",
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
    };

    describe("handleAuthorizationError", () => {
        it("should return 401 for unauthenticated error", () => {
            const response = handleAuthorizationError('unauthenticated');
            
            expect(response.status).toBe(401);
        });

        it("should return 403 for unauthorized error", () => {
            const response = handleAuthorizationError('unauthorized');
            
            expect(response.status).toBe(403);
        });

        it("should return 500 for server error", () => {
            const response = handleAuthorizationError('server_error');
            
            expect(response.status).toBe(500);
        });

        it("should default to server error for unknown error type", () => {
            // @ts-ignore - testing invalid input
            const response = handleAuthorizationError('invalid_type');
            
            expect(response.status).toBe(500);
        });
    });

    describe("requireRole", () => {
        it("should return unauthenticated error when no user", async () => {
            mockGetUserFromToken.mockResolvedValue(null);
            
            const middleware = requireRole(['admin']);
            const result = await middleware();
            
            expect(result.error?.status).toBe(401);
            expect(result.user).toBeNull();
        });

        it("should return unauthorized error when user lacks required role", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['edit_profile']); // Only basic permissions
            
            const middleware = requireRole(['admin']);
            const result = await middleware();
            
            expect(result.error?.status).toBe(403);
            expect(result.user).toEqual(mockUser);
        });

        it("should succeed when user has admin role", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['admin_access', 'edit_profile']);
            
            const middleware = requireRole(['admin']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
        });

        it("should succeed when user has manager role", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['manage_users', 'edit_profile']);
            
            const middleware = requireRole(['manager']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
        });

        it("should succeed when user has any of multiple allowed roles", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['manage_users', 'edit_profile']); // Has manager
            
            const middleware = requireRole(['admin', 'manager']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
        });

        it("should succeed for user role (all authenticated users)", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['edit_profile']); // Basic user
            
            const middleware = requireRole(['user']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
        });

        it("should handle database errors gracefully", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockRejectedValue(new Error("Database error"));
            
            const middleware = requireRole(['admin']);
            const result = await middleware();
            
            expect(result.error?.status).toBe(500);
        });
    });

    describe("requirePermission", () => {
        it("should return unauthenticated error when no user", async () => {
            mockGetUserFromToken.mockResolvedValue(null);
            
            const middleware = requirePermission('admin_access');
            const result = await middleware();
            
            expect(result.error?.status).toBe(401);
            expect(result.user).toBeNull();
        });

        it("should return unauthorized error when user lacks permission", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockUserHasPermission.mockResolvedValue(false);
            
            const middleware = requirePermission('admin_access');
            const result = await middleware();
            
            expect(result.error?.status).toBe(403);
            expect(result.user).toEqual(mockUser);
            expect(mockUserHasPermission).toHaveBeenCalledWith("123", "admin_access");
        });

        it("should succeed when user has required permission", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockUserHasPermission.mockResolvedValue(true);
            
            const middleware = requirePermission('admin_access');
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
            expect(mockUserHasPermission).toHaveBeenCalledWith("123", "admin_access");
        });

        it("should succeed for edit_profile permission", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockUserHasPermission.mockResolvedValue(true);
            
            const middleware = requirePermission('edit_profile');
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
            expect(mockUserHasPermission).toHaveBeenCalledWith("123", "edit_profile");
        });

        it("should handle database errors gracefully", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockUserHasPermission.mockRejectedValue(new Error("Database error"));
            
            const middleware = requirePermission('admin_access');
            const result = await middleware();
            
            expect(result.error?.status).toBe(500);
        });
    });

    describe("withRoleAuthorization", () => {
        it("should return user and no error for authorized user", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['admin_access']);
            
            const result = await withRoleAuthorization(['admin']);
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
        });

        it("should return error for unauthorized user", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['edit_profile']);
            
            const result = await withRoleAuthorization(['admin']);
            
            expect(result.error?.status).toBe(403);
        });
    });

    describe("withPermissionAuthorization", () => {
        it("should return user and no error for authorized user", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockUserHasPermission.mockResolvedValue(true);
            
            const result = await withPermissionAuthorization('admin_access');
            
            expect(result.error).toBeUndefined();
            expect(result.user).toEqual(mockUser);
        });

        it("should return error for unauthorized user", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockUserHasPermission.mockResolvedValue(false);
            
            const result = await withPermissionAuthorization('admin_access');
            
            expect(result.error?.status).toBe(403);
        });
    });

    describe("Role Mapping Logic", () => {
        it("should map admin_access permission to admin role", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['admin_access', 'manage_users', 'edit_profile']);
            
            const middleware = requireRole(['admin']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
            expect(mockGetUserPermissions).toHaveBeenCalledWith("123");
        });

        it("should map manage_users permission to manager role", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['manage_users', 'edit_profile']);
            
            const middleware = requireRole(['manager']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
        });

        it("should allow all authenticated users to have user role", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['edit_profile']); // Minimal permissions
            
            const middleware = requireRole(['user']);
            const result = await middleware();
            
            expect(result.error).toBeUndefined();
        });

        it("should handle user with multiple roles", async () => {
            mockGetUserFromToken.mockResolvedValue(mockUser);
            mockGetUserPermissions.mockResolvedValue(['admin_access', 'manage_users', 'edit_profile']);
            
            // User should have admin, manager, and user roles
            const adminCheck = requireRole(['admin']);
            const managerCheck = requireRole(['manager']);
            const userCheck = requireRole(['user']);
            
            const adminResult = await adminCheck();
            const managerResult = await managerCheck();
            const userResult = await userCheck();
            
            expect(adminResult.error).toBeUndefined();
            expect(managerResult.error).toBeUndefined();
            expect(userResult.error).toBeUndefined();
        });
    });
}); 