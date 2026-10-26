import React, {useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppStore} from '../state/useAppStore';
import {scoreColor, theme} from '../theme';

export default function ZonesScreen() {
  const result = useAppStore(s => s.result);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!result) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>No scores yet — refresh on the Home tab.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={result.ranked}
      keyExtractor={z => z.zone.id}
      renderItem={({item, index}) => (
        <Pressable
          style={styles.row}
          onPress={() => setExpanded(expanded === item.zone.id ? null : item.zone.id)}>
          <View style={styles.rowTop}>
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={{flex: 1}}>
              <Text style={styles.name}>{item.zone.name}</Text>
              <Text style={styles.headline} numberOfLines={expanded === item.zone.id ? 0 : 1}>
                {item.headline}
              </Text>
            </View>
            <Text style={[styles.score, {color: scoreColor(item.score)}]}>{item.score}</Text>
          </View>
          {expanded === item.zone.id && (
            <View style={styles.detail}>
              {item.contributions.map((c, i) => (
                <Text key={i} style={styles.reason}>
                  {c.points >= 0 ? '+' : ''}
                  {c.points}  {c.reason}
                </Text>
              ))}
            </View>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.bg, padding: 12},
  empty: {color: theme.textDim, textAlign: 'center', marginTop: 40},
  row: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 8,
  },
  rowTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rank: {color: theme.textDim, width: 22, fontSize: 14, fontWeight: '700'},
  name: {color: theme.text, fontSize: 15, fontWeight: '700'},
  headline: {color: theme.textDim, fontSize: 12, marginTop: 2},
  score: {fontSize: 18, fontWeight: '800'},
  detail: {marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8},
  reason: {color: theme.textDim, fontSize: 12, marginTop: 3},
});
