export function useIsMiniApp(): boolean {
  // @ts-expect-error - Telegram WebApp global
  return !!window.Telegram?.WebApp?.initData?.length;
}
