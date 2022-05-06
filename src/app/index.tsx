import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React from 'react';
import ReactDOM from 'react-dom';
import './assets/fonts/jetbrainsmono.css';
import './styles/preflight.css';
import './styles/main.css';
import { Provider } from 'react-redux';
import * as Sentry from '@sentry/react';
import * as asyncHandlers from './asyncMessageHandlers';
import { initializeAnalytics } from '../utils/analytics';
import App from './components/App';
import Heading from './components/Heading';
import { store } from './store';
import * as pjs from '../../package.json';
import Stack from './components/Stack';
import Text from './components/Text';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

initializeAnalytics();

AsyncMessageChannel.connect();
AsyncMessageChannel.handle(AsyncMessageTypes.GET_THEME_INFO, asyncHandlers.getThemeInfo);

if (process.env.ENVIRONMENT === 'production' || process.env.ENVIRONMENT === 'beta') {
  Sentry.init({
    dsn: 'https://26bac1a4b1ba4d91bc9420d10d95bb3e@o386310.ingest.sentry.io/5220409',
    release: `figma-tokens@${pjs.plugin_version}`,
    environment: process.env.ENVIRONMENT,
  });
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Stack direction="column" align="center" gap={4} justify="center" css={{ height: '100%', textAlign: 'center' }}>
      <Heading>Something went wrong!</Heading>
      <Stack direction="column" gap={2}>
        <Text size="xsmall" muted>{error.message}</Text>
        <Text size="xsmall" muted>Restart the plugin and try again.</Text>
      </Stack>
    </Stack>
  );
}

ReactDOM.render(
  <Sentry.ErrorBoundary fallback={ErrorFallback}>
    <Provider store={store}>
      <App />
    </Provider>
  </Sentry.ErrorBoundary>,
  document.getElementById('app'),
);
