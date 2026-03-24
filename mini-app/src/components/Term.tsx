import { useT } from "../i18n/context";
import type { TranslationKey } from "../i18n/en";

interface TermProps {
  /** i18n key for the tooltip explanation */
  hintKey: TranslationKey;
  children: React.ReactNode;
}

/**
 * Wraps a technical term with a dotted underline and tooltip on hover.
 * Tooltip text comes from i18n — auto-translates to user's language.
 */
export default function Term({ hintKey, children }: TermProps) {
  const t = useT();

  return (
    <span className="term-hint" data-hint={t(hintKey)}>
      {children}
    </span>
  );
}
