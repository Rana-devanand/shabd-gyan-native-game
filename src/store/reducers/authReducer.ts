import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import type { User } from "@supabase/supabase-js";
import { api } from "../../services/api";
// Define a type for the slice state
interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Define the initial state using that typ
const initialState: AuthState = {
  accessToken: "",
  refreshToken: "",
  user: null,
  isAuthenticated: false,
  loading: true,
};

const _setTokens = (
  state: AuthState,
  data: { accessToken: string; refreshToken: string; user?: User | null }
) => {
  AsyncStorage.setItem("access_token", data.accessToken);
  AsyncStorage.setItem("refresh_token", data.refreshToken);
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  if ("user" in data) {
    state.user = data.user ?? null;
  }
  state.isAuthenticated = true;
  state.loading = false;
  return state;
};

const _resetTokens = (state: AuthState) => {
  AsyncStorage.setItem("access_token", "");
  AsyncStorage.setItem("refresh_token", "");
  state.accessToken = "";
  state.refreshToken = "";
  state.user = null;
  state.isAuthenticated = false;
  state.loading = false;
  return state;
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<{ loading: boolean }>) => {
      state.loading = action.payload.loading;
    },
    setTokens: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        user?: User | null;
      }>
    ) => {
      return _setTokens(state, action.payload);
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    resetTokens: (state) => {
      return _resetTokens(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        isAnyOf(
          api.endpoints.login.matchPending,
          api.endpoints.loginByApple.matchPending,
          api.endpoints.loginByFacebook.matchPending,
          api.endpoints.loginByGoogle.matchPending,
          api.endpoints.loginByLinkedIn.matchPending
        ),
        (state) => {
          state.loading = true;
          return state;
        }
      )
      .addMatcher(
        isAnyOf(
          api.endpoints.login.matchFulfilled,
          api.endpoints.loginByApple.matchFulfilled,
          api.endpoints.loginByFacebook.matchFulfilled,
          api.endpoints.loginByGoogle.matchFulfilled,
          api.endpoints.loginByLinkedIn.matchFulfilled
        ),
        (state, action) => {
          return _setTokens(state, action.payload.data);
        }
      )
      .addMatcher(
        isAnyOf(
          api.endpoints.login.matchRejected,
          api.endpoints.loginByApple.matchRejected,
          api.endpoints.loginByFacebook.matchRejected,
          api.endpoints.loginByGoogle.matchRejected,
          api.endpoints.loginByLinkedIn.matchRejected,
          api.endpoints.logout.matchFulfilled,
          api.endpoints.logout.matchRejected
        ),
        (state) => {
          return _resetTokens(state);
        }
      );
  },
});

export const { setLoading, setTokens, setUser, resetTokens } = authSlice.actions;

export default authSlice.reducer;
