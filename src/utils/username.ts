/**
 * Generates a username from an email address
 * Removes all special characters and ensures only alphanumeric characters remain
 * @param email - The email address to generate username from
 * @returns A clean username string
 */
export function generateUsernameFromEmail(email: string): string {
  if (!email)
    return "";

  // Extract the part before @ symbol
  const localPart = email.split("@")[0];

  // Remove all special characters, keeping only alphanumeric
  const cleanUsername = localPart
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  // Ensure minimum length and add fallback if empty
  if (cleanUsername.length === 0) {
    return "user";
  }

  // Limit length to reasonable size (max 20 characters)
  return cleanUsername.slice(0, 20);
}

/**
 * Generates a unique username from an email address
 * If the generated username already exists, appends a number suffix
 * @param email - The email address to generate username from
 * @param findExisting - Function to check if username already exists
 * @returns A unique username string
 */
export async function generateUniqueUsernameFromEmail(
  email: string,
  findExisting: (username: string) => Promise<boolean>,
): Promise<string> {
  const baseUsername = generateUsernameFromEmail(email);
  let uniqueUsername = baseUsername;
  let suffix = 1;

  while (await findExisting(uniqueUsername)) {
    uniqueUsername = `${baseUsername}${suffix}`;
    suffix += 1;

    // Prevent infinite loops with reasonable limit
    if (suffix > 999) {
      uniqueUsername = `${baseUsername}${Date.now()}`;
      break;
    }
  }

  return uniqueUsername;
}
