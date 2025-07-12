import {
    validateEmailUniqueness,
    isEmailUnique,
    assertEmailUniqueness,
} from "@/lib/validation/emailUniqueness";
import { createClient } from "@/lib/utils/supabase/server";

// Mock dependencies
jest.mock("../utils/supabase/server", () => ({
    createClient: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
    })),
}));

const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
>;

describe("Email Uniqueness Validation", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabaseClient: any;

    beforeEach(() => {
        mockSupabaseClient = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
        };

        mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("validateEmailUniqueness", () => {
        it("should return unique for valid email that doesn't exist", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await validateEmailUniqueness("test@example.com");

            expect(result.isUnique).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
            expect(mockSupabaseClient.select).toHaveBeenCalledWith("id, email");
            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                "email",
                "test@example.com",
            );
        });

        it("should return not unique for existing email", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: { id: 1, email: "test@example.com" },
                error: null,
            });

            const result = await validateEmailUniqueness("test@example.com");

            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Email address is already registered");
        });

        it("should handle database errors", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: { message: "Database connection failed" },
            });

            const result = await validateEmailUniqueness("test@example.com");

            expect(result.isUnique).toBe(false);
            expect(result.error).toBe(
                "Database error occurred while checking email uniqueness",
            );
        });

        it("should normalize email to lowercase", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            await validateEmailUniqueness("TEST@EXAMPLE.COM");

            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                "email",
                "test@example.com",
            );
        });

        it("should trim whitespace from email", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            await validateEmailUniqueness("  test@example.com  ");

            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                "email",
                "test@example.com",
            );
        });

        it("should reject invalid email format", async () => {
            const result = await validateEmailUniqueness("invalid-email");

            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Invalid email format");
            expect(mockSupabaseClient.from).not.toHaveBeenCalled();
        });

        it("should reject empty email", async () => {
            const result = await validateEmailUniqueness("");

            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Invalid email format");
        });

        it("should exclude user ID when provided", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            await validateEmailUniqueness("test@example.com", 123);

            expect(mockSupabaseClient.neq).toHaveBeenCalledWith("id", 123);
        });

        it("should handle unexpected errors", async () => {
            mockSupabaseClient.maybeSingle.mockRejectedValue(
                new Error("Unexpected error"),
            );

            const result = await validateEmailUniqueness("test@example.com");

            expect(result.isUnique).toBe(false);
            expect(result.error).toBe(
                "An unexpected error occurred while validating email uniqueness",
            );
        });

        it("should reject email with consecutive dots in local part", async () => {
            const result = await validateEmailUniqueness(
                "foo..bar@example.com",
            );
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Invalid email format");
        });

        it("should reject email with consecutive dots in domain part", async () => {
            const result = await validateEmailUniqueness(
                "foobar@exa..mple.com",
            );
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Invalid email format");
        });

        it("should reject email exceeding 320 characters", async () => {
            const longEmail = `${"a".repeat(64)}@${"b".repeat(255)}.com`;
            // This will be >320 chars
            const result = await validateEmailUniqueness(longEmail);
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe(
                "Email address must not exceed 320 characters",
            );
        });

        it("should reject email with missing domain", async () => {
            const result = await validateEmailUniqueness("user@");
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Invalid email format");
        });

        it("should accept mixed case email, normalize to lowercase, and store as lowercase", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });
            const result = await validateEmailUniqueness(
                "TestUser@EXAMPLE.COM",
            );
            expect(result.isUnique).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                "email",
                "testuser@example.com",
            );
        });

        it("should accept email with dots in local part and subdomains", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });
            const result = await validateEmailUniqueness(
                "test.user@mail.domain.org",
            );
            expect(result.isUnique).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
                "email",
                "test.user@mail.domain.org",
            );
        });
    });

    describe("isEmailUnique", () => {
        it("should return true for unique email", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await isEmailUnique("test@example.com");

            expect(result).toBe(true);
        });

        it("should return false for existing email", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: { id: 1, email: "test@example.com" },
                error: null,
            });

            const result = await isEmailUnique("test@example.com");

            expect(result).toBe(false);
        });
    });

    describe("assertEmailUniqueness", () => {
        it("should not throw for unique email", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            await expect(
                assertEmailUniqueness("test@example.com"),
            ).resolves.not.toThrow();
        });

        it("should throw error for existing email", async () => {
            mockSupabaseClient.maybeSingle.mockResolvedValue({
                data: { id: 1, email: "test@example.com" },
                error: null,
            });

            await expect(
                assertEmailUniqueness("test@example.com"),
            ).rejects.toThrow("Email address is already registered");
        });

        it("should throw error for invalid email format", async () => {
            await expect(
                assertEmailUniqueness("invalid-email"),
            ).rejects.toThrow("Invalid email format");
        });
    });
});
