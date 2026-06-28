/**
 * Bantay Biñan — Demo Video Generator
 * Run: node scripts/demo.mjs
 *
 * Records three clips:
 *   1. citizen.webm  — mobile, files a report, gets reference number
 *   2. admin.webm    — desktop, finds that report, resolves it
 *   3. followup.webm — mobile, tracks the same report, sees "Resolved"
 *
 * Then composes: citizen → fade → admin → fade → followup → final.mp4
 */

import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.resolve(__dirname, "..");
const OUT   = path.join(ROOT, "demo-output");
const PHOTO = path.join(ROOT, "apps/web/20190817-nabaling-poste-1.jpg");

const BASE        = "https://bantay-binan.buildwithanthony.com";
const ADMIN_EMAIL = "admin@bantaybinan.gov.ph";
const ADMIN_PASS  = "BantayBinan@2026!";
const BINAN_GEO   = { latitude: 14.3323, longitude: 121.0793, accuracy: 10 };

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────

/** Floating caption label (no emojis) */
async function label(page, text, ms = 2200) {
  await page.evaluate((txt) => {
    document.getElementById("__bb__")?.remove();
    const el = document.createElement("div");
    el.id = "__bb__";
    el.textContent = txt;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "28px",
      left: "50%",
      transform: "translateX(-50%) translateY(8px)",
      background: "rgba(10,14,26,0.92)",
      color: "#fff",
      padding: "9px 20px",
      borderRadius: "30px",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      zIndex: "99999",
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)",
      opacity: "0",
      transition: "opacity 0.22s ease, transform 0.22s ease",
      letterSpacing: "0.01em",
      maxWidth: "88vw",
      textAlign: "center",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(0)";
    });
  }, text);
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    const el = document.getElementById("__bb__");
    if (el) {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(8px)";
      setTimeout(() => el.remove(), 250);
    }
  });
  await page.waitForTimeout(260);
}

