import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../modules/01-auth';
import { companiesReducer } from '../modules/02-companies';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    companies: companiesReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
