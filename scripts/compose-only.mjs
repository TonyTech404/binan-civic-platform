/**
 * Re-run just the ffmpeg composition step (videos already recorded).
 * Expects: demo-output/citizen.webm, admin.webm, followup.webm
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT  = path.join(ROOT, "demo-output");

const citizenPath   = path.join(OUT, "citizen.webm");
const adminPath     = path.join(OUT, "admin.webm");
const followupPath  = path.join(OUT, "followup.webm");
const citizenFramed = path.join(OUT, "c_framed.mp4");
const adminScaled   = path.join(OUT, "a_scaled.mp4");
const followupFramed = path.join(OUT, "f_framed.mp4");
const finalPath     = path.join(ROOT, "bantay-binan-demo.mp4");

function run(cmd) {
  console.log(`\n$ ffmpeg ${cmd.slice(0, 90)}…`);
  execSync(`ffmpeg -y ${cmd}`, { stdio: "inherit" });
}

function getDuration(file) {
  return parseFloat(
    execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`).toString().trim()
  );
}

// 1. Phone-framed citizen clip
console.log("Framing citizen clip (phone on dark canvas)…");
const citizenFilter = [
  "[0:v]scale=295:640[mob]",
  "[mob]pad=1280:720:492:40:color=0x090e1a[padded]",
  "[padded]drawbox=x=486:y=34:w=307:h=6:color=0x4b5563:t=fill[b1]",
  "[b1]drawbox=x=486:y=680:w=307:h=6:color=0x4b5563:t=fill[b2]",
  "[b2]drawbox=x=486:y=34:w=6:h=652:color=0x4b5563:t=fill[b3]",
  "[b3]drawbox=x=787:y=34:w=6:h=652:color=0x4b5563:t=fill[b4]",
  "[b4]drawbox=x=558:y=34:w=162:h=14:color=0x374151:t=fill[notch]",
  "[notch]drawbox=x=560:y=681:w=158:h=4:color=0x6b7280:t=fill[hbar]",
  "[hbar]setsar=1[out]",
].join(";");
run(`-i "${citizenPath}" -filter_complex "${citizenFilter}" -map "[out]" -pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 "${citizenFramed}"`);

// 2. Admin clip scaled to 1280x720
console.log("Scaling admin clip…");
const adminFilter = [
  "scale=1280:720:force_original_aspect_ratio=decrease",
  "pad=1280:720:(1280-iw)/2:(720-ih)/2:color=0x090e1a",
  "drawbox=x=0:y=0:w=1280:h=4:color=0x991B1B:t=fill",
].join(",");
run(`-i "${adminPath}" -vf "${adminFilter}" -pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 "${adminScaled}"`);

// 3. Phone-framed followup clip
console.log("Framing followup clip (phone on dark canvas)…");
run(`-i "${followupPath}" -filter_complex "${citizenFilter}" -map "[out]" -pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 "${followupFramed}"`);

// 4. Concatenate 3 clips with cross-fade
console.log("Concatenating 3 clips with fades…");
const durC = getDuration(citizenFramed);
const durA = getDuration(adminScaled);

const concatFilter = [
  `[0:v]setsar=1,fps=25,fade=t=out:st=${(durC - 0.8).toFixed(2)}:d=0.8[c0]`,
  `[1:v]setsar=1,fps=25,fade=t=in:st=0:d=0.8,fade=t=out:st=${(durA - 0.8).toFixed(2)}:d=0.8[c1]`,
  `[2:v]setsar=1,fps=25,fade=t=in:st=0:d=0.8[c2]`,
  `[c0][c1][c2]concat=n=3:v=1[out]`,
].join(";");

run([
  `-i "${citizenFramed}" -i "${adminScaled}" -i "${followupFramed}"`,
  `-filter_complex "${concatFilter}"`,
  `-map "[out]"`,
  `-pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 -movflags +faststart`,
  `"${finalPath}"`,
].join(" "));

console.log(`\nFinal video: ${finalPath}`);
execSync(`open "${finalPath}"`);
