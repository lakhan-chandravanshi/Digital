export type PrizeTier = "FIVE_MATCH" | "FOUR_MATCH" | "THREE_MATCH";

export function retainLatestScores<T extends { scoreDate: Date }>(scores: T[], limit = 5) {
  return [...scores].sort((left, right) => right.scoreDate.getTime() - left.scoreDate.getTime()).slice(0, limit);
}

export function calculatePrizeShares(pool: number, rollover: number, winners: Record<PrizeTier, number>) {
  const fivePool = pool * 0.4 + rollover;
  return {
    FIVE_MATCH: { total: winners.FIVE_MATCH ? fivePool : 0, perWinner: winners.FIVE_MATCH ? fivePool / winners.FIVE_MATCH : 0 },
    FOUR_MATCH: { total: winners.FOUR_MATCH ? pool * 0.35 : 0, perWinner: winners.FOUR_MATCH ? (pool * 0.35) / winners.FOUR_MATCH : 0 },
    THREE_MATCH: { total: winners.THREE_MATCH ? pool * 0.25 : 0, perWinner: winners.THREE_MATCH ? (pool * 0.25) / winners.THREE_MATCH : 0 },
    rollover: winners.FIVE_MATCH ? 0 : fivePool,
  };
}
