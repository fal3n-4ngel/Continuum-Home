import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const enableInvestmentPortfolios = flag<boolean>({
  key: 'enableInvestmentPortfolios',
  description: 'Flag for the investment tracking page',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter,
});

export const enableChatAssistant = flag<boolean>({
  key: 'enableChatAssistant',
  description: 'Flag for the Live Chat Assistant bubble',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter,
});

export const enableGeminiChatAssitant = enableChatAssistant;