/** Full-screen title card overlaid on the page */
async function sectionCard(page, eyebrow, title, color = "#991B1B", ms = 2800) {
  await page.evaluate(({ eyebrow, title, color }) => {
    document.getElementById("__card__")?.remove();
    const el = document.createElement("div");
    el.id = "__card__";
    Object.assign(el.style, {
      position: "fixed", inset: "0", background: "#090e1a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: "999999", opacity: "0", transition: "opacity 0.35s ease",
      gap: "12px",
    });
    el.innerHTML = `
      <div style="font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;
        color:${color};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${eyebrow}</div>
      <div style="font-size:32px;font-weight:800;color:#fff;font-family:Georgia,serif;
        letter-spacing:-0.02em;text-align:center;line-height:1.15;">${title}</div>
      <div style="width:40px;height:2px;background:${color};margin-top:6px;border-radius:2px;"></div>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = "1"));
  }, { eyebrow, title, color });
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    const el = document.getElementById("__card__");
    if (el) { el.style.opacity = "0"; setTimeout(() => el.remove(), 350); }
  });
  await page.waitForTimeout(400);
}

/** Native browser smooth scroll — no stutter */
async function scroll(page, distance) {
  await page.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), distance);
  await page.waitForTimeout(Math.min(900, Math.abs(distance) * 1.2));
}

async function scrollTo(page, y) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y);
  await page.waitForTimeout(800);
}

function saveVideo(video, name) {
  return new Promise((res) => setTimeout(async () => {
    const tmp = await video.path();
    const out = path.join(OUT, name);
    fs.renameSync(tmp, out);
    console.log(`   Saved: ${out}`);
    res(out);
  }, 200));
}

// ── Citizen Flow ──────────────────────────────────────────────

async function recordCitizen() {
  console.log("\n Recording citizen flow (mobile)…");
  const browser = await chromium.launch({ headless: false, slowMo: 20 });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: BINAN_GEO,
    permissions: ["geolocation"],
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
    locale: "en-PH",
    timezoneId: "Asia/Manila",
  });
  const page = await context.newPage();

  // Title card
  await page.goto(`${BASE}`, { waitUntil: "domcontentloaded" });
  await sectionCard(page, "Bantay Binan", "Community Issue Reporting", "#991B1B", 3000);

  // Home
  await page.goto(`${BASE}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await label(page, "The home page — built for every Binan resident", 2500);

  await scroll(page, 280);
  await label(page, "Live stats count up as you scroll", 2200);

  await scroll(page, 280);
  await label(page, "Three simple steps to report any issue", 2000);

  await scroll(page, 300);
  await label(page, "Eight categories — tap any to start a report", 1800);

  await scrollTo(page, 0);

  // Report page
  await sectionCard(page, "Step 1", "Filing a Report", "#991B1B", 2200);
  await page.goto(`${BASE}/report`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await label(page, "No account needed — takes under a minute", 2000);

  // Category
  await page.getByText("Streetlight Issues").click();
  await page.waitForTimeout(500);
  await label(page, "Category: Streetlight Issues", 1800);

  // Description
  await page.locator("textarea#desc").click();
  await page.waitForTimeout(300);
  await page.locator("textarea#desc").type(
    "Nabaling poste sa kanto ng Rizal Avenue at JP Rizal St, Poblacion. Peligro sa mga tao at sasakyan.",
    { delay: 22 }
  );
  await page.waitForTimeout(500);
  await label(page, "Describing the issue in detail", 1800);

  // Photo
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("button", { hasText: "Take or upload a photo" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(PHOTO);
  await page.waitForTimeout(1000);
  await label(page, "Photo evidence attached — nabaling poste", 2200);

  // Location via GPS mock
  await page.waitForTimeout(600);
  await label(page, "GPS location auto-detected", 1800);

  // Barangay + landmark
  await page.locator("select#brgy").selectOption("Poblacion");
  await page.locator("input#addr").type("Tapat ng Simbahan ng Poblacion", { delay: 30 });
  await page.waitForTimeout(500);
  await label(page, "Barangay and landmark added", 1800);

  // Submit
  await scroll(page, 400);
  await page.waitForTimeout(600);
  await page.click("button[type='submit']");
  await label(page, "Submitting report to City Hall…", 3500);

  try {
    await page.waitForSelector("text=Report submitted", { timeout: 20000 });
  } catch {
    console.warn("   Success screen not confirmed — continuing");
  }
  await page.waitForTimeout(800);

  // Grab reference number
  let refNum = "BB-2026-000001";
  try { refNum = (await page.locator("code").first().textContent()) ?? refNum; } catch {}
  await label(page, `Report submitted — Reference: ${refNum}`, 3000);

  // Track link
  await sectionCard(page, "Step 2", "Tracking Your Report", "#1A7530", 2000);
  try {
    await page.getByRole("link", { name: "Track this report" }).click();
  } catch {
    await page.goto(`${BASE}/track/${refNum}`, { waitUntil: "networkidle" });
  }
  await page.waitForTimeout(1800);
  await label(page, `Reference ${refNum} — status: Open`, 2800);

  // Emergency
  await sectionCard(page, "Emergency", "Hotline Directory", "#991B1B", 2000);
  await page.goto(`${BASE}/emergency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await label(page, "One tap to call any emergency line", 2200);
  await scroll(page, 160);
  await label(page, "All Binan emergency contacts in one place", 2000);
  await page.waitForTimeout(600);

  const vid = await page.video();
  await context.close();
  await browser.close();
  const citizenPath = await saveVideo(vid, "citizen.webm");
  return { citizenPath, refNum };
}

// ── Admin Flow ────────────────────────────────────────────────

async function recordAdmin(refNum) {
  console.log("\n Recording admin flow (desktop)…");
  const browser = await chromium.launch({ headless: false, slowMo: 25 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
    locale: "en-PH",
    timezoneId: "Asia/Manila",
  });
  const page = await context.newPage();

  // Title card
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await sectionCard(page, "City Hall Staff", "Admin Portal", "#991B1B", 2800);

  // Login
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await label(page, "Staff-only portal — authorized personnel only", 2400);
  await page.locator("input#email").fill(ADMIN_EMAIL);
  await page.waitForTimeout(400);
  await page.locator("input#pw").fill(ADMIN_PASS);
  await page.waitForTimeout(400);
  await label(page, "Signing in as City Hall administrator", 1200);
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await label(page, "Dashboard — all community reports, live", 2800);

  // Stats tour
  await page.waitForTimeout(1000);
  await label(page, "Status cards: open, assigned, in progress, resolved", 2600);

  // Search for the submitted report by reference number
  await page.waitForTimeout(800);
  const searchBox = page.locator("input[placeholder*='Search']");
  await searchBox.fill(refNum);
  await page.waitForTimeout(1200);
  await label(page, `Searching for report ${refNum}`, 1800);

  // Click the first matching report link
  const reportLink = page.locator("table tbody tr").first().locator("a").first();
  await reportLink.hover();
  await page.waitForTimeout(500);
  await label(page, "Opening the report to review details", 1400);
  await reportLink.click();

  await page.waitForURL("**/admin/reports/**", { timeout: 12000 });
  await page.waitForTimeout(2000);
  await label(page, "Full report — description, photo, GPS location, history", 2800);

  // Scroll to show photo/map
  await scroll(page, 250);
  await page.waitForTimeout(1000);
  await label(page, "Submitted photo and exact map location", 2200);

  // Scroll back to manage panel (sticky on right side at lg viewport)
  await scrollTo(page, 0);
  await page.waitForTimeout(800);
  await label(page, "Manage panel — assign department and update status", 2400);

  // Status select is first <select>, Department is second on this page
  const statusSelect = page.locator("select").first();
  await statusSelect.selectOption("resolved");
  await page.waitForTimeout(600);
  await label(page, "Marking report as Resolved", 1800);

  // Assign department
  const deptSelect = page.locator("select").nth(1);
  await deptSelect.selectOption("engineering");
  await page.waitForTimeout(500);
  await label(page, "Assigned to Engineering Office", 1800);

  // Add resolution note
  const noteField = page.locator("textarea[placeholder*='update']");
  await noteField.click();
  await noteField.type(
    "Naiayos na ng Engineering Office. Pumalit na ang bagong poste.",
    { delay: 25 }
  );
  await page.waitForTimeout(600);
  await label(page, "Resolution note added to the activity log", 2000);

  // Save
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.waitForTimeout(2400);
  await label(page, "Saved — citizen will now see their report is resolved", 2800);

  await page.waitForTimeout(600);

  const vid = await page.video();
  await context.close();
  await browser.close();
  const adminPath = await saveVideo(vid, "admin.webm");
  return adminPath;
}

// ── Citizen Follow-up ─────────────────────────────────────────

async function recordFollowup(refNum) {
  console.log("\n Recording citizen follow-up (mobile)…");
  const browser = await chromium.launch({ headless: false, slowMo: 20 });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: BINAN_GEO,
    permissions: ["geolocation"],
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
    locale: "en-PH",
    timezoneId: "Asia/Manila",
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/track/${refNum}`, { waitUntil: "domcontentloaded" });
  await sectionCard(page, "Later That Day", "Checking the Status", "#1A7530", 2500);

  await page.goto(`${BASE}/track/${refNum}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await label(page, `Tracking report ${refNum}`, 2000);
  await page.waitForTimeout(800);
  await label(page, "Status updated: Resolved — issue has been fixed", 3000);
  await scroll(page, 200);
  await page.waitForTimeout(1000);
  await label(page, "Resolution photo and note from Engineering Office", 2500);
  await page.waitForTimeout(800);

  // Outro
  await sectionCard(page, "City Government of Binan, Laguna", "Issues Reported.\nIssues Fixed.", "#D4A800", 4000);

  const vid = await page.video();
  await context.close();
  await browser.close();
  const followupPath = await saveVideo(vid, "followup.webm");
  return followupPath;
}

// ── ffmpeg composition ─────────────────────────────────────────

function run(cmd) {
  console.log(`   $ ffmpeg ${cmd.slice(0, 70)}…`);
  execSync(`ffmpeg -y ${cmd}`, { stdio: "inherit" });
}

function getDuration(file) {
  return parseFloat(
    execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`).toString().trim()
  );
}

function frameClip(inputPath, outputPath, mode = "phone") {
  let filter;
  if (mode === "phone") {
    // 390×844 → scale to 295×640, pad to 1280×720 at center, draw phone bezel
    filter = [
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
    run(`-i "${inputPath}" -filter_complex "${filter}" -map "[out]" -pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 "${outputPath}"`);
  } else {
    // 1440×900 → scale to 1280×720 with thin red top accent bar
    filter = [
      "scale=1280:720:force_original_aspect_ratio=decrease",
      "pad=1280:720:(1280-iw)/2:(720-ih)/2:color=0x090e1a",
      "drawbox=x=0:y=0:w=1280:h=4:color=0x991B1B:t=fill",
    ].join(",");
    run(`-i "${inputPath}" -vf "${filter}" -pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 "${outputPath}"`);
  }
}

function compose(citizenPath, adminPath, followupPath) {
  console.log("\n Composing final video…");

  const citizenFramed  = path.join(OUT, "c_framed.mp4");
  const adminScaled    = path.join(OUT, "a_scaled.mp4");
  const followupFramed = path.join(OUT, "f_framed.mp4");
  const finalPath      = path.join(ROOT, "bantay-binan-demo.mp4");

  console.log("   Framing citizen clip…");
  frameClip(citizenPath, citizenFramed, "phone");

  console.log("   Scaling admin clip…");
  frameClip(adminPath, adminScaled, "desktop");

  console.log("   Framing followup clip…");
  frameClip(followupPath, followupFramed, "phone");

  // Fade transition concat (normalize fps+sar, fade between each pair)
  console.log("   Concatenating 3 clips with fades…");
  const durC = getDuration(citizenFramed);
  const durA = getDuration(adminScaled);

  const filter = [
    `[0:v]setsar=1,fps=25,fade=t=out:st=${(durC - 0.8).toFixed(2)}:d=0.8[c0]`,
    `[1:v]setsar=1,fps=25,fade=t=in:st=0:d=0.8,fade=t=out:st=${(durA - 0.8).toFixed(2)}:d=0.8[c1]`,
    `[2:v]setsar=1,fps=25,fade=t=in:st=0:d=0.8[c2]`,
    `[c0][c1][c2]concat=n=3:v=1[out]`,
  ].join(";");

  run([
    `-i "${citizenFramed}" -i "${adminScaled}" -i "${followupFramed}"`,
    `-filter_complex "${filter}"`,
    `-map "[out]"`,
    `-pix_fmt yuv420p -c:v libx264 -preset fast -crf 17 -movflags +faststart`,
    `"${finalPath}"`,
  ].join(" "));

  console.log(`\n Final video: ${finalPath}`);
  return finalPath;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("Bantay Binan — Demo Video Generator");
  console.log(`Site: ${BASE}`);
  console.log(`Output: ${OUT}\n`);

  const { citizenPath, refNum } = await recordCitizen();
  console.log(`   Reference number: ${refNum}`);

  const adminPath    = await recordAdmin(refNum);
  const followupPath = await recordFollowup(refNum);

  const finalPath = compose(citizenPath, adminPath, followupPath);

  console.log("\n Done!");
  console.log(`   Open with: open "${finalPath}"`);
  execSync(`open "${finalPath}"`);
}

main().catch((err) => { console.error("Error:", err); process.exit(1); });
