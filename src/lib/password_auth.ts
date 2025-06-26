import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;

// Minimum duration for timing consistency (in ms)
const MIN_VERIFICATION_DURATION = 100;

// This is a real bcrypt hash of "PasswordTest123"
const DUMMY_HASH = "$2b$12$AJtoqNl/gmopQXGwuzF9iu8h1EYNOgiDbUSDSNEJrMHlN45Ea5dCy";

async function ensureMinVerificationDuration(start: number) {
  const elapsed = Date.now() - start;
  if (elapsed < MIN_VERIFICATION_DURATION) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_VERIFICATION_DURATION - elapsed)
    );
  }
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const start = Date.now();
  
  try {
    // Always perform a hash comparison, EVEN IF USER DOESN'T EXIST
    const hashToCompare = hash || DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);
    
    // If user doesn't exist (hash was null), always return false
    const result = hash ? isValid : false;
    
    await ensureMinVerificationDuration(start);
    return result;
  } catch {
    await ensureMinVerificationDuration(start);
    return false;
  }
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

  if (password.toLowerCase() === username.toLowerCase())
    return 'Password cannot be the same as your username';

  const emailLocal = email.split('@')[0];
  if (password.toLowerCase() === emailLocal.toLowerCase())
    return 'Password cannot be the same as your email';

  if (commonPasswords.includes(password.toLowerCase()))
    return 'This password is too common';

  if (containsSequential(password))
    return 'Password cannot contain sequential characters';

  if (password.length < 8)
    return 'Password must be at least 8 characters long';

  if (password.length > 128)
    return 'Password must not exceed 128 characters';

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


export function validateBcryptHash(hash: string): {
  isValid: boolean;
  algorithm?: string;
  costFactor?: number;
  error?: string;
} {
  // bcrypt format: $2b$12$[22-char salt][31-char hash] = 60 chars total, 7 yung header
  const bcryptRegex = /^\$2[ab]\$(\d{2})\$.{53}$/;
  const match = hash.match(bcryptRegex);
  
  if (!match) {
    return {
      isValid: false,
      error: 'Invalid bcrypt hash format'
    };
  }
  
  const costFactor = parseInt(match[1], 10);
  
  if (costFactor < 12 || costFactor > 20) { // minimum is 12, 20 is hula, 14 recommended
    return {
      isValid: false,
      error: 'Invalid bcrypt cost factor'
    };
  }
  
  const algorithm = hash.substring(0, 3); // $2a or $2b
  
  return {
    isValid: true,
    algorithm,
    costFactor
  };
}


export async function measureHashTiming(password: string): Promise<{
  hash: string;
  timeMs: number;
  validation: ReturnType<typeof validateBcryptHash>;
}> {
  const startTime = Date.now();
  const hash = await hashPassword(password);
  const timeMs = Date.now() - startTime;
  
  const validation = validateBcryptHash(hash);
  
  return {
    hash,
    timeMs,
    validation
  };
}


export async function measureVerificationTiming(
  password: string, 
  hash: string
): Promise<{
  isValid: boolean;
  timeMs: number;
}> {
  const start = Date.now();
  const isValid = await verifyPassword(password, hash);
  const timeMs = Date.now() - start;
  
  return {
    isValid,
    timeMs
  };
}