import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashed: string) {
  return await bcrypt.compare(password, hashed);
}

/* 
100 most common passwords obtained from 'https://nordpass.com/most-common-passwords-list/'
(Does not include passwords that satisfy the containsSequential() function)
*/
const commonPasswords: string[] = [
  'password', 'qwerty123', 'qwerty1', 'secret', 'password1', 'iloveyou',
  'dragon', 'monkey', 'football', 'princess', 'sunshine', 'baseball',
  'admin', 'welcome', 'login', 'abc123', '11111111', 'password123',
  'solo', '666666', 'lovely', 'shadow', 'ashley', 'mustang', 'sunshine1',
  'hello', 'freedom', 'flower', 'hottie', 'mynoob', 'trustno1', 'starwars',
  'batman', 'passw0rd', 'zaq1zaq1', '1qaz2wsx', 'qazwsx', 'donald',
  'whatever', 'dragon', 'password2', '123qwe', 'hello123', 'charlie',
  'robert', 'thomas', 'jessica', 'daniel', 'computer', 'michelle',
  'ginger', 'pepper', 'iloveyou1', 'ginger', 'shadow1', 'cooper',
  'jordan', 'taylor', 'hunter', 'hannah', 'chocolate', 'buster',
  'george', 'chelsea', 'melissa', 'scooter', 'michael', 'butterfly',
  'yellow', 'sunshine2', 'jordan23', 'maddison', 'andrew', 'liverpool',
  'molly', 'justin', 'loveme', 'q1w2e3r4', 'asdfgh', 'patrick', 'alexander',
  'puppy', 'marina', 'cookie', 'richard', 'anthony', 'andrea', 'thunder',
  'debbie', 'superman', '123abc', 'jasmine', 'magic', 'qwertyuiop',
  'zxcvbnm', 'nicole', 'jennifer', 'monkey123', 'batman1', 'loveyou'
];

export function validatePasswordStrength(password: string, username: string, email: string): string | null {
  if (password.length < 8)
    return 'Password must be at least 8 characters long';

  if (password.length > 128)
    return 'Password must not exceed 128 characters';

  if (commonPasswords.includes(password.toLowerCase()))
    return 'This password is too common';

  if (password.toLowerCase() === username.toLowerCase())
    return 'Password cannot be the same as your username';

  const emailLocal = email.split('@')[0];
  if (password.toLowerCase() === emailLocal.toLowerCase())
    return 'Password cannot be the same as your email';

  if (containsSequential(password))
    return 'Password cannot contain sequential characters';

  return null; // valid
}

// Helper function for rejecting passwords with 4 or more sequential chars
function containsSequential(password: string): boolean {
  const normalized = password.replace(/[^0-9a-zA-Z]/g, '');
  let count = 1;

  for (let i = 1; i < normalized.length; i++) {
    const curr = normalized.charCodeAt(i);
    const prev = normalized.charCodeAt(i - 1);

    if (curr === prev + 1) {
      count++;
      if (count >= 4) return true;
    } else {
      count = 1;
    }
  }

  return false;
}