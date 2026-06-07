import { createAction } from "@reduxjs/toolkit";
import type { User } from "@supabase/supabase-js";

export const setTokens = createAction<{
  accessToken: string;
  refreshToken: string;
  user?: User | null;
}>("auth/setTokens");
export const setUser = createAction<User | null>("auth/setUser");
export const resetTokens = createAction("auth/resetTokens");
