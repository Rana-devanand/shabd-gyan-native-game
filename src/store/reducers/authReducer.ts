import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import { api } from "../../services/api";
// Define a type for the slice state
interface AuthState {
  accessToken: string;
  refreshToken: string;
  isAuthenticated: boolean;
  loading: boolean;
}

// Define the initial state using that typ
const initialState: AuthState = {
  accessToken: "",
  refreshToken: "",
  isAuthenticated: Boolean(AsyncStorage.getItem("access_token")),
  loading: true,
};

const _setTokens = (
  state: AuthState,
  data: { accessToken: string; refreshToken: string }
) => {
  AsyncStorage.setItem("access_token", data.accessToken);
  AsyncStorage.setItem("refresh_token", data.refreshToken);
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.isAuthenticated = true;
  state.loading = false;
  return state;
};

const _resetTokens = (state: AuthState) => {
  AsyncStorage.setItem("access_token", "");
  AsyncStorage.setItem("refresh_token", "");
  state.accessToken = "";
  state.refreshToken = "";
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
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) => {
      return _setTokens(state, action.payload);
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

export const { setLoading, setTokens, resetTokens } = authSlice.actions;

export default authSlice.reducer;
