import { ALERT_COLORS } from "./types";
import { postDiscordEmbed, dispatchBackground } from "./dispatcher";
import { env } from "@/lib/utils/env";

export function notifyNewUserRegistration(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): void {
  const identifier = user.displayName || user.email || user.uid;
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: "🎉 New User Registration!",
        description: `A new user joined Continuum: **${identifier}**`,
        color: ALERT_COLORS.GREEN,
        fields: [
          { name: "Email", value: user.email || "N/A", inline: true },
          { name: "User ID", value: user.uid, inline: true },
          { name: "Environment", value: env.ENVIRONMENT || "production", inline: true },
        ],
        footer: { text: "Continuum Events • User Lifecycle" },
      },
      "admin"
    );
  });
}

export function notifyUserDeletion(user: {
  uid: string;
  email?: string | null;
}): void {
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: "🗑️ User Account Deleted",
        description: `User **${user.email || user.uid}** has permanently deleted their account data.`,
        color: ALERT_COLORS.ORANGE,
        fields: [
          { name: "Email", value: user.email || "N/A", inline: true },
          { name: "User ID", value: user.uid, inline: true },
          { name: "Environment", value: env.ENVIRONMENT || "production", inline: true },
        ],
        footer: { text: "Continuum Events • User Lifecycle" },
      },
      "admin"
    );
  });
}

export function notifyProClaimSubmitted(claim: {
  uid: string;
  email?: string | null;
  platform: string;
  handle: string;
  note?: string;
}): void {
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: "🔔 New Pro Request",
        description: `User \`${claim.email || claim.uid}\` requested Pro status via **${claim.platform.toUpperCase()}** (Handle: \`${claim.handle}\`).\nCheck the Admin Panel to approve or deny.`,
        color: ALERT_COLORS.GOLD,
        fields: [
          { name: "Platform", value: claim.platform, inline: true },
          { name: "Handle", value: claim.handle, inline: true },
          { name: "User", value: claim.email || claim.uid, inline: true },
          ...(claim.note ? [{ name: "Note", value: claim.note }] : []),
        ],
        footer: { text: "Continuum Dashboard • Admin Audit" },
      },
      "admin"
    );
  });
}

export function notifyProClaimDecision(decision: {
  uid: string;
  email?: string | null;
  action: "approve" | "deny";
  adminEmail?: string | null;
}): void {
  const isApproved = decision.action === "approve";
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: `🛡️ Pro Request ${isApproved ? "Approved" : "Denied"}`,
        description: `Admin **${isApproved ? "APPROVED" : "DENIED"}** Pro claim for user: \`${decision.email || decision.uid}\``,
        color: isApproved ? ALERT_COLORS.GREEN : ALERT_COLORS.RED,
        fields: [
          { name: "Status", value: isApproved ? "Approved" : "Denied", inline: true },
          { name: "User", value: decision.email || decision.uid, inline: true },
          { name: "Reviewed By", value: decision.adminEmail || env.ADMIN_EMAIL, inline: true },
        ],
        footer: { text: "Continuum Dashboard • Admin Audit" },
      },
      "admin"
    );
  });
}

export function notifyAdminAnnouncement(announcement: {
  subject: string;
  total: number;
  successCount: number;
  failedCount: number;
}): void {
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: "📢 Announcement Broadcast",
        description: `Admin broadcasted an announcement: **${announcement.subject}**\nDelivered to ${announcement.successCount} users (${announcement.failedCount} failed).`,
        color: ALERT_COLORS.PURPLE,
        fields: [
          { name: "Subject", value: announcement.subject, inline: true },
          { name: "Success", value: `${announcement.successCount} / ${announcement.total}`, inline: true },
          { name: "Failed", value: String(announcement.failedCount), inline: true },
        ],
        footer: { text: "Continuum Dashboard • Admin Audit" },
      },
      "admin"
    );
  });
}

export function notifyAdminCacheFlush(adminEmail?: string | null): void {
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: "🧹 Global Redis Cache Flushed",
        description: "Admin flushed the global Redis cache.",
        color: ALERT_COLORS.BLUE,
        fields: [
          { name: "Triggered By", value: adminEmail || env.ADMIN_EMAIL, inline: true },
          { name: "Environment", value: env.ENVIRONMENT || "production", inline: true },
        ],
        footer: { text: "Continuum Dashboard • Admin Audit" },
      },
      "admin"
    );
  });
}

export function notifyAdminCronTrigger(trigger: {
  task: string;
  adminEmail?: string | null;
}): void {
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: `⏱️ Manual Cron Triggered: ${trigger.task}`,
        description: `Admin manually triggered cron task: **${trigger.task}**`,
        color: ALERT_COLORS.BLUE,
        fields: [
          { name: "Task", value: trigger.task, inline: true },
          { name: "Triggered By", value: trigger.adminEmail || env.ADMIN_EMAIL, inline: true },
        ],
        footer: { text: "Continuum Dashboard • Admin Audit" },
      },
      "admin"
    );
  });
}

export function notifyAdminCustomAlert(message: string, adminEmail?: string | null): void {
  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: "📢 System Notification",
        description: message,
        color: ALERT_COLORS.BLUE,
        fields: [
          { name: "Dispatched By", value: adminEmail || env.ADMIN_EMAIL, inline: true },
        ],
        footer: { text: "Continuum Dashboard • Manual Trigger" },
      },
      "admin"
    );
  });
}
