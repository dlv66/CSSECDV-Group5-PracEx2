export interface UsernameValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validates if a username is valid according to the allowed pattern
 * @param username - The username to check
 * @returns UsernameValidationResult - Object containing validity status and any error
 */
export function validateUsernameDetailed(
    username: string,
): UsernameValidationResult {
    // Username must be 3-20 characters, only letters, numbers, underscores
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return {
            isValid: false,
            error: "Username must be 3-20 characters and contain only letters, numbers, or underscores.",
        };
    }
    return { isValid: true };
}

/**
 * Validates username and returns a simple boolean result
 * @param username - The username to check
 * @returns boolean - True if username is valid, false otherwise
 */
export function isUsernameValid(username: string): boolean {
    return validateUsernameDetailed(username).isValid;
}

/**
 * Validates username and throws an error if not valid
 * @param username - The username to check
 * @throws Error if username is not valid
 */
export function assertUsernameValid(username: string): void {
    const result = validateUsernameDetailed(username);
    if (!result.isValid) {
        throw new Error(result.error || "Username is not valid");
    }
}
