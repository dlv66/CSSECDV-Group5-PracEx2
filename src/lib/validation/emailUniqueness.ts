import { createClient } from "@/lib/utils/supabase/server";

export interface EmailUniquenessResult {
    isUnique: boolean;
    error?: string;
}

// Minimum duration for timing consistency (in ms)
const MIN_CHECK_DURATION_MS = 300;

/**
 * Validates if an email address is unique in the database
 * @param email - The email address to check
 * @param excludeUserId - Optional user ID to exclude from the check (useful for updates)
 * @returns Promise<EmailUniquenessResult> - Object containing uniqueness status and any error
 */
export async function validateEmailUniqueness(
    email: string,
    excludeUserId?: number,
): Promise<EmailUniquenessResult> {
    const start = Date.now();
    try {
        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase().trim();

        // Basic email format validation
        if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
            await ensureMinDuration(start);
            return {
                isUnique: false,
                error: "Invalid email format",
            };
        }

        // Reject emails with consecutive dots in local or domain part
        const [local, domain] = normalizedEmail.split("@");
        if (local?.includes("..") || domain?.includes("..")) {
            await ensureMinDuration(start);
            return {
                isUnique: false,
                error: "Invalid email format",
            };
        }

        // Reject emails exceeding 320 characters
        if (normalizedEmail.length > 320) {
            await ensureMinDuration(start);
            return {
                isUnique: false,
                error: "Email address must not exceed 320 characters",
            };
        }

        const supabase = await createClient();

        // Build the query
        let query = supabase
            .from("users")
            .select("id, email")
            .eq("email", normalizedEmail);

        // Exclude current user if updating
        if (excludeUserId) {
            query = query.neq("id", excludeUserId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            await ensureMinDuration(start);
            return {
                isUnique: false,
                error: "Database error occurred while checking email uniqueness",
            };
        }

        // If data exists, email is not unique
        if (data) {
            await ensureMinDuration(start);
            return {
                isUnique: false,
                error: "Email address is already registered",
            };
        }

        await ensureMinDuration(start);
        return {
            isUnique: true,
        };
    } catch {
        await ensureMinDuration(start);
        return {
            isUnique: false,
            error: "An unexpected error occurred while validating email uniqueness",
        };
    }
}

async function ensureMinDuration(start: number) {
    const elapsed = Date.now() - start;
    if (elapsed < MIN_CHECK_DURATION_MS) {
        await new Promise((resolve) =>
            setTimeout(resolve, MIN_CHECK_DURATION_MS - elapsed),
        );
    }
}

/**
 * Validates email uniqueness and returns a simple boolean result
 * @param email - The email address to check
 * @param excludeUserId - Optional user ID to exclude from the check
 * @returns Promise<boolean> - True if email is unique, false otherwise
 */
export async function isEmailUnique(
    email: string,
    excludeUserId?: number,
): Promise<boolean> {
    const result = await validateEmailUniqueness(email, excludeUserId);
    return result.isUnique;
}

/**
 * Validates email uniqueness and throws an error if not unique
 * @param email - The email address to check
 * @param excludeUserId - Optional user ID to exclude from the check
 * @throws Error if email is not unique or validation fails
 */
export async function assertEmailUniqueness(
    email: string,
    excludeUserId?: number,
): Promise<void> {
    const result = await validateEmailUniqueness(email, excludeUserId);

    if (!result.isUnique) {
        throw new Error(result.error || "Email is not unique");
    }
}
