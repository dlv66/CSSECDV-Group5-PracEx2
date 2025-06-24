import {
    hashPassword,
    verifyPassword,
    validatePasswordStrength,
} from "../password_auth";

describe("Password Authentication", () => {
    describe("hashPassword", () => {
        it("should hash a password", async () => {
            const password = "testPassword123";
            const hashed = await hashPassword(password);

            expect(hashed).toBeDefined();
            expect(hashed).not.toBe(password);
            expect(hashed.length).toBeGreaterThan(0);
        });

        it("should produce different hashes for the same password", async () => {
            const password = "testPassword123";
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe("verifyPassword", () => {
        it("should verify a correct password", async () => {
            const password = "testPassword123";
            const hashed = await hashPassword(password);
            const isValid = await verifyPassword(password, hashed);

            expect(isValid).toBe(true);
        });

        it("should reject an incorrect password", async () => {
            const password = "testPassword123";
            const wrongPassword = "wrongPassword123";
            const hashed = await hashPassword(password);
            const isValid = await verifyPassword(wrongPassword, hashed);

            expect(isValid).toBe(false);
        });
    });

    describe("validatePasswordStrength", () => {
        it("should accept a strong password", () => {
            const result = validatePasswordStrength(
                "StrongPass123!",
                "testuser",
                "test@example.com",
            );
            expect(result).toBeNull();
        });

        it("should reject passwords shorter than 8 characters", () => {
            const result = validatePasswordStrength(
                "short",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("Password must be at least 8 characters long");
        });

        it("should reject passwords longer than 128 characters", () => {
            const longPassword = "a".repeat(129);
            const result = validatePasswordStrength(
                longPassword,
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("Password must not exceed 128 characters");
        });

        it("should reject common passwords", () => {
            const result = validatePasswordStrength(
                "password",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("This password is too common");
        });

        it("should reject password same as username", () => {
            const result = validatePasswordStrength(
                "testuser",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("Password cannot be the same as your username");
        });

        it("should reject password same as email local part", () => {
            const result = validatePasswordStrength(
                "test",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("Password cannot be the same as your email");
        });

        it("should reject passwords with sequential characters", () => {
            const result = validatePasswordStrength(
                "abcd1234",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe(
                "Password cannot contain sequential characters",
            );
        });

        it("should reject passwords with sequential numbers", () => {
            const result = validatePasswordStrength(
                "test1234",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe(
                "Password cannot contain sequential characters",
            );
        });

        it("should accept passwords with non-sequential characters", () => {
            const result = validatePasswordStrength(
                "testacbd",
                "testuser",
                "test@example.com",
            );
            expect(result).toBeNull();
        });

        it("should handle case insensitive username comparison", () => {
            const result = validatePasswordStrength(
                "TESTUSER",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("Password cannot be the same as your username");
        });

        it("should handle case insensitive email comparison", () => {
            const result = validatePasswordStrength(
                "TEST",
                "testuser",
                "test@example.com",
            );
            expect(result).toBe("Password cannot be the same as your email");
        });
    });
});
