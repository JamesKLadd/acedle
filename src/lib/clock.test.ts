import { describe, expect, it } from "vitest";

import { fmtCountdown, msUntilReset } from "./clock";

describe("msUntilReset", () => {
  it("counts down to the next UTC midnight", () => {
    expect(msUntilReset(Date.parse("2026-10-24T23:59:59.000Z"))).toBe(1000);
    expect(msUntilReset(Date.parse("2026-10-24T00:00:00.000Z"))).toBe(86_400_000);
    expect(msUntilReset(Date.parse("2026-12-31T12:00:00.000Z"))).toBe(43_200_000);
  });
});

describe("fmtCountdown", () => {
  it("formats hours, minutes and seconds", () => {
    expect(fmtCountdown(27_733_000)).toBe("07:42:13");
    expect(fmtCountdown(999)).toBe("00:00:01");
    expect(fmtCountdown(-5)).toBe("00:00:00");
  });
});
