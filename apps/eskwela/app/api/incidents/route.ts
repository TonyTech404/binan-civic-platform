import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendEmergencyAlert } from "@/lib/telegram";

const SCHOOL = {
  name:    "Biñan National High School",
  building: "B",
  room:    "204",
  teacher: "Mrs. Santos",
  type:    "Security Threat",
  barangay: "Poblacion" as const,
  lat:     14.3392,
  lng:     121.0850,
};

export async function POST(req: NextRequest) {
  const db = createServerClient();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    timeZone: "Asia/Manila",
  });
  const dateStr = now.toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Manila",
  });

  const description =
    `SCHOOL EMERGENCY — ${SCHOOL.name}\n` +
    `Location: Building ${SCHOOL.building}, Room ${SCHOOL.room}\n` +
    `Teacher: ${SCHOOL.teacher}\n` +
    `Emergency Type: ${SCHOOL.type}\n` +
    `Time: ${timeStr} · ${dateStr}`;

  // Write directly to Bantay Biñan's reports table (service role bypasses RLS + schema)
  const { data: report, error } = await db
    .from("reports")
    .insert({
      category:    "school_emergency",
      description,
      barangay:    SCHOOL.barangay,
      latitude:    SCHOOL.lat,
      longitude:   SCHOOL.lng,
      address:     `${SCHOOL.name} — Building ${SCHOOL.building}, Room ${SCHOOL.room}`,
      department_slug: "drrmo",
    })
    .select("id, reference_number, status, created_at")
    .single();

  if (error || !report) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Could not create report." }, { status: 500 });
  }

  // Send Telegram notification (non-blocking)
  const host  = req.headers.get("host") ?? "localhost:3001";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const adminUrl = `https://bantay-binan.buildwithanthony.com/admin`;

  sendEmergencyAlert({
    school:       SCHOOL.name,
    building:     SCHOOL.building,
    room:         SCHOOL.room,
    teacher:      SCHOOL.teacher,
    type:         SCHOOL.type,
    reference:    report.reference_number,
    time:         timeStr,
    date:         dateStr,
    dashboardUrl: adminUrl,
  }).catch(console.error);

  return NextResponse.json(report, { status: 201 });
}
