import { FREE_VOTE_INTERVAL } from "@/constants";
import { db } from "@/db";

/**
 * Validates if a user can cast a free vote based on the 24-hour cooldown
 */
export async function validateFreeVote(voterId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({
    where: { id: voterId },
    select: { lastFreeVoteAt: true },
  });

  if (!profile?.lastFreeVoteAt) {
    return true; // No previous free vote, so it's valid
  }

  const timeSinceLastVote = Date.now() - profile.lastFreeVoteAt.getTime();
  return timeSinceLastVote >= FREE_VOTE_INTERVAL;
}

/**
 * Updates the user's last free vote timestamp
 */
export async function updateLastFreeVote(voterId: string): Promise<void> {
  await db.profile.update({
    where: { id: voterId },
    data: { lastFreeVoteAt: new Date() },
  });
}
