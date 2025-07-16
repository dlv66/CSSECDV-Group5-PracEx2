// Set environment variable before importing
process.env.JWT_SECRET = "test-secret";

import { GET as AdminUsersGET, PUT as AdminUsersPUT, DELETE as AdminUsersDELETE } from "@/app/api/admin/users/route";
import { GET as AdminRolesGET } from "@/app/api/admin/roles/route";
import { GET as ProfileGET, PUT as ProfilePUT } from "@/app/api/profile/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { withRoleAuthorization, withPermissionAuthorization } from "@/lib/middleware/authorization";

// Mock dependencies
jest.mock("@/lib/utils/supabase/server", () => ({
    createClient: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        single: jest.fn(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
    })),
}));

jest.mock("@/lib/middleware/authorization", () => ({
    withRoleAuthorization: jest.fn(),
    withPermissionAuthorization: jest.fn(),
    handleAuthorizationError: jest.fn(),
}));

jest.mock("@/lib/validation/emailUniqueness", () => ({
    validateEmailUniqueness: jest.fn(() => ({ isUnique: true })),
}));

jest.mock("@/lib/validation/username", () => ({
    validateUsernameDetailed: jest.fn(() => ({ isValid: true })),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockWithRoleAuthorization = jest.mocked(withRoleAuthorization);
const mockWithPermissionAuthorization = jest.mocked(withPermissionAuthorization);

describe("API Authorization", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockUser = {
        id: "123",
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
    };

    const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
        mockCreateClient.mockResolvedValue(mockSupabaseClient as any);
    });

    describe("/api/admin/users (GET)", () => {
        it("should return 403 when user lacks admin/manager role", async () => {
            // Mock authorization failure
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
            });

            const response = await AdminUsersGET();
            
            expect(response.status).toBe(403);
            expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin', 'manager']);
        });

        it("should return 401 when user is not authenticated", async () => {
            // Mock authentication failure
            mockWithRoleAuthorization.mockResolvedValue({
                user: null as any,
                error: new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
            });

            const response = await AdminUsersGET();
            
            expect(response.status).toBe(401);
        });

        it("should return users list when user has admin role", async () => {
            // Mock successful authorization
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });

            // Mock successful database query
            mockSupabaseClient.select.mockReturnValue({
                ...mockSupabaseClient,
                order: jest.fn().mockResolvedValue({
                    data: [
                        {
                            id: 1,
                            username: "testuser",
                            email: "test@example.com",
                            display_name: "Test User",
                            created_at: "2024-01-01",
                            last_login: "2024-01-02",
                            user_roles: []
                        }
                    ],
                    error: null
                })
            });

            const response = await AdminUsersGET();
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data.users).toBeDefined();
            expect(Array.isArray(data.users)).toBe(true);
        });

        it("should return users list when user has manager role", async () => {
            // Mock successful authorization for manager
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });

            mockSupabaseClient.select.mockReturnValue({
                ...mockSupabaseClient,
                order: jest.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            });

            const response = await AdminUsersGET();
            
            expect(response.status).toBe(200);
            expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin', 'manager']);
        });
    });

    describe("/api/admin/users (PUT)", () => {
        const createMockRequest = (body: any): NextRequest => {
            return new NextRequest("http://localhost:3000/api/admin/users", {
                method: "PUT",
                body: JSON.stringify(body),
            });
        };

        it("should require admin or manager role", async () => {
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
            });

            const request = createMockRequest({
                userId: 456,
                displayName: "Updated Name"
            });

            const response = await AdminUsersPUT(request);
            
            expect(response.status).toBe(403);
            expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin', 'manager']);
        });

        it("should update user when authorized", async () => {
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });

            mockSupabaseClient.update.mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    select: jest.fn().mockReturnValue({
                        ...mockSupabaseClient,
                        single: jest.fn().mockResolvedValue({
                            data: { id: 456, username: "updated", email: "updated@example.com", display_name: "Updated Name" },
                            error: null
                        })
                    })
                })
            });

            const request = createMockRequest({
                userId: 456,
                displayName: "Updated Name"
            });

            const response = await AdminUsersPUT(request);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data.message).toBe("User updated successfully");
        });
    });

    describe("/api/admin/users (DELETE)", () => {
        it("should require admin role only (not manager)", async () => {
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
            });

            const request = new NextRequest("http://localhost:3000/api/admin/users?userId=456", {
                method: "DELETE",
            });

            const response = await AdminUsersDELETE(request);
            
            expect(response.status).toBe(403);
            expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin']);
        });

        it("should require manage_users permission (layered security)", async () => {
            // Pass role check but fail permission check
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });
            
            mockWithPermissionAuthorization.mockResolvedValue({
                user: mockUser,
                error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
            });

            const request = new NextRequest("http://localhost:3000/api/admin/users?userId=456", {
                method: "DELETE",
            });

            const response = await AdminUsersDELETE(request);
            
            expect(response.status).toBe(403);
            expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin']);
            expect(mockWithPermissionAuthorization).toHaveBeenCalledWith('manage_users');
        });

        it("should prevent self-deletion", async () => {
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });
            
            mockWithPermissionAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });

            // Try to delete own account (userId matches current user id)
            const request = new NextRequest("http://localhost:3000/api/admin/users?userId=123", {
                method: "DELETE",
            });

            const response = await AdminUsersDELETE(request);
            const data = await response.json();
            
            expect(response.status).toBe(403);
            expect(data.error).toBe("Cannot delete your own account");
        });

        it("should delete user when all checks pass", async () => {
            mockWithRoleAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });
            
            mockWithPermissionAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });

            // Mock user exists check
            mockSupabaseClient.select.mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    single: jest.fn().mockResolvedValue({
                        data: { id: 456, username: "targetuser" },
                        error: null
                    })
                })
            });

            // Mock successful deletion
            mockSupabaseClient.delete.mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockResolvedValue({
                    error: null
                })
            });

            const request = new NextRequest("http://localhost:3000/api/admin/users?userId=456", {
                method: "DELETE",
            });

            const response = await AdminUsersDELETE(request);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data.message).toContain("deleted successfully");
        });
    });

    describe("/api/profile (GET)", () => {
        it("should require edit_profile permission", async () => {
            mockWithPermissionAuthorization.mockResolvedValue({
                user: mockUser,
                error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
            });

            const response = await ProfileGET();
            
            expect(response.status).toBe(403);
            expect(mockWithPermissionAuthorization).toHaveBeenCalledWith('edit_profile');
        });

        it("should return profile when authorized", async () => {
            mockWithPermissionAuthorization.mockResolvedValue({
                user: mockUser,
                error: undefined
            });

            mockSupabaseClient.select.mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    single: jest.fn().mockResolvedValue({
                        data: {
                            id: 123,
                            username: "testuser",
                            email: "test@example.com",
                            display_name: "Test User"
                        },
                        error: null
                    })
                })
            });

            const response = await ProfileGET();
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data.username).toBe("testuser");
        });
    });

    describe("/api/profile (PUT)", () => {
        const createMockRequest = (body: any): NextRequest => {
            return new NextRequest("http://localhost:3000/api/profile", {
                method: "PUT",
                body: JSON.stringify(body),
            });
        };

        it("should require edit_profile permission", async () => {
            mockWithPermissionAuthorization.mockResolvedValue({
                user: mockUser,
                error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
            });

            const request = createMockRequest({
                displayName: "Updated Name"
            });

            const response = await ProfilePUT(request);
            
            expect(response.status).toBe(403);
            expect(mockWithPermissionAuthorization).toHaveBeenCalledWith('edit_profile');
        });
    });

    describe("Assignment Test Cases", () => {
        describe("C1-1: Admin user → GET /admin → 200", () => {
            it("should allow admin user to access admin users API", async () => {
                mockWithRoleAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: undefined
                });

                mockSupabaseClient.select.mockReturnValue({
                    ...mockSupabaseClient,
                    order: jest.fn().mockResolvedValue({
                        data: [],
                        error: null
                    })
                });

                const response = await AdminUsersGET();
                
                expect(response.status).toBe(200);
                expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin', 'manager']);
            });
        });

        describe("C1-2: Regular user → GET /admin → 403", () => {
            it("should deny regular user access to admin users API", async () => {
                mockWithRoleAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })
                });

                const response = await AdminUsersGET();
                
                expect(response.status).toBe(403);
            });
        });

        describe("C1-3: Manager user → GET /users → 200", () => {
            it("should allow manager user to access users API", async () => {
                mockWithRoleAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: undefined
                });

                mockSupabaseClient.select.mockReturnValue({
                    ...mockSupabaseClient,
                    order: jest.fn().mockResolvedValue({
                        data: [],
                        error: null
                    })
                });

                const response = await AdminUsersGET();
                
                expect(response.status).toBe(200);
                expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin', 'manager']);
            });
        });

        describe("C1-4: No user → GET /admin → 401", () => {
            it("should require authentication for admin API", async () => {
                mockWithRoleAuthorization.mockResolvedValue({
                    user: null as any,
                    error: new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
                });

                const response = await AdminUsersGET();
                
                expect(response.status).toBe(401);
            });
        });

        describe("C2-1: Multiple role access", () => {
            it("should accept admin user for admin/manager route", async () => {
                mockWithRoleAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: undefined
                });

                mockSupabaseClient.select.mockReturnValue({
                    ...mockSupabaseClient,
                    order: jest.fn().mockResolvedValue({
                        data: [],
                        error: null
                    })
                });

                const response = await AdminUsersGET();
                
                expect(response.status).toBe(200);
                expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin', 'manager']);
            });
        });

        describe("C2-2: Permission-based access", () => {
            it("should allow user with edit_profile permission to access profile", async () => {
                mockWithPermissionAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: undefined
                });

                mockSupabaseClient.select.mockReturnValue({
                    ...mockSupabaseClient,
                    eq: jest.fn().mockReturnValue({
                        ...mockSupabaseClient,
                        single: jest.fn().mockResolvedValue({
                            data: { id: 123, username: "testuser" },
                            error: null
                        })
                    })
                });

                const response = await ProfileGET();
                
                expect(response.status).toBe(200);
                expect(mockWithPermissionAuthorization).toHaveBeenCalledWith('edit_profile');
            });
        });

        describe("C2-3: Layered security check", () => {
            it("should require both admin role AND manage_users permission for DELETE", async () => {
                // First check (role) passes
                mockWithRoleAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: undefined
                });
                
                // Second check (permission) also passes
                mockWithPermissionAuthorization.mockResolvedValue({
                    user: mockUser,
                    error: undefined
                });

                // Mock successful user lookup and deletion
                mockSupabaseClient.select.mockReturnValue({
                    ...mockSupabaseClient,
                    eq: jest.fn().mockReturnValue({
                        ...mockSupabaseClient,
                        single: jest.fn().mockResolvedValue({
                            data: { id: 456, username: "targetuser" },
                            error: null
                        })
                    })
                });

                mockSupabaseClient.delete.mockReturnValue({
                    ...mockSupabaseClient,
                    eq: jest.fn().mockResolvedValue({ error: null })
                });

                const request = new NextRequest("http://localhost:3000/api/admin/users?userId=456", {
                    method: "DELETE",
                });

                const response = await AdminUsersDELETE(request);
                
                expect(response.status).toBe(200);
                expect(mockWithRoleAuthorization).toHaveBeenCalledWith(['admin']);
                expect(mockWithPermissionAuthorization).toHaveBeenCalledWith('manage_users');
            });
        });
    });
}); 