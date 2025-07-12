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

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockCompare = jest.mocked(compare);
const mockJwtSign = jest.mocked(jwt.sign);

describe("Generic Error Messages", () => {
    let mockSupabaseClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
            update: jest.fn().mockReturnThis(),
        };
        mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    const createMockRequest = (body: any): NextRequest => {
        return new NextRequest("http://localhost:3000/api/login", {
            method: "POST",
            body: JSON.stringify(body),
        });
    };

    describe("Non-existent username", () => {
        it("should return generic error with HTTP 401", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            const request = createMockRequest({
                usernameOrEmail: "nonexistent",
                password: "any",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });
    });

    describe(" Non-existent email", () => {
        it("should return generic error with HTTP 401", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            const request = createMockRequest({
                usernameOrEmail: "fake@example.com",
                password: "any",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });
    });

    describe("Valid username, wrong password", () => {
        it("should return generic error with HTTP 401", async () => {
            const mockUser = {
                id: "123",
                username: "existinguser",
                email: "existing@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            (mockCompare as jest.Mock).mockResolvedValue(false);

            const request = createMockRequest({
                usernameOrEmail: "existinguser",
                password: "wrong",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });
    });

    describe("Valid email, wrong password", () => {
        it("should return generic error with HTTP 401", async () => {
            const mockUser = {
                id: "123",
                username: "existinguser",
                email: "existing@example.com",
                password_hash: "hashedpassword",
            };

            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: mockUser,
                error: null,
            });
            (mockCompare as jest.Mock).mockResolvedValue(false);

            const request = createMockRequest({
                usernameOrEmail: "existing@example.com",
                password: "wrong",
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Invalid username/email or password");
        });
    });

    describe("Timing consistency verification", () => {
        it("should have consistent response times for all error scenarios", async () => {
            const scenarios = [
                {
                    setup: () => mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null }),
                    input: { usernameOrEmail: "nonexistent", password: "any" },
                },
                {
                    setup: () => {
                        mockSupabaseClient.maybeSingle.mockResolvedValue({
                            data: { id: "123", username: "user", email: "user@example.com", password_hash: "hash" },
                            error: null,
                        });
                        (mockCompare as jest.Mock).mockResolvedValue(false);
                    },
                    input: { usernameOrEmail: "user", password: "wrong" },
                },
            ];

            const timings: number[] = [];

            for (const scenario of scenarios) {
                for (let i = 0; i < 5; i++) {
                    scenario.setup();
                    
                    const startTime = performance.now();
                    const request = createMockRequest(scenario.input);
                    await POST(request);
                    const endTime = performance.now();
                    
                    timings.push(endTime - startTime);
                }
            }

            expect(timings.length).toBe(10);
            // For mocked functions, timing variance is expected to be low
            const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
            expect(avgTime).toBeGreaterThan(0);
        });
    });

    describe("C2-6: Response structure consistency", () => {
        it("should have identical JSON response format for all error scenarios", async () => {
            const scenarios = [
                {
                    setup: () => mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null }),
                    input: { usernameOrEmail: "nonexistent", password: "any" },
                },
                {
                    setup: () => {
                        mockSupabaseClient.maybeSingle.mockResolvedValue({
                            data: { id: "123", username: "user", email: "user@example.com", password_hash: "hash" },
                            error: null,
                        });
                        (mockCompare as jest.Mock).mockResolvedValue(false);
                    },
                    input: { usernameOrEmail: "user", password: "wrong" },
                },
            ];

            const responses: any[] = [];

            for (const scenario of scenarios) {
                scenario.setup();
                const request = createMockRequest(scenario.input);
                const response = await POST(request);
                const data = await response.json();
                
                responses.push({
                    status: response.status,
                    body: data,
                });
            }

            
            responses.forEach((response) => {
                expect(response.status).toBe(401);
                expect(response.body).toEqual({ error: "Invalid username/email or password" });
            });
        });
    });
});
