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
    
    if (!username.trim()) {
        return {
            isValid: false,
            error: "Username is required",
        };
    } else if (username.length < 3 || username.length > 30) {
        return {
            isValid: false,
            error: "Username must be 3-30 characters long",
        };
    } else if (username.includes("@") && !/^[A-Za-z0-9_-]+$/.test(username)) {
        return {
            isValid: false,
            error: "Username can only contain letters, numbers, hyphens, and underscores",
        };
    }else if (!username.includes("@") && !/^[A-Za-z0-9].*[A-Za-z0-9]$/.test(username)) {
        return {
            isValid: false,
            error: "Username cannot start or end with special characters",
        };
    }else if (/([^A-Za-z0-9])\1/.test(username)) {
        return {
            isValid: false,
            error: "Username cannot contain consecutive special characters",
        };
    }else {
        //  NEW: blacklist check
        const reserved = [
            // System / Admin terms
              "admin","administrator","root","sysadmin","superuser","support",
              "staff","help","helpdesk","contact","webmaster","operator","owner",
              "manager","moderator","guest","anonymous","security","test","tester",
              "api","ftp","www","mail","email","postmaster","info","billing","sales",
              "shop","store","blog","system","server","host","dev","developer",
              "dashboard","member","user","account","accounts","settings","config",
              "configurator","privacy","terms","policy","legal","about","status",
              "logout","login","signin","signup","register","verify","verification",
              "reset","recovery","activate","activation","unsubscribe","subscribe",
              "announcement","news","update","updates","alerts","notification","api",
              "metrics","analytics","cron","cache","cdn","static","assets","public",
              "private","internal","backup","debug","monitor","monitoring","logs",
              "logging","error","errors","exception","exceptions","health","healthcheck",

              // Generic invalid / meaningless
              "null","undefined","void","nan","unknown","random","foobar","foobar1",
              "testuser","example","sample","demo","demo1","placeholder","foo","bar","baz",

              // Common profanity
              "fuck","fucking","fucker","fuckers","motherfucker","shit","shitty", "fuq",
              "crap","damn","damned","piss","pissed","pissing","bitch","bitches",
              "ass","arse","asshole","dick","dickhead","cock","cocksucker","pussy",
              "tit","tits","bastard","bollocks","bugger","wanker","twat","slut","whore"
          ];
        if (reserved.includes(username.toLowerCase())) {
            return {
                isValid: false,
                error: "This username is not available",
            } 
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
