export const THEME_KEY = "acedle:theme";

/**
 * Runs in <head> before the page paints, so the stored theme never flashes.
 * Keep it tiny and dependency-free.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;
