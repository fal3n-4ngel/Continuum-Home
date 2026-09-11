import { NextResponse } from 'next/server';
import { enableInvestmentPortfolios, enableChatAssistant } from '@/app/flags';

export async function GET() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    const envInvest = process.env.ENABLE_INVESTMENT_PORTFOLIOS || process.env.enableInvestmentPortfolios;
    const envChat =
      process.env.ENABLE_CHAT_ASSISTANT ||
      process.env.enableChatAssistant ||
      process.env.ENABLE_GEMINI_CHAT_ASSITANT ||
      process.env.enableGeminiChatAssitant;

    const chatValue = envChat !== undefined ? envChat === 'true' : true;
    return NextResponse.json({
      enableInvestmentPortfolios: envInvest !== undefined ? envInvest === 'true' : true,
      enableChatAssistant: chatValue,
      enableGeminiChatAssitant: chatValue,
    });
  }

  try {
    const isInvestEnabled = await enableInvestmentPortfolios();
    const isChatEnabled = await enableChatAssistant();
    return NextResponse.json({
      enableInvestmentPortfolios: isInvestEnabled,
      enableChatAssistant: isChatEnabled,
      enableGeminiChatAssitant: isChatEnabled,
    });
  } catch (err) {
    const envInvest = process.env.ENABLE_INVESTMENT_PORTFOLIOS || process.env.enableInvestmentPortfolios;
    const envChat =
      process.env.ENABLE_CHAT_ASSISTANT ||
      process.env.enableChatAssistant ||
      process.env.ENABLE_GEMINI_CHAT_ASSITANT ||
      process.env.enableGeminiChatAssitant;

    const chatValue = envChat !== 'false';
    return NextResponse.json({
      enableInvestmentPortfolios: envInvest !== 'false',
      enableChatAssistant: chatValue,
      enableGeminiChatAssitant: chatValue,
    });
  }
}
