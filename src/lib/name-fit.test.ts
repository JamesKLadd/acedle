import { describe, expect, it } from "vitest";

import { longestWordEm } from "./name-fit";

describe("longestWordEm", () => {
  it("measures the widest word", () => {
    // S C H W A R T Z M A N, close to the browser's 9.25em.
    expect(longestWordEm("Diego Schwartzman")).toBeCloseTo(9.41, 2);
    expect(longestWordEm("Diego Schwartzman")).toBe(longestWordEm("Schwartzman"));
  });

  it("lets hyphenated names break after the hyphen", () => {
    expect(longestWordEm("Edouard Roger-Vasselin")).toBe(longestWordEm("Vasselin"));
    expect(longestWordEm("Jo-Wilfried Tsonga")).toBe(longestWordEm("Wilfried"));
  });

  it("ignores accents and case", () => {
    expect(longestWordEm("Đoković")).toBeCloseTo(longestWordEm("Dokovic"), 5);
    expect(longestWordEm("andré")).toBe(longestWordEm("ANDRE"));
  });
});
