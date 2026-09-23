import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePrizeShares, retainLatestScores } from "../src/lib/rules.js";
import { createToken, hashPassword, verifyPassword } from "../src/lib/auth.js";

describe("Digital Heroes business rules", () => {
  it("retains the five newest scores", () => {
    const scores = Array.from({ length: 6 }, (_, index) => ({ scoreDate: new Date(Date.UTC(2026, 0, index + 1)), scoreValue: index + 1 }));
    const retained = retainLatestScores(scores);
    assert.equal(retained.length, 5);
    assert.equal(retained[0].scoreValue, 6);
    assert.equal(retained[4].scoreValue, 2);
  });

  it("splits tiers and rolls an unclaimed jackpot", () => {
    const shares = calculatePrizeShares(1000, 200, { FIVE_MATCH: 0, FOUR_MATCH: 2, THREE_MATCH: 1 });
    assert.equal(shares.FIVE_MATCH.total, 0);
    assert.equal(shares.FIVE_MATCH.perWinner, 0);
    assert.equal(shares.FOUR_MATCH.perWinner, 175);
    assert.equal(shares.THREE_MATCH.perWinner, 250);
    assert.equal(shares.rollover, 600);
  });

  it("hashes passwords and signs tokens", () => {
    const stored = hashPassword("correct horse battery staple");
    assert.equal(verifyPassword("correct horse battery staple", stored), true);
    assert.equal(verifyPassword("wrong", stored), false);
    assert.equal(createToken("user-123").split(".").length, 2);
  });
});
