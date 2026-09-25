import { NextResponse } from 'next/server';
import { enableChatAssistant, enableGPTMigration, enabeGPTMigration } from '@/app/flags';

export async function GET() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    const envChat =
      process.env.ENABLE_CHAT_ASSISTANT ||
      process.env.enableChatAssistant ||
      process.env.ENABLE_GEMINI_CHAT_ASSITANT ||
      process.env.enableGeminiChatAssitant;
    const envMigration =
      process.env.ENABLE_GPT_MIGRATION ||
      process.env.enableGPTMigration ||
      process.env.enabeGPTMigration ||
      process.env.ENABE_GPT_MIGRATION;

    const chatValue = envChat !== undefined ? envChat === 'true' : true;
    const migrationValue = envMigration !== undefined ? envMigration === 'true' : false;

    return NextResponse.json({
      enableInvestmentPortfolios: true,
      enableChatAssistant: chatValue,
      enableGeminiChatAssitant: chatValue,
      enableGPTMigration: migrationValue,
      enabeGPTMigration: migrationValue,
    });
  }

  try {
    const [isChatEnabled, migration1, migration2] = await Promise.all([
      enableChatAssistant().catch(() => false),
      enableGPTMigration().catch(() => false),
      enabeGPTMigration().catch(() => false),
    ]);
    const isMigrationEnabled = migration1 || migration2;
    return NextResponse.json({
      enableInvestmentPortfolios: true,
      enableChatAssistant: isChatEnabled,
      enableGeminiChatAssitant: isChatEnabled,
      enableGPTMigration: isMigrationEnabled,
      enabeGPTMigration: isMigrationEnabled,
    });
  } catch (err) {
    const envChat =
      process.env.ENABLE_CHAT_ASSISTANT ||
      process.env.enableChatAssistant ||
      process.env.ENABLE_GEMINI_CHAT_ASSITANT ||
      process.env.enableGeminiChatAssitant;
    const envMigration =
      process.env.ENABLE_GPT_MIGRATION ||
      process.env.enableGPTMigration ||
      process.env.enabeGPTMigration ||
      process.env.ENABE_GPT_MIGRATION;

    const chatValue = envChat !== 'false';
    const migrationValue = envMigration === 'true';

    return NextResponse.json({
      enableInvestmentPortfolios: true,
      enableChatAssistant: chatValue,
      enableGeminiChatAssitant: chatValue,
      enableGPTMigration: migrationValue,
      enabeGPTMigration: migrationValue,
    });
  }
}
