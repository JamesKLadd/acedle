import { describe, expect, it } from "vitest";

import { fold, photoScore, photoTraits, pickForSeasons, plainText, yearIn, type Candidate } from "./photo-pick";

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
  onCourt: false,
  offCourt: false,
  cool: false,
  crowded: false,
  named: true,
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
  it("prefers upright photos and skips non-photos", () => {
    const upright = photoScore({ ...photo({}), mime: "image/jpeg" })!;
    const wide = photoScore({ ...photo({ width: 1600, height: 600 }), mime: "image/jpeg" })!;
    expect(upright).toBeGreaterThan(wide);
    expect(photoScore({ ...photo({ file: "Federer signature.jpg" }), mime: "image/jpeg" })).toBeNull();
    expect(photoScore({ ...photo({ file: "Lógó Roger Federer.jpg" }), mime: "image/jpeg" })).toBeNull();
    expect(photoScore({ ...photo({}), mime: "image/png" })).toBeLessThan(upright);
    expect(photoScore({ ...photo({}), mime: "image/gif" })).toBeNull();
  });
});

describe("photoTraits", () => {
  it("tells court photos, awards nights and celebrations apart", () => {
    expect(photoTraits("Nadal.jpg", "Rafael Nadal at the 2008 Wimbledon Championships")).toMatchObject({ onCourt: true });
    expect(photoTraits("Nadal Laureus World Sports Awards 2024.jpg")).toMatchObject({ onCourt: false, offCourt: true });
    expect(photoTraits("Nadal fist pump Roland Garros.jpg")).toMatchObject({ onCourt: true, cool: true, crowded: false });
    expect(photoTraits("Djokovic celebrating his win.jpg")).toMatchObject({ cool: true });
    expect(photoTraits("Nadal vs Federer RG 2007.jpg")).toMatchObject({ crowded: true });
    expect(photoTraits("Nole Skupstina BG feb08.jpg")).toMatchObject({ offCourt: true });
    expect(photoTraits("C'est mon gosse, romance. Paroles de Henri Leconte.jpg")).toMatchObject({ offCourt: true });
    expect(photoTraits("Karel Novacek-RG1994.jpg", "", "Cherkasov")).toMatchObject({ named: false });
    expect(photoTraits("AndreiCherkasov-RG1994.jpg", "", "Cherkasov")).toMatchObject({ named: true });
  });
});

describe("pickForSeasons", () => {
  it("puts on-court photos first, then the closest year, then the coolest", () => {
    const candidates = [
      photo({ file: "gala.jpg", year: 2008, offCourt: true }),
      photo({ file: "court-2006.jpg", year: 2006, onCourt: true }),
      photo({ file: "court-2008.jpg", year: 2008, onCourt: true }),
      photo({ file: "court-2008-vamos.jpg", year: 2008, onCourt: true, cool: true }),
      photo({ file: "court-2015.jpg", year: 2015, onCourt: true }),
    ];
    const picks = pickForSeasons(candidates, [2008, 2006, 2014]);
    expect(candidates[picks[2008]].file).toBe("court-2008-vamos.jpg");
    expect(candidates[picks[2006]].file).toBe("court-2006.jpg");
    expect(candidates[picks[2014]].file).toBe("court-2015.jpg");
  });

  it("still uses an off-court photo when it's all there is", () => {
    expect(pickForSeasons([photo({ offCourt: true })], [2007])).toEqual({ 2007: 0 });
    expect(pickForSeasons([], [2007])).toEqual({});
  });
});
