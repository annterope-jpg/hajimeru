export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable';

export interface StartCueRequest {
  attemptId: string;
  /** A non-sensitive event label such as "夕食後". */
  eventName: string;
  hour: number;
  minute: number;
  repeatsDaily?: boolean;
}

export type ScheduleStartCueResult =
  | { scheduled: true; identifier: string }
  | {
      scheduled: false;
      reason: 'permission-denied' | 'unavailable' | 'invalid-time';
    };

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'start-cues';

async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

function normalizePermissionStatus(status: string): NotificationPermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

function validClockTime(hour: number, minute: number): boolean {
  return (
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59
  );
}

export function buildStartPlanDeepLink(attemptId: string): string {
  // Keep the identifier in a query parameter because Expo Router's prototype
  // route is /plan rather than a dynamic /plan/[id] route.
  return `hajimeru://plan?attemptId=${encodeURIComponent(attemptId)}`;
}

export function nextClockOccurrence(
  hour: number,
  minute: number,
  now = new Date(),
): Date | null {
  if (!validClockTime(hour, minute)) return null;
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

/** Reads current permission without displaying a system prompt. */
export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  const notifications = await loadNotifications();
  if (!notifications) return 'unavailable';
  try {
    const permission = await notifications.getPermissionsAsync();
    return normalizePermissionStatus(permission.status);
  } catch {
    return 'unavailable';
  }
}

/** Call only immediately after the user opts into a start cue. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const notifications = await loadNotifications();
  if (!notifications) return 'unavailable';
  try {
    const permission = await notifications.requestPermissionsAsync();
    return normalizePermissionStatus(permission.status);
  } catch {
    return 'unavailable';
  }
}

export async function configureNotificationPresentation(): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(
  notifications: NotificationsModule,
): Promise<void> {
  try {
    await notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '始める合図',
      importance: notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lockscreenVisibility:
        notifications.AndroidNotificationVisibility.PRIVATE,
    });
  } catch {
    // iOS/web and hosts without Android channels do not need this setup.
  }
}

export async function scheduleStartCue(
  request: StartCueRequest,
): Promise<ScheduleStartCueResult> {
  if (!validClockTime(request.hour, request.minute)) {
    return { scheduled: false, reason: 'invalid-time' };
  }
  const notifications = await loadNotifications();
  if (!notifications) return { scheduled: false, reason: 'unavailable' };

  const permission = await getNotificationPermission();
  if (permission !== 'granted') {
    return {
      scheduled: false,
      reason:
        permission === 'unavailable' ? 'unavailable' : 'permission-denied',
    };
  }

  await ensureAndroidChannel(notifications);
  const url = buildStartPlanDeepLink(request.attemptId);
  const trigger = request.repeatsDaily
    ? {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour: request.hour,
        minute: request.minute,
        channelId: CHANNEL_ID,
      }
    : (() => {
        const date = nextClockOccurrence(request.hour, request.minute);
        return date
          ? {
              type: notifications.SchedulableTriggerInputTypes.DATE,
              date,
              channelId: CHANNEL_ID,
            }
          : null;
      })();
  if (trigger === null) return { scheduled: false, reason: 'invalid-time' };

  try {
    const identifier = await notifications.scheduleNotificationAsync({
      content: {
        title: '始める合図です',
        body: `${request.eventName}のあと、最初の一歩だけ試してみませんか。`,
        data: {
          kind: 'start-cue',
          attemptId: request.attemptId,
          url,
        },
      },
      trigger,
    });
    return { scheduled: true, identifier };
  } catch {
    return { scheduled: false, reason: 'unavailable' };
  }
}

export async function cancelStartCue(identifier: string): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;
  try {
    await notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Cancellation is idempotent from the caller's perspective.
  }
}

export async function cancelAllStartCues(): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;
  try {
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // There is nothing else to clean up when notifications are unavailable.
  }
}

function responseUrl(
  response: Awaited<
    ReturnType<NotificationsModule['getLastNotificationResponseAsync']>
  >,
): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' ? url : null;
}

export async function getInitialNotificationUrl(): Promise<string | null> {
  const notifications = await loadNotifications();
  if (!notifications) return null;
  try {
    const url = responseUrl(await notifications.getLastNotificationResponseAsync());
    if (url) await notifications.clearLastNotificationResponseAsync();
    return url;
  } catch {
    return null;
  }
}

export async function subscribeToNotificationUrls(
  onUrl: (url: string) => void,
): Promise<() => void> {
  const notifications = await loadNotifications();
  if (!notifications) return () => undefined;
  const subscription = notifications.addNotificationResponseReceivedListener(
    (response) => {
      const url = responseUrl(response);
      if (url) onUrl(url);
    },
  );
  return () => subscription.remove();
}
