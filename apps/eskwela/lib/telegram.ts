const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function sendEmergencyAlert(p: {
  school: string;
  building: string;
  room: string;
  teacher: string;
  type: string;
  reference: string;
  time: string;
  date: string;
  dashboardUrl: string;
}) {
  if (!TOKEN || !CHAT_ID) return;

  const lines = [
    `🚨 *SCHOOL EMERGENCY ALERT*`,
    ``,
    `*School:* ${p.school}`,
    `*Location:* Building ${p.building} — Room ${p.room}`,
    `*Teacher:* ${p.teacher}`,
    `*Emergency Type:* ${p.type}`,
    `*Time:* ${p.time}`,
    `*Date:* ${p.date}`,
    ``,
    `*Reference:* ${p.reference}`,
    `*Status:* ACTIVE — Immediate response required`,
    ``,
    `[Open Admin Dashboard](${p.dashboardUrl})`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:    CHAT_ID,
      text:       lines,
      parse_mode: "Markdown",
    }),
  });
}
