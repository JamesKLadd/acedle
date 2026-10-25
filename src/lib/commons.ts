// Looking up a Wikimedia Commons file someone suggested as a card photo.

import { plainText, yearIn, type Photo } from "./photos-types";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "Acedle/1.0 (non-commercial fan game; https://acedle.vercel.app)";
const THUMB_WIDTH = 500;

/**
 * The file name in a Commons link or title: "File:Roger Federer (26).jpg",
 * a commons.wikimedia.org/wiki/File:… page (desktop or mobile), or an
 * upload.wikimedia.org image URL. Null when it isn't one.
 */
export function commonsFileName(input: string): string | null {
  let text = input.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (host === "upload.wikimedia.org") {
      // …/commons/a/ab/Name.jpg, or …/commons/thumb/a/ab/Name.jpg/500px-Name.jpg
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[1] !== "commons") return null;
      text = parts[2] === "thumb" ? parts[5] ?? "" : parts[4] ?? "";
    } else if (host === "commons.wikimedia.org" || host === "commons.m.wikimedia.org") {
      // /wiki/File:Name.jpg, or /w/index.php?title=File:Name.jpg; a media viewer link puts it after "#/media/".
      const media = url.hash.match(/#\/media\/(File:.+)$/i)?.[1];
      text = media ?? url.searchParams.get("title") ?? url.pathname.replace(/^\/wiki\//, "");
    } else if (/(^|\.)wikipedia\.org$/.test(host) && /#\/media\/File:/i.test(url.hash)) {
      // A Wikipedia article's media viewer; the lookup checks the file is on Commons.
      text = url.hash.replace(/^#\/media\//, "");
    } else {
      return null;
    }
    try {
      text = decodeURIComponent(text);
    } catch {
      return null;
    }
  }
  const name = text.replace(/^(file|image):/i, "").replaceAll("_", " ").trim();
  if (!/\.(jpe?g|png)$/i.test(name) || name.length > 240 || /[#<>[\]|{}/]/.test(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A Wikimedia thumbnail URL without its tracking parameters, or null if it's from anywhere else. */
export function commonsThumb(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !/^(upload|thumb)\.wikimedia\.org$/.test(u.hostname)) return null;
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

/** Licenses that allow any use with credit (Commons hosts nothing else, but check anyway). */
export function isFreeLicense(license: string): boolean {
  if (/\b(NC|ND)\b|non-?commercial|no ?deriv/i.test(license)) return false;
  return /^(cc0|cc[ -]by(-sa)?\b|public domain|pd\b|gfdl|attribution|free art|fal\b)/i.test(license.trim());
}

export type CommonsLookup =
  | { ok: true; photo: Photo }
  | { ok: false; error: string };

/** A Commons file as a card photo, or why it can't be one. */
export async function lookupCommonsFile(file: string): Promise<CommonsLookup> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: `File:${file}`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: "DateTimeOriginal|Artist|Credit|LicenseShortName|LicenseUrl",
  });
  let body;
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Commons answered ${res.status}`);
    body = await res.json();
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't reach Wikimedia Commons. Please try again in a minute." };
  }

  const page = body?.query?.pages?.[0];
  const ii = page?.imageinfo?.[0];
  if (!page || page.missing || !ii) return { ok: false, error: "That file isn't on Wikimedia Commons." };
  if (ii.mime !== "image/jpeg" && ii.mime !== "image/png") return { ok: false, error: "Only JPEG and PNG photos work." };
  const thumb = commonsThumb(ii.thumburl);
  if (!thumb) return { ok: false, error: "Commons has no preview of that file." };
  if (ii.width < 300 || ii.height < 300) return { ok: false, error: "That photo is too small for a card." };

  const meta = ii.extmetadata ?? {};
  const license = plainText(meta.LicenseShortName?.value ?? "");
  if (!isFreeLicense(license)) {
    return { ok: false, error: `Its license (${license || "unknown"}) isn't one we can use.` };
  }
  return {
    ok: true,
    photo: {
      file: String(page.title).replace(/^File:/, ""),
      year: yearIn(plainText(meta.DateTimeOriginal?.value ?? "")) ?? yearIn(String(page.title)),
      thumb,
      width: ii.width,
      height: ii.height,
      author: plainText(meta.Artist?.value ?? meta.Credit?.value ?? "") || "Unknown",
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
    },
  };
}
