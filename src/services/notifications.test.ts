import { describe, expect, it, vi } from 'vitest';
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  showNotification,
} from './notifications';

type NotificationMockClass = {
  permission: NotificationPermission;
  requestPermission: ReturnType<typeof vi.fn>;
  instances: Array<{ title: string; options?: NotificationOptions }>;
};

describe('notifications helpers', () => {
  it('reflects support and permission state', async () => {
    const notificationMock = window.Notification as unknown as NotificationMockClass;
    notificationMock.permission = 'default';
    notificationMock.requestPermission.mockResolvedValueOnce('granted');

    expect(notificationsSupported()).toBe(true);
    expect(notificationPermission()).toBe('default');
    await expect(requestNotificationPermission()).resolves.toBe('granted');
  });

  it('only creates notifications when permission is granted', () => {
    const notificationMock = window.Notification as unknown as NotificationMockClass;
    notificationMock.permission = 'default';
    showNotification('Nope');
    expect(notificationMock.instances).toHaveLength(0);

    notificationMock.permission = 'granted';
    showNotification('Ready', 'Phase complete');

    expect(notificationMock.instances).toEqual([
      {
        title: 'Ready',
        options: {
          body: 'Phase complete',
          icon: '/favicon.ico',
          silent: true,
          tag: 'darktimer',
        },
      },
    ]);
  });
});
