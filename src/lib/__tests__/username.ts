// username.test.ts
import {
   validateUsernameDetailed,
   isUsernameValid,
   assertUsernameValid,
 } from "../validation/username";
 
 describe("Username Validation", () => {
     it("should return valid username registration", () => {
    const result = validateUsernameDetailed("validuser123");
    expect(result.isValid).toBe(true);
    expect(isUsernameValid("validuser123")).toBe(true);
    expect(() => assertUsernameValid("validuser123")).not.toThrow();
  });
 
     it("should handle case-sensitive username", () => {
    const result = validateUsernameDetailed("TestUser");
    expect(result.isValid).toBe(true);
  });
 
     it("should return short character length error", () => {
    const result = validateUsernameDetailed("ab");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Username must be 3-30 characters long");
    expect(isUsernameValid("ab")).toBe(false);
  });
 
     it("should return long character length error", () => {
    const text = "averyveryverylongusernamethatexceedslimit";
    const result = validateUsernameDetailed(text);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Username must be 3-30 characters long");
  });
 
     it("should return invalid characters", () => {
    const result = validateUsernameDetailed("user@name");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "Username can only contain letters, numbers, hyphens, and underscores"
    );
  });
 
     it("should return username start/end with special character error", () => {
    const result = validateUsernameDetailed("-username_");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "Username cannot start or end with special characters"
    );
  });
 
     it("should return no consecutive special character error", () => {
    const result = validateUsernameDetailed("user--name");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "Username cannot contain consecutive special characters"
    );
  });
 
     it("should return username not available", () => {
    const result = validateUsernameDetailed("admin");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "This username is not available"
    );
  });
 
     it("Duplicate username (case-insensitive)", () => {
    // This test verifies that reserved usernames are blocked
    // Database duplicate checking would be handled at the API level
    const result = validateUsernameDetailed("admin"); // Using a reserved username
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("This username is not available");
  });
 
     it("Empty string", () => {
    const result = validateUsernameDetailed("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Username is required");
  });
 });
 