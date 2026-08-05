export async function sendDiscordEmbed(title: string, message: string, color: number, footer: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload: any = {
    username: "Continuum Alerts",
    embeds: [
      {
        title,
        description: message,
        color,
        timestamp: new Date().toISOString(),
        footer: { text: footer }
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Failed to send Discord alert:", e);
  }
}
