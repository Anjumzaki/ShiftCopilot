import React, {useEffect} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {useAppStore} from '../state/useAppStore';
import {theme} from '../theme';
import type {ZoneScore} from '../engine/types';

function BigCard({zs, label, color}: {zs: ZoneScore; label: string; color: string}) {
  return (
    <View style={[styles.card, {borderColor: color}]}>
      <Text style={[styles.cardLabel, {color}]}>{label}</Text>
      <Text style={styles.zoneName}>{zs.zone.name}</Text>
      <Text style={styles.headline}>{zs.headline}</Text>
      <View style={styles.reasons}>
        {zs.contributions.map((c, i) => (
          <Text key={i} style={styles.reason}>
            {c.points >= 0 ? '+' : ''}
            {c.points}  {c.reason}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const {result, refreshing, refresh, shiftOn, toggleShift, init} = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.text} />
      }>
      <View style={styles.shiftRow}>
        <View>
          <Text style={styles.shiftTitle}>Shift mode</Text>
          <Text style={styles.shiftSub}>
            {shiftOn ? 'Watching demand in the background' : 'Off — turn on when you start driving'}
          </Text>
        </View>
        <Switch
          value={shiftOn}
          onValueChange={toggleShift}
          trackColor={{true: theme.accent, false: theme.border}}
          thumbColor={theme.text}
        />
      </View>

      {result ? (
        <>
          <BigCard zs={result.recommendation.now} label="GO NOW" color={theme.accent} />
          {result.recommendation.alternative && (
            <BigCard
              zs={result.recommendation.alternative}
              label="NEXT BEST"
              color={theme.warn}
            />
          )}
          {result.recommendation.avoid && (
            <View style={[styles.card, {borderColor: theme.bad}]}>
              <Text style={[styles.cardLabel, {color: theme.bad}]}>AVOID</Text>
              <Text style={styles.zoneName}>{result.recommendation.avoid.zone.name}</Text>
            </View>
          )}
          <Text style={styles.updated}>
            Updated {dayjs(result.generatedAt).format('ddd HH:mm')} · pull to refresh
          </Text>
        </>
      ) : (
        <Text style={styles.updated}>Pull down to get your first recommendation.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.bg, padding: 16},
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    marginBottom: 16,
  },
  shiftTitle: {color: theme.text, fontSize: 17, fontWeight: '700'},
  shiftSub: {color: theme.textDim, fontSize: 12, marginTop: 2, maxWidth: 240},
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: {fontSize: 12, fontWeight: '800', letterSpacing: 1.5},
  zoneName: {color: theme.text, fontSize: 24, fontWeight: '800', marginTop: 4},
  headline: {color: theme.text, fontSize: 14, marginTop: 6},
  reasons: {marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8},
  reason: {color: theme.textDim, fontSize: 12, marginTop: 3},
  updated: {color: theme.textDim, fontSize: 12, textAlign: 'center', marginVertical: 12},
});
