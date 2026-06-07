/**
 * app/profile-setup.tsx
 *
 * Shown ONCE after a user first signs up.
 * Lets them pick a nickname + avatar emoji.
 * Calls supabase.rpc('create_profile') then routes to tabs.
 */

import React from "react";
import ProfileSetup from "@/src/components/auth/ProfileSetup";

export default function ProfileSetupScreen() {
  return <ProfileSetup />;
}
