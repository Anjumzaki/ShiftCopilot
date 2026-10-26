import {NativeModules} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance} from '@notifee/react-native';
import {SETTINGS_KEYS, SCORING_INTERVAL_MINUTES} from '../config/constants';
import {refreshAndNotify} from '../background/scoringTask';

/**
 * Shift mode = a notifee foreground service (keeps the process alive and shows
 * a persistent notification) + a native WorkManager periodic job as a fallback
 * refresher if Android kills the process anyway.
 */
const {ShiftScheduler} = NativeModules as {
  ShiftScheduler?: {
    schedule(intervalMinutes: number): void;
    cancel(): void;
  };
};

const CHANNEL_SHIFT = 'shift';
export const CHANNEL_RECS = 'recommendations';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function ensureChannels(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_SHIFT,
    name: 'Shift mode',
    importance: AndroidImportance.LOW,
  });
  await notifee.createChannel({
    id: CHANNEL_RECS,
    name: 'Zone recommendations',
    importance: AndroidImportance.HIGH,
  });
}

export async function startShift(): Promise<void> {
  await ensureChannels();
  await notifee.requestPermission();

  notifee.registerForegroundService(() => {
    return new Promise(() => {
      // Resolves never — the service runs until stopShift(). While alive, we
      // refresh scores on an interval from plain JS.
      refreshAndNotify().catch(() => {});
      intervalHandle = setInterval(() => {
        refreshAndNotify().catch(() => {});
      }, SCORING_INTERVAL_MINUTES * 60 * 1000);
    });
  });

  await notifee.displayNotification({
    id: 'shift-foreground',
    title: 'Shift mode on',
    body: 'Watching flights, events and demand patterns for you.',
    android: {
      channelId: CHANNEL_SHIFT,
      asForegroundService: true,
      ongoing: true,
      pressAction: {id: 'default'},
    },
  });

  ShiftScheduler?.schedule(SCORING_INTERVAL_MINUTES); // WorkManager fallback
  await AsyncStorage.setItem(SETTINGS_KEYS.shiftModeOn, '1');
}

export async function stopShift(): Promise<void> {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  await notifee.stopForegroundService();
  await notifee.cancelNotification('shift-foreground');
  ShiftScheduler?.cancel();
  await AsyncStorage.setItem(SETTINGS_KEYS.shiftModeOn, '0');
}

export async function isShiftOn(): Promise<boolean> {
  return (await AsyncStorage.getItem(SETTINGS_KEYS.shiftModeOn)) === '1';
}
