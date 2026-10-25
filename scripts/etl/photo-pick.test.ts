import { describe, expect, it } from "vitest";

import { fold, photoScore, pickForSeasons, plainText, yearIn, type Candidate } from "./photo-pick";

const photo = (over: Partial<Candidate>): Candidate => ({
  file: "Roger Federer.jpg",
  year: null,
  thumb: "",
  width: 600,
  height: 800,
  author: "",
  license: "CC BY-SA 4.0",
  licenseUrl: null,
  score: 0,
  ...over,
});

describe("yearIn", () => {
  it("finds a plausible year", () => {
    expect(yearIn("Category:Roger Federer at the 2007 US Open")).toBe(2007);
    expect(yearIn("Category:Roger Federer in 1998")).toBe(1998);
    expect(yearIn("Federer 12345.jpg")).toBeNull();
    expect(yearIn("Category:Roger Federer by year")).toBeNull();
  });
});

describe("fold / plainText", () => {
  it("drops accents and HTML", () => {
    expect(fold("Novak Đoković")).toBe("novak dokovic");
    expect(plainText('<a href="//x">Jane &amp; Co</a>\n photo')).toBe("Jane & Co photo");
  });
});

describe("photoScore", () => {
  it("prefers upright photos named after the player and skips non-photos", () => {
    const upright = photoScore({ ...photo({}), mime: "image/jpeg" }, "Federer")!;
    const wide = photoScore({ ...photo({ width: 1600, height: 600 }), mime: "image/jpeg" }, "Federer")!;
    expect(upright).toBeGreaterThan(wide);
    expect(photoScore({ ...photo({ file: "Federer signature.jpg" }), mime: "image/jpeg" }, "Federer")).toBeNull();
    expect(photoScore({ ...photo({ file: "Lógó Roger Federer.jpg" }), mime: "image/jpeg" }, "Federer")).toBeNull();
    expect(photoScore({ ...photo({}), mime: "image/png" }, "Federer")).toBeNull();
  });
});

describe("pickForSeasons", () => {
  const candidates = [
    photo({ file: "a.jpg", year: 2007, score: 1 }),
    photo({ file: "b.jpg", year: 2007, score: 4 }),
    photo({ file: "c.jpg", year: 2012, score: 2 }),
    photo({ file: "d.jpg", year: null, score: 5 }),
  ];

  it("uses the season's best photo, then the nearest year, then an undated one", () => {
    expect(pickForSeasons(candidates, [2007, 2009, 2011, 2020])).toEqual({ 2007: 1, 2009: 1, 2011: 2, 2020: 3 });
  });

  it("returns nothing without candidates", () => {
    expect(pickForSeasons([], [2007])).toEqual({});
  });
});
