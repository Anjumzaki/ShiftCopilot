import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {scoringHeadlessTask} from './src/background/scoringTask';

AppRegistry.registerComponent(appName, () => App);

// Invoked by the native WorkManager fallback while the app is backgrounded.
AppRegistry.registerHeadlessTask('ScoringTask', () => scoringHeadlessTask);
