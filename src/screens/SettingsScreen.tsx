import React, {useCallback, useEffect, useState} from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SETTINGS_KEYS, EVENTS_FEED_URL} from '../config/constants';
import {
  isAvailable,
  isPermissionGranted,
  openNotificationAccessSettings,
} from '../native/UberNotifications';
import {theme} from '../theme';

interface FieldProps {
  label: string;
  hint?: string;
  storageKey: string;
  placeholder?: string;
  secure?: boolean;
}

function Field({label, hint, storageKey, placeholder, secure}: FieldProps) {
  const [value, setValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(storageKey).then(v => setValue(v ?? ''));
    }, [storageKey]),
  );

  const save = async (v: string) => {
    setValue(v);
    await AsyncStorage.setItem(storageKey, v.trim());
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={save}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const [listenerGranted, setListenerGranted] = useState<boolean | null>(null);

  const checkListener = useCallback(() => {
    if (isAvailable()) {
      isPermissionGranted().then(setListenerGranted);
    } else {
      setListenerGranted(false);
    }
  }, []);

  useFocusEffect(checkListener);

  // Re-check when the app returns to the foreground (e.g. coming back from
  // the Android notification-access settings screen).
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkListener();
    });
    return () => sub.remove();
  }, [checkListener]);

  return (
    <ScrollView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Automatic trip capture</Text>
        <Text style={styles.hint}>
          ShiftCopilot reads the Uber driver app's notifications on this phone to log your
          trips and fares automatically. Nothing leaves the device.
        </Text>
        <Pressable style={styles.btn} onPress={openNotificationAccessSettings}>
          <Text style={styles.btnText}>
            {listenerGranted ? '✓ Access granted — open settings' : 'Grant notification access'}
          </Text>
        </Pressable>
      </View>

      <Field
        label="AeroDataBox API key (RapidAPI)"
        hint="Free key from rapidapi.com → AeroDataBox. Powers the flight-arrival signal."
        storageKey={SETTINGS_KEYS.rapidApiKey}
        placeholder="x-rapidapi-key"
        secure
      />
      <Field
        label="OpenWeatherMap API key"
        hint="Free key from openweathermap.org. Powers the rain alert."
        storageKey={SETTINGS_KEYS.openWeatherKey}
        placeholder="appid"
        secure
      />
      <Field
        label="Events feed URL"
        hint={`Leave empty to use the default:\n${EVENTS_FEED_URL}`}
        storageKey={SETTINGS_KEYS.eventsFeedUrl}
        placeholder="https://<user>.github.io/<repo>/events/events.json"
      />
      <Field
        label="Airport (IATA)"
        hint="DXB by default. Use AUH if he works Abu Dhabi."
        storageKey={SETTINGS_KEYS.airportIata}
        placeholder="DXB"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.bg, padding: 14},
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {color: theme.text, fontSize: 16, fontWeight: '700'},
  btn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {color: '#06130C', fontWeight: '800'},
  field: {marginBottom: 16},
  label: {color: theme.text, fontSize: 14, fontWeight: '700'},
  hint: {color: theme.textDim, fontSize: 12, marginTop: 4, marginBottom: 6},
  input: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
