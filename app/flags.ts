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
  description: 'Flag for ChatGPT Plugin & Skills migration flow ahead of Dec 11 Custom GPT retirement',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter,
});

export const enableGPTMigration = flag<boolean>({
  key: 'enableGPTMigration',
  description: 'Flag for ChatGPT Plugin & Skills migration flow ahead of Dec 11 Custom GPT retirement',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter,
});
