// username.test.ts
import {
   validateUsernameDetailed,
   isUsernameValid,
   assertUsernameValid,
 } from "../validation/username";
 
 describe("Username Validation", () => {
   it("should return valid username registration", async () => {
     const result = await validateUsernameDetailed("validuser123");
     expect(result.isValid).toBe(true);
     expect(isUsernameValid("validuser123")).resolves.toBe(true);
     await expect(assertUsernameValid("validuser123")).resolves.not.toThrow();
   });
 
   it("should handle case-sensitive username", async () => {
     const result = await validateUsernameDetailed("TestUser");
     expect(result.isValid).toBe(true);
   });
 
   it("should return short character length error", async () => {
     const result = await validateUsernameDetailed("ab");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe("Username must be 3–30 characters long");
     await expect(isUsernameValid("ab")).resolves.toBe(false);
   });
 
   it("should return long character length error", async () => {
     const text = "averyveryverylongusernamethatexceedslimit";
     const result = await validateUsernameDetailed(text);
     expect(result.isValid).toBe(false);
     expect(result.error).toBe("Username must be 3–30 characters long");
   });
 
   it("should return invalid characters", async () => {
     const result = await validateUsernameDetailed("user@name");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe(
       "Username can only contain letters, numbers, hyphens, and underscores"
     );
   });
 
   it("should return username start/end with special character error", async () => {
     const result = await validateUsernameDetailed("-username_");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe(
       "Username cannot start or end with special characters"
     );
   });
 
   it("should return no consecutive special character error", async () => {
     const result = await validateUsernameDetailed("user--name");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe(
       "Username cannot contain consecutive special characters"
     );
   });
 
   it("should return username not available", async () => {
     const result = await validateUsernameDetailed("admin");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe(
       "This username is not available"
     );
   });
 
   it("U1-9: Duplicate username (case-insensitive)", async () => {
     // Mock your existence check to return true here, or hit a test endpoint
     const result = await validateUsernameDetailed("ExistingUser");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe("That username is already taken");
   });
 
   it("U1-10: Empty string", async () => {
     const result = await validateUsernameDetailed("");
     expect(result.isValid).toBe(false);
     expect(result.error).toBe("Username is required");
   });
 });
 