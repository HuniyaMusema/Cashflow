import { useAppStore } from '../store/useAppStore';
import { translations } from '../lib/i18n';

export type TranslationKey = keyof typeof translations.en;

export function useTranslation() {
  const { language } = useAppStore();
  const t = (key: TranslationKey): string =>
    (translations[language] as Record<string, string>)[key] ?? translations.en[key];
  return { t, language };
}
