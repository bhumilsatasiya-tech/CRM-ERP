import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import 'antd/dist/reset.css';
import './index.css';
import './app/tally-theme.css';
import App from './App';
import { store } from './app/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
          <AntdApp>
            <Suspense
              fallback={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                  <Spin size="large" />
                </div>
              }
            >
              <App />
            </Suspense>
          </AntdApp>
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
