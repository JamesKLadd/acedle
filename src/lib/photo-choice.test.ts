import { describe, expect, it } from "vitest";

import { pickSeasonPhoto } from "./photo-choice";
import type { Photo, SeasonPhoto } from "./photos-types";

const photo = (file: string, year: number | null): Photo => ({
  file,
  year,
  thumb: `https://upload.wikimedia.org/${file}`,
  width: 400,
  height: 500,
  author: "A",
  license: "CC BY 4.0",
  licenseUrl: null,
});
const lookedUp = (file: string, year: number | null, season: number): SeasonPhoto => ({
  ...photo(file, year),
  sameSeason: year === season,
});

describe("pickSeasonPhoto", () => {
  it("prefers a suggestion approved for the season", () => {
    const got = pickSeasonPhoto(2008, lookedUp("a.jpg", 2008, 2008), [{ year: 2008, photo: photo("s.jpg", null) }]);
    expect(got?.file).toBe("s.jpg");
    expect(got?.sameSeason).toBe(false);
  });

  it("keeps a looked-up photo from the season over other suggestions", () => {
    const got = pickSeasonPhoto(2008, lookedUp("a.jpg", 2008, 2008), [
      { year: null, photo: photo("s.jpg", 2008) },
      { year: 2009, photo: photo("t.jpg", 2008) },
    ]);
    expect(got?.file).toBe("a.jpg");
  });

  it("otherwise takes the photo closest to the season, suggestions winning ties", () => {
    const far = lookedUp("a.jpg", 2001, 2008);
    expect(pickSeasonPhoto(2008, far, [{ year: null, photo: photo("s.jpg", 2007) }])?.file).toBe("s.jpg");
    expect(pickSeasonPhoto(2008, far, [{ year: 2015, photo: photo("t.jpg", 2015) }])?.file).toBe("t.jpg");
    expect(pickSeasonPhoto(2008, far, [{ year: 2015, photo: photo("t.jpg", 2016) }])?.file).toBe("a.jpg");
  });

  it("marks a suggestion from the season as same-season", () => {
    const got = pickSeasonPhoto(2008, null, [{ year: null, photo: photo("s.jpg", 2008) }]);
    expect(got).toMatchObject({ file: "s.jpg", sameSeason: true });
  });

  it("falls back to the looked-up photo, then nothing", () => {
    expect(pickSeasonPhoto(2008, lookedUp("a.jpg", null, 2008), [])?.file).toBe("a.jpg");
    expect(pickSeasonPhoto(2008, null, [])).toBeNull();
  });
});
