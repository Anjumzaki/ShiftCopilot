import notifee, {AndroidImportance} from '@notifee/react-native';
import {runScoring, saveResult, loadLastResult} from '../engine/scoring';

/**
 * One scoring pass + a push to the driver. Called from:
 *  - the foreground-service interval while shift mode is on,
 *  - the WorkManager headless-JS fallback (ScoringHeadlessTask),
 *  - a manual pull-to-refresh on the Home screen.
 *
 * Only notifies when the top zone changed (or the top score jumped), so the
 * driver isn't pinged every 30 minutes with "same plan".
 */
export async function refreshAndNotify(): Promise<void> {
  const previous = await loadLastResult();
  const result = await runScoring();
  await saveResult(result);

  const top = result.recommendation.now;
  const prevTop = previous?.recommendation.now;
  const changed =
    !prevTop ||
    prevTop.zone.id !== top.zone.id ||
    top.score - prevTop.score >= 3;

  if (!changed) return;

  await notifee.createChannel({
    id: 'recommendations',
    name: 'Zone recommendations',
    importance: AndroidImportance.HIGH,
  });

  const alt = result.recommendation.alternative;
  await notifee.displayNotification({
    title: `Head to ${top.zone.name}`,
    body: `${top.headline}${alt ? ` · Next best: ${alt.zone.name}` : ''}`,
    android: {
      channelId: 'recommendations',
      pressAction: {id: 'default'},
      smallIcon: 'ic_launcher',
    },
  });
}

/** Registered as a Headless JS task — invoked by the Kotlin ScoringWorker. */
export async function scoringHeadlessTask(): Promise<void> {
  await refreshAndNotify();
}
