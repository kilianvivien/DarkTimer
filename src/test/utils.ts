export function setOnlineStatus(isOnline: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  });
}

export async function flushPromises(): Promise<void> {
  await Promise.resolve();
}
