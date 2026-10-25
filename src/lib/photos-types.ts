// Player photos from Wikimedia Commons (built by scripts/etl/photos.ts into
// data/photos.json). Dependency-free, shared by the ETL and the app.

export interface Photo {
  /** Commons file name, without "File:". */
  file: string;
  /** Year the photo was taken, when known. */
  year: number | null;
  /** 500px-wide thumbnail on upload.wikimedia.org. */
  thumb: string;
  width: number;
  height: number;
  /** Plain-text author, as Commons credits them. */
  author: string;
  /** e.g. "CC BY-SA 4.0", "Public domain". */
  license: string;
  licenseUrl: string | null;
}

export interface PhotosFile {
  /** When the photos were looked up, YYYY-MM-DD. */
  fetched: string;
  /** Photos by player id: their photos, and which one each season uses (by year). */
  players: Record<string, { photos: Photo[]; seasons: Record<string, number> }>;
  /** When each player was last looked up in full, YYYY-MM-DD (the script resumes from these). */
  checked?: Record<string, string>;
}

/** A season's photo, and whether it was taken that season. */
export interface SeasonPhoto extends Photo {
  sameSeason: boolean;
}

/** The Commons page for a photo (where its full credit and license live). */
export const photoPage = (p: Pick<Photo, "file">) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.file.replaceAll(" ", "_"))}`;
