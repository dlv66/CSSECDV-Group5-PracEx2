// Set environment variable before importing
process.env.JWT_SECRET = "test-secret";

import { POST } from "@/app/api/login/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("@/lib/utils/supabase/server", () => ({
    createClient: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        update: jest.fn().mockReturnThis(),
    })),
}));
jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
>;
const mockCompare = jest.mocked(compare);
const mockJwtSign = jest.mocked(jwt.sign);

describe("/api/login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = (body: any): NextRequest => {
        return new NextRequest("http://localhost:3000/api/login", {
            method: "POST",
            body: JSON.stringify(body),
        });
    };

    const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        update: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
        mockCreateClient.mockResolvedValue(mockSupabaseClient as any);
    });

    describe("POST", () => {
        it("should return 400 when username/email is missing", async () => {
            const request = createMockRequest({ password: "testpass" });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Username/email and password are required");
        });

        it("should return 400 when password is missing", async () => {
            const request = createMockRequest({ usernameOrEmail: "testuser" });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Username/email and password are required");
        });

        it("should return 400 when both fields are missing", async () => {
            const request = createMockRequest({});

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Username/email and password are required");
        });

        it("should handle email login successfully", async () => {
            const mockUser = {
                id: "123",
                username: "testuser",
                email: "test@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            mockCompare.mockResolvedValue(true);
            mockJwtSign.mockReturnValue("mock-jwt-token");

            const request = createMockRequest({
                usernameOrEmail: "test@example.com",
                password: "testpass",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe("Login successful");
            expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
            expect(mockSupabaseClient.select).toHaveBeenCalledWith(
                "id, username, email, display_name, password_hash",
            );
            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                "email",
                "test@example.com",
            );
            expect(mockCompare).toHaveBeenCalledWith(
                "testpass",
                "hashedpassword",
            );
            expect(mockJwtSign).toHaveBeenCalledWith(
                { 
                    id: "123", 
                    username: "testuser", 
                    email: "test@example.com", 
                    displayName: undefined 
                },
                "3076e6b41e660e0f50c1994a842c7667203d616d89654028dd4fbf89b9605090",
                { expiresIn: "7d" },
            );
        });

        it("should handle username login successfully", async () => {
            const mockUser = {
                id: "123",
                username: "testuser",
                email: "test@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            mockCompare.mockResolvedValue(true);
            mockJwtSign.mockReturnValue("mock-jwt-token");

            const request = createMockRequest({
                usernameOrEmail: "testuser",
                password: "testpass",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe("Login successful");
            expect(mockSupabaseClient.ilike).toHaveBeenCalledWith(
                "username",
                "testuser",
            );
        });

        it("should return 401 when user is not found", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            const request = createMockRequest({
                usernameOrEmail: "nonexistent@example.com",
                password: "testpass",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });

        it("should return 401 when password is incorrect", async () => {
            const mockUser = {
                id: "123",
                username: "testuser",
                email: "test@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            mockCompare.mockResolvedValue(false);

            const request = createMockRequest({
                usernameOrEmail: "test@example.com",
                password: "wrongpass",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });

        it("should return 401 when database error occurs", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: { message: "Database error" },
            });

            const request = createMockRequest({
                usernameOrEmail: "test@example.com",
                password: "testpass",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });

        it("should set http-only cookie on successful login", async () => {
            const mockUser = {
                id: "123",
                username: "testuser",
                email: "test@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            mockCompare.mockResolvedValue(true);
            mockJwtSign.mockReturnValue("mock-jwt-token");

            const request = createMockRequest({
                usernameOrEmail: "test@example.com",
                password: "testpass",
            });

            const response = await POST(request);
            const cookies = response.headers.get("set-cookie");

            expect(cookies).toContain("id=mock-jwt-token");
            expect(cookies).toContain("HttpOnly");
            expect(cookies).toContain("Path=/");
        });

        it("should update last_login timestamp", async () => {
            const mockUser = {
                id: "123",
                username: "testuser",
                email: "test@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            mockCompare.mockResolvedValue(true);
            mockJwtSign.mockReturnValue("mock-jwt-token");

            const request = createMockRequest({
                usernameOrEmail: "test@example.com",
                password: "testpass",
            });

            await POST(request);

            expect(mockSupabaseClient.update).toHaveBeenCalledWith({
                last_login: expect.any(String),
            });
            expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "123");
        });
    });

    describe("Dual Login Support", () => {
        describe("Login with username", () => {
            it("should login successfully with username", async () => {
                const mockUser = {
                    id: "123",
                    username: "testuser",
                    email: "test@example.com",
                    password_hash: "hashedpassword",
                };

                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: mockUser,
                    error: null,
                });
                

                const request = createMockRequest({
                    usernameOrEmail: "testuser",
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.message).toBe("Login successful");
                expect(mockSupabaseClient.ilike).toHaveBeenCalledWith(
                    "username",
                    "testuser",
                );
            });
        });

        describe("Login with email", () => {
            it("should login successfully with email", async () => {
                const mockUser = {
                    id: "123",
                    username: "testuser",
                    email: "test@example.com",
                    password_hash: "hashedpassword",
                };

                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: mockUser,
                    error: null,
                });
                

                const request = createMockRequest({
                    usernameOrEmail: "test@example.com",
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.message).toBe("Login successful");
                expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                    "email",
                    "test@example.com",
                );
            });
        });

        describe("Username case insensitivity", () => {
            it("should login successfully with different username case", async () => {
                const mockUser = {
                    id: "123",
                    username: "TestUser",
                    email: "test@example.com",
                    password_hash: "hashedpassword",
                };

                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: mockUser,
                    error: null,
                });


                const request = createMockRequest({
                    usernameOrEmail: "testuser", 
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.message).toBe("Login successful");
                // ilike performs case-insensitive search
                expect(mockSupabaseClient.ilike).toHaveBeenCalledWith(
                    "username",
                    "testuser",
                );
            });
        });

        describe("Email case insensitivity", () => {
            it("should login successfully with different email case", async () => {
                const mockUser = {
                    id: "123",
                    username: "testuser",
                    email: "test@example.com",
                    password_hash: "hashedpassword",
                };

                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: mockUser,
                    error: null,
                });

                const request = createMockRequest({
                    usernameOrEmail: "Test@Example.com", // mixed case input
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.message).toBe("Login successful");
                // Email should be converted to lowercase before lookup
                expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                    "email",
                    "test@example.com",
                );
            });
        });

        describe("Invalid username format", () => {
            it("should fail with generic error for username containing @", async () => {
                // When input contains @ but is not a valid email format,
                // it will be treated as email and likely fail lookup
                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const request = createMockRequest({
                    usernameOrEmail: "user@invalid", // Contains @ but invalid format
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(401);
                expect(data.error).toBe("Invalid username/email or password");
                // Should be treated as email (contains @)
                expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                    "email",
                    "user@invalid",
                );
            });
        });

        describe("Edge cases", () => {
            it("should handle email with multiple @ symbols", async () => {
                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const request = createMockRequest({
                    usernameOrEmail: "user@@example.com",
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(401);
                expect(data.error).toBe("Invalid username/email or password");
                expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                    "email",
                    "user@@example.com",
                );
            });

            it("should handle username with numbers and underscores", async () => {
                const mockUser = {
                    id: "123",
                    username: "test_user_123",
                    email: "test@example.com",
                    password_hash: "hashedpassword",
                };

                mockSupabaseClient.maybeSingle.mockResolvedValue({
                    data: mockUser,
                    error: null,
                });


                const request = createMockRequest({
                    usernameOrEmail: "test_user_123",
                    password: "testpass",
                });

                const response = await POST(request);
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.message).toBe("Login successful");
                expect(mockSupabaseClient.ilike).toHaveBeenCalledWith(
                    "username",
                    "test_user_123",
                );
            });
        });
    });
});
