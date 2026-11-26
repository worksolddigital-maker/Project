// Turns dist-demo/index.html (a full document) into dist-demo/artifact.html:
// the same page as a body fragment (title, styles, markup, scripts), the shape
// the Claude Artifact publisher wraps in its own document skeleton.
import { readFileSync, writeFileSync } from "node:fs";

// Literal U+FFFD (used by decoders to detect bad bytes) is written as the
// equivalent JS escape, so the file never contains a "replacement character".
const raw = readFileSync("dist-demo/index.html", "utf8");
const scriptStart = raw.indexOf("<script");
const html = raw.slice(0, scriptStart) + raw.slice(scriptStart).replaceAll("\uFFFD", "\\uFFFD");
if (html.slice(0, scriptStart).includes("\uFFFD")) throw new Error("U+FFFD outside scripts");
writeFileSync("dist-demo/index.html", html);
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g);
const links = pick(/<link\b[^>]*>/g);
const styles = pick(/<style\b[^>]*>[\s\S]*?<\/style>/g);
const scripts = pick(/<script\b[^>]*>[\s\S]*?<\/script>/g);
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").trim();
const fragment = [...title, ...links, ...styles, body, ...scripts].join("\n");
writeFileSync("dist-demo/artifact.html", fragment);
console.log(`artifact.html: ${(fragment.length / 1024 / 1024).toFixed(2)} MB`);
