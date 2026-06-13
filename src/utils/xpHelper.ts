import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../Supabase/client";
import { recordDailyStreakLogin } from "../services/databaseService";

export interface LevelInfo {
  level: number;
  minXp: number;
  maxXp: number;
  progress: number; // 0 to 1 representing progress within this level
}

/**
 * Calculates level details based on total XP (score).
 * Levels:
 * - Level 1: 0 - 300 XP
 * - Level 2: 301 - 500 XP
 * - Level 3: 501 - 800 XP
 * - Level 4: 801 - 1000 XP
 * - Level 5+: 1001 XP onwards (each level is exactly 500 XP wide)
 */
export function getXPLevel(xp: number): LevelInfo {
  if (xp < 0) xp = 0;
  
  if (xp <= 300) {
    return { level: 1, minXp: 0, maxXp: 300, progress: xp / 300 };
  }
  if (xp <= 500) {
    return { level: 2, minXp: 301, maxXp: 500, progress: (xp - 300) / 200 };
  }
  if (xp <= 800) {
    return { level: 3, minXp: 501, maxXp: 800, progress: (xp - 500) / 300 };
  }
  if (xp <= 1000) {
    return { level: 4, minXp: 801, maxXp: 1000, progress: (xp - 800) / 200 };
  }

  // Level 5 and onwards: starts at 1001, increments by 500 per level
  // level = Math.floor((xp - 1001) / 500) + 5
  const level = Math.floor((xp - 1001) / 500) + 5;
  const minXp = 1001 + (level - 5) * 500;
  const maxXp = 1000 + (level - 4) * 500;
  const progress = (xp - minXp + 1) / 500;
  return { level, minXp, maxXp, progress: Math.min(1, Math.max(0, progress)) };
}

/**
 * Awards XP to the user, saving to AsyncStorage and syncing to Supabase if logged in.
 */
export async function awardXP(
  points: number,
  reason: string,
  referenceId?: string
): Promise<number> {
  try {
    const scoreStr = await AsyncStorage.getItem("shabdgyan_score") || "0";
    let currentScore = parseInt(scoreStr, 10);
    let newScore = Math.max(0, currentScore + points);

    // Save locally
    await AsyncStorage.setItem("shabdgyan_score", newScore.toString());

    // Save quest total earned if from a quest play
    if (
      reason === "daily_quest_completed" ||
      reason === "high_score_hunt_completed" ||
      reason === "secret_chest_bonus"
    ) {
      try {
        const questXpStr = (await AsyncStorage.getItem("shabdgyan_quest_total_earned")) || "0";
        const currentQuestXp = parseInt(questXpStr, 10);
        if (points > 0) {
          const newQuestXp = currentQuestXp + points;
          await AsyncStorage.setItem("shabdgyan_quest_total_earned", newQuestXp.toString());
        }
      } catch (e) {
        console.error("[xpHelper] Failed to update quest total earned XP:", e);
      }
    }

    // Sync to Supabase if authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log(`[xpHelper] Syncing XP update (${points} XP) to Supabase...`);
      const { data, error } = await supabase.rpc("add_points_transaction", {
        p_user_id: session.user.id,
        p_points: points,
        p_reason: reason,
        p_reference_id: referenceId || null,
      });

      if (error) {
        console.warn("[xpHelper] Supabase add_points_transaction RPC failed:", error.message);
      } else if (data) {
        // Sync the authoritative DB score back to AsyncStorage
        newScore = data.score;
        await AsyncStorage.setItem("shabdgyan_score", newScore.toString());
        if (data.streak !== undefined) {
          await AsyncStorage.setItem("shabdgyan_streak", data.streak.toString());
        }
        if (data.max_streak !== undefined) {
          await AsyncStorage.setItem("shabdgyan_max_streak", data.max_streak.toString());
        }
      }
    }

    return newScore;
  } catch (err) {
    console.error("[xpHelper] Failed to award XP:", err);
    return 0;
  }
}

/**
 * Increments daily streak in local storage and Supabase.
 */
export async function incrementStreak(): Promise<number> {
  try {
    const streakStr = await AsyncStorage.getItem("shabdgyan_streak") || "0";
    let newStreak = parseInt(streakStr, 10) + 1;
    await AsyncStorage.setItem("shabdgyan_streak", newStreak.toString());

    const maxStreakStr = await AsyncStorage.getItem("shabdgyan_max_streak") || "0";
    let maxStreak = parseInt(maxStreakStr, 10);
    if (newStreak > maxStreak) {
      maxStreak = newStreak;
      await AsyncStorage.setItem("shabdgyan_max_streak", maxStreak.toString());
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          streak: newStreak,
          max_streak: maxStreak,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (error) {
        console.warn("[xpHelper] Failed to sync streak to Supabase profiles:", error.message);
      }
    }

    return newStreak;
  } catch (err) {
    console.error("[xpHelper] Failed to increment streak:", err);
    return 0;
  }
}

/**
 * Resets daily streak.
 */
export async function resetStreak(toValue = 0): Promise<number> {
  try {
    await AsyncStorage.setItem("shabdgyan_streak", toValue.toString());

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("profiles")
        .update({ streak: toValue, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);
    }
    return toValue;
  } catch (err) {
    console.error("[xpHelper] Failed to reset streak:", err);
    return 0;
  }
}

/**
 * Checks and claims daily login streak reward (+10 XP) if it's a new day.
 * Consecutiveness is also validated to increment/reset the streak counter.
 */
export async function claimDailyStreakXP(): Promise<{
  claimed: boolean;
  xpEarned: number;
  newStreak: number;
}> {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const lastClaimDate = await AsyncStorage.getItem("shabdgyan_last_streak_claim_date");

    if (lastClaimDate === todayStr) {
      // Already claimed today
      const streakStr = await AsyncStorage.getItem("shabdgyan_streak") || "0";
      return { claimed: false, xpEarned: 0, newStreak: parseInt(streakStr, 10) };
    }

    // New day login! Claim streak XP (+10 XP)
    const newScore = await awardXP(10, "daily_streak_claim", todayStr);
    await AsyncStorage.setItem("shabdgyan_last_streak_claim_date", todayStr);

    // Check consecutiveness
    let finalStreak = 1;
    const streakStr = await AsyncStorage.getItem("shabdgyan_streak") || "0";
    const currentStreak = parseInt(streakStr, 10);

    if (lastClaimDate) {
      const lastClaimTime = new Date(lastClaimDate).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.round((todayTime - lastClaimTime) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive login! Increment streak
        finalStreak = await incrementStreak();
      } else {
        // Broken streak! Reset to 1
        finalStreak = await resetStreak(1);
      }
    } else {
      // First time claiming streak
      finalStreak = await resetStreak(1);
    }

    // Record login entry in Supabase database daily streaks table
    try {
      await recordDailyStreakLogin(finalStreak);
    } catch (dbErr) {
      console.warn("[xpHelper] Failed to log daily streak to Supabase:", dbErr);
    }

    return { claimed: true, xpEarned: 10, newStreak: finalStreak };
  } catch (err) {
    console.error("[xpHelper] Daily streak claim error:", err);
    return { claimed: false, xpEarned: 0, newStreak: 0 };
  }
}
