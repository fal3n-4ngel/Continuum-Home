import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';


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

export const enabeGPTMigration = flag<boolean>({
  key: 'enabeGPTMigration',
  origin: 'https://vercel.com/fal3n4ngels-projects/continuum-home/flag/enabeGPTMigration',
  description: 'Flag for ChatGPT Plugin & Skills migration flow ahead of Dec 11 Custom GPT retirement',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter,
});

export const enableGPTMigration = enabeGPTMigration;

