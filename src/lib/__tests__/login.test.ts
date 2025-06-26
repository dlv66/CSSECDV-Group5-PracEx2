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
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        update: jest.fn().mockReturnThis(),
    })),
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
>;
const mockCompare = compare as jest.MockedFunction<typeof compare>;
const mockJwtSign = jwt.sign as jest.MockedFunction<typeof jwt.sign>;

describe("/api/login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = "test-secret";
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
                "id, username, email, password_hash",
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
                { id: "123", username: "testuser", email: "test@example.com" },
                "test-secret",
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
            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
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
            expect(data.error).toBe("Invalid credentials");
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
            expect(data.error).toBe("Invalid credentials");
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
            expect(data.error).toBe("Invalid credentials");
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

            expect(cookies).toContain("auth_token=mock-jwt-token");
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
});
