import React, {useCallback, useState} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import dayjs from 'dayjs';
import type {Trip} from '../engine/types';
import {
  deleteTrip,
  earningsSummary,
  getRecentTrips,
  insertTrip,
  type EarningsSummary,
} from '../data/tripsRepo';
import {theme} from '../theme';
import {zoneById} from '../config/zones';

export default function EarningsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [manualFare, setManualFare] = useState('');

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([getRecentTrips(14), earningsSummary()]);
    setTrips(t);
    setSummary(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const addManual = async () => {
    const fare = parseFloat(manualFare.replace(',', '.'));
    if (!fare || fare <= 0) return;
    await insertTrip({
      timestamp: new Date().toISOString(),
      fareAed: fare,
      zoneId: null,
      source: 'manual',
      rawText: 'manual entry',
    });
    setManualFare('');
    load();
  };

  const confirmDelete = (t: Trip) => {
    Alert.alert('Delete trip?', `AED ${t.fareAed ?? '?'} — ${dayjs(t.timestamp).format('ddd HH:mm')}`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (t.id != null) {
            await deleteTrip(t.id);
            load();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>AED {Math.round(summary?.todayAed ?? 0)}</Text>
          <Text style={styles.summaryLabel}>Today · {summary?.todayTrips ?? 0} trips</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>AED {Math.round(summary?.weekAed ?? 0)}</Text>
          <Text style={styles.summaryLabel}>7 days · {summary?.weekTrips ?? 0} trips</Text>
        </View>
      </View>

      <View style={styles.manualRow}>
        <TextInput
          style={styles.input}
          placeholder="Add fare manually (AED)"
          placeholderTextColor={theme.textDim}
          keyboardType="decimal-pad"
          value={manualFare}
          onChangeText={setManualFare}
        />
        <Pressable style={styles.addBtn} onPress={addManual}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={trips}
        keyExtractor={t => String(t.id)}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No trips yet. Grant notification access in Settings and trips will log themselves.
          </Text>
        }
        renderItem={({item}) => (
          <Pressable style={styles.trip} onLongPress={() => confirmDelete(item)}>
            <View style={{flex: 1}}>
              <Text style={styles.tripTime}>{dayjs(item.timestamp).format('ddd DD MMM, HH:mm')}</Text>
              <Text style={styles.tripMeta}>
                {item.zoneId ? zoneById(item.zoneId)?.name : 'Zone unknown'} ·{' '}
                {item.source === 'notification' ? 'auto' : 'manual'}
              </Text>
            </View>
            <Text style={styles.tripFare}>
              {item.fareAed != null ? `AED ${item.fareAed}` : '—'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.bg, padding: 12},
  summaryRow: {flexDirection: 'row', gap: 10, marginBottom: 12},
  summaryCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 14,
  },
  summaryValue: {color: theme.text, fontSize: 20, fontWeight: '800'},
  summaryLabel: {color: theme.textDim, fontSize: 12, marginTop: 2},
  manualRow: {flexDirection: 'row', gap: 10, marginBottom: 12},
  input: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    color: theme.text,
    paddingHorizontal: 14,
  },
  addBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: {color: '#06130C', fontWeight: '800'},
  empty: {color: theme.textDim, textAlign: 'center', marginTop: 30, paddingHorizontal: 20},
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 12,
    marginBottom: 8,
  },
  tripTime: {color: theme.text, fontSize: 14, fontWeight: '600'},
  tripMeta: {color: theme.textDim, fontSize: 11, marginTop: 2},
  tripFare: {color: theme.accent, fontSize: 16, fontWeight: '800'},
});
