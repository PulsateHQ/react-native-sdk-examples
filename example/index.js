import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { registerCoexistBackgroundHandlers } from './src/coexist/bootstrap';

registerCoexistBackgroundHandlers();

AppRegistry.registerComponent(appName, () => App);
