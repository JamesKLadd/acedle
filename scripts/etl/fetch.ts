// Downloads only the ATP files the build needs (tour-level matches, rankings,
// players) via a shallow sparse checkout.
//
//   npm run data:fetch

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import { CHECKOUT_DIR, DATA_REPO } from "./paths";

const PATTERNS = [
  "/LICENSE",
  "/README.md",
  "/atp/UPSTREAM_README.md",
  "/atp/matches_data_dictionary.txt",
  "/atp/atp_players.csv",
  "/atp/atp_rankings_*.csv",
  "/atp/atp_matches_[0-9][0-9][0-9][0-9].csv",
];

const git = (...args: string[]) => execFileSync("git", args, { stdio: "inherit" });

if (existsSync(CHECKOUT_DIR)) {
  console.log(`Updating ${CHECKOUT_DIR}`);
  git("-C", CHECKOUT_DIR, "pull", "--ff-only", "--depth", "1");
} else {
  console.log(`Cloning ${DATA_REPO} into ${CHECKOUT_DIR}`);
  git("clone", "--depth", "1", "--filter=blob:none", "--no-checkout", DATA_REPO, CHECKOUT_DIR);
  git("-C", CHECKOUT_DIR, "sparse-checkout", "set", "--no-cone", ...PATTERNS);
  git("-C", CHECKOUT_DIR, "checkout");
}
git("-C", CHECKOUT_DIR, "log", "-1", "--format=Data snapshot: %h (%cs)");
