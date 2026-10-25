import { describe, expect, it } from "vitest";

import { commonsFileName, commonsThumb, isFreeLicense } from "./commons";

describe("commonsFileName", () => {
  it("reads file pages, titles and image URLs", () => {
    expect(commonsFileName("https://commons.wikimedia.org/wiki/File:Rafael_Nadal_(2008).jpg")).toBe(
      "Rafael Nadal (2008).jpg",
    );
    expect(commonsFileName("https://commons.m.wikimedia.org/wiki/File:Nadal%202008.JPG")).toBe("Nadal 2008.JPG");
    expect(commonsFileName("File:nadal.png")).toBe("Nadal.png");
    expect(commonsFileName("  Nadal fist pump.jpeg ")).toBe("Nadal fist pump.jpeg");
    expect(
      commonsFileName("https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Nadal_2008.jpg/500px-Nadal_2008.jpg"),
    ).toBe("Nadal 2008.jpg");
    expect(commonsFileName("https://upload.wikimedia.org/wikipedia/commons/a/ab/Nadal_2008.jpg")).toBe("Nadal 2008.jpg");
    expect(commonsFileName("https://en.wikipedia.org/wiki/Rafael_Nadal#/media/File:Nadal_2008.jpg")).toBe(
      "Nadal 2008.jpg",
    );
    expect(commonsFileName("https://commons.wikimedia.org/wiki/Category:Rafael_Nadal#/media/File:Nadal_2008.jpg")).toBe(
      "Nadal 2008.jpg",
    );
  });

  it("rejects other sites, other file types and junk", () => {
    expect(commonsFileName("https://example.com/File:Nadal.jpg")).toBeNull();
    expect(commonsFileName("https://en.wikipedia.org/wiki/Rafael_Nadal")).toBeNull();
    expect(commonsFileName("https://upload.wikimedia.org/wikipedia/en/a/ab/Nadal.jpg")).toBeNull();
    expect(commonsFileName("File:Nadal.gif")).toBeNull();
    expect(commonsFileName("File:Nadal.svg")).toBeNull();
    expect(commonsFileName("Nadal")).toBeNull();
    expect(commonsFileName("")).toBeNull();
    expect(commonsFileName("a/b.jpg")).toBeNull();
  });
});

describe("commonsThumb", () => {
  it("keeps Wikimedia thumbnails, without tracking parameters", () => {
    expect(commonsThumb("https://thumb.wikimedia.org/x/500px-a.jpg?utm_source=commons")).toBe(
      "https://thumb.wikimedia.org/x/500px-a.jpg",
    );
    expect(commonsThumb("https://upload.wikimedia.org/x/a.jpg")).toBe("https://upload.wikimedia.org/x/a.jpg");
    expect(commonsThumb("https://evil.example/a.jpg")).toBeNull();
    expect(commonsThumb("http://upload.wikimedia.org/x/a.jpg")).toBeNull();
    expect(commonsThumb(undefined)).toBeNull();
  });
});

describe("isFreeLicense", () => {
  it("accepts free licenses only", () => {
    for (const l of ["CC BY-SA 4.0", "CC BY 2.0", "CC0", "Public domain", "GFDL", "CC-BY-SA-3.0"]) {
      expect(isFreeLicense(l), l).toBe(true);
    }
    for (const l of ["CC BY-NC 2.0", "CC BY-ND 4.0", "", "All rights reserved", "Fair use"]) {
      expect(isFreeLicense(l), l).toBe(false);
    }
  });
});
