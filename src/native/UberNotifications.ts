import {NativeEventEmitter, NativeModules} from 'react-native';
import {insertTrip, logRawNotification} from '../data/tripsRepo';
import {parseUberNotification} from '../utils/parseUberNotification';

/**
 * JS side of the notification-capture bridge.
 *
 * The Kotlin NotificationListenerService catches notifications from the Uber
 * driver app on the device itself (after the user grants Notification Access),
 * queues them, and emits 'UberNotification' events when the RN context is
 * alive. We parse them into trips here.
 */
const {UberNotifications} = NativeModules as {
  UberNotifications?: {
    isPermissionGranted(): Promise<boolean>;
    openNotificationAccessSettings(): void;
    /** Returns queued notifications captured while JS was not running. */
    drainQueue(): Promise<Array<{pkg: string; title: string; text: string; postedAt: number}>>;
  };
};

export function isAvailable(): boolean {
  return !!UberNotifications;
}

export async function isPermissionGranted(): Promise<boolean> {
  return UberNotifications ? UberNotifications.isPermissionGranted() : false;
}

export function openNotificationAccessSettings(): void {
  UberNotifications?.openNotificationAccessSettings();
}

async function handleNotification(n: {pkg: string; title: string; text: string; postedAt?: number}) {
  try {
    await logRawNotification(n.pkg, n.title, n.text);
    const parsed = parseUberNotification(n.title ?? '', n.text ?? '');
    if (parsed.looksLikeCompletedTrip) {
      await insertTrip({
        timestamp: n.postedAt ? new Date(n.postedAt).toISOString() : new Date().toISOString(),
        fareAed: parsed.fareAed,
        zoneId: null, // TODO: stamp with last-known zone once location tracking lands
        source: 'notification',
        rawText: `${n.title} — ${n.text}`,
      });
    }
  } catch (e) {
    console.warn('failed to handle captured notification', e);
  }
}

let started = false;

/** Call once at app start: drains the offline queue and subscribes to live events. */
export async function startCapture(): Promise<void> {
  if (started || !UberNotifications) return;
  started = true;

  const emitter = new NativeEventEmitter(NativeModules.UberNotifications);
  emitter.addListener('UberNotification', handleNotification);

  try {
    const queued = await UberNotifications.drainQueue();
    for (const n of queued) {
      await handleNotification(n);
    }
  } catch (e) {
    console.warn('drainQueue failed', e);
  }
}
