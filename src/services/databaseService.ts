import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../Supabase/client";
import { PUZZLES, PAHELI_PUZZLES } from "../constants/puzzles";

export interface SupabaseProfile {
  id: string;
  nickname: string;
  avatar: string;
  age: number | null;
  gender: string | null;
  country: string | null;
  score: number;
  streak: number;
  max_streak: number;
}

/**
 * Fetches and syncs the user profile from Supabase with AsyncStorage
 */
export async function syncUserProfile(): Promise<SupabaseProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.warn("[databaseService] Error fetching profile:", error.message);
      return null;
    }

    if (profile) {
      if (profile.nickname) await AsyncStorage.setItem("user_nickname", profile.nickname);
      if (profile.avatar) await AsyncStorage.setItem("user_avatar", profile.avatar);
      if (profile.score !== undefined) await AsyncStorage.setItem("shabdgyan_score", String(profile.score));
      if (profile.streak !== undefined) await AsyncStorage.setItem("shabdgyan_streak", String(profile.streak));
      if (profile.max_streak !== undefined) await AsyncStorage.setItem("shabdgyan_max_streak", String(profile.max_streak));
      if (profile.age !== null && profile.age !== undefined) await AsyncStorage.setItem("user_age", String(profile.age));
      if (profile.gender) await AsyncStorage.setItem("user_gender", profile.gender);
      if (profile.country) await AsyncStorage.setItem("user_country", profile.country);
    }
    return profile as SupabaseProfile;
  } catch (err) {
    console.error("[databaseService] syncUserProfile failed:", err);
    return null;
  }
}

/**
 * Fetches and syncs the solved puzzle IDs list from Supabase with AsyncStorage
 */
export async function syncSolvedPuzzles(): Promise<{
  solvedIds: string[];
  counts: Record<string, Record<string, number>>;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { solvedIds: [], counts: { shabd: {}, paheli: {} } };

    const { data, error } = await supabase
      .from("user_played_quizzes")
      .select("puzzle_id, category, difficulty, mode")
      .eq("user_id", session.user.id)
      .eq("revealed_answer", false);

    if (error) {
      console.warn("[databaseService] Error fetching solved quizzes:", error.message);
      return { solvedIds: [], counts: { shabd: {}, paheli: {} } };
    }

    const solvedStaticIds = new Set<string>();
    const counts: Record<string, Record<string, number>> = { shabd: {}, paheli: {} };

    if (data) {
      for (const row of data) {
        let mode = row.mode || "shabd";
        if (mode === "daily_challenge") {
          mode = "shabd";
        }
        const category = row.category;
        const difficulty = row.difficulty || "Easy";

        // Aggregate solved counts per mode and category
        if (category) {
          if (!counts[mode]) {
            counts[mode] = {};
          }
          counts[mode][category] = (counts[mode][category] || 0) + 1;
        }

        // Map category/difficulty/mode to the static puzzle ID
        const modePuzzles = mode === "shabd" ? PUZZLES : PAHELI_PUZZLES;
        const catPuzzles = modePuzzles.filter((p) => p.category === category);
        const diffIdx = ["Easy", "Medium", "Hard", "Super Hard"].indexOf(difficulty);
        
        if (diffIdx !== -1 && catPuzzles[diffIdx]) {
          solvedStaticIds.add(catPuzzles[diffIdx].id);
        } else if (catPuzzles.length > 0) {
          solvedStaticIds.add(catPuzzles[0].id);
        }
      }
    }

    const solvedIds = Array.from(solvedStaticIds);
    await AsyncStorage.setItem("shabdgyan_solved_ids", JSON.stringify(solvedIds));
    await AsyncStorage.setItem("shabdgyan_solved_counts", JSON.stringify(counts));
    return { solvedIds, counts };
  } catch (err) {
    console.error("[databaseService] syncSolvedPuzzles failed:", err);
    return { solvedIds: [], counts: { shabd: {}, paheli: {} } };
  }
}

/**
 * Fetches and syncs daily quest statuses from Supabase with AsyncStorage for today
 */
export async function syncTodayQuests(): Promise<{
  daily_warrior: string;
  decipher_scroll: string;
  high_score_hunt: string;
}> {
  const result = {
    daily_warrior: "not_started",
    decipher_scroll: "not_started",
    high_score_hunt: "not_started",
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return result;

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: quests, error } = await supabase
      .from("user_quests")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("played_date", todayStr);

    if (error) {
      console.warn("[databaseService] Error fetching user quests:", error.message);
      return result;
    }

    if (quests && quests.length > 0) {
      for (const q of quests) {
        if (q.quest_type === "daily_warrior") {
          result.daily_warrior = q.status;
        } else if (q.quest_type === "decipher_scroll") {
          result.decipher_scroll = q.status;
        } else if (q.quest_type === "high_score_hunt") {
          result.high_score_hunt = q.status;
        }
      }
    }

    // Save to AsyncStorage
    await AsyncStorage.setItem("quest_last_played_date", todayStr);
    await AsyncStorage.setItem("quest_daily_warrior_status", result.daily_warrior);
    await AsyncStorage.setItem("quest_decipher_scroll_status", result.decipher_scroll);
    await AsyncStorage.setItem("quest_high_score_hunt_status", result.high_score_hunt);

    return result;
  } catch (err) {
    console.error("[databaseService] syncTodayQuests failed:", err);
    return result;
  }
}

/**
 * Saves or updates quest status in Supabase and AsyncStorage
 */
export async function saveQuestStatus(
  questType: "daily_warrior" | "decipher_scroll" | "high_score_hunt",
  status: "played" | "completed",
  scoreEarned: number
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const todayStr = new Date().toISOString().split("T")[0];

    // Check if record exists
    const { data: existing } = await supabase
      .from("user_quests")
      .select("id, status")
      .eq("user_id", session.user.id)
      .eq("quest_type", questType)
      .eq("played_date", todayStr)
      .maybeSingle();

    if (existing) {
      // If already completed in DB, don't overwrite to played
      if (existing.status === "completed" && status === "played") {
        return;
      }
      // Update
      const { error } = await supabase
        .from("user_quests")
        .update({
          status,
          score_earned: scoreEarned,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
      
      if (error) {
        console.warn("[databaseService] Error updating user quest:", error.message);
      }
    } else {
      // Insert
      const { error } = await supabase
        .from("user_quests")
        .insert({
          user_id: session.user.id,
          quest_type: questType,
          status,
          score_earned: scoreEarned,
          played_date: todayStr
        });

      if (error) {
        console.warn("[databaseService] Error inserting user quest:", error.message);
      }
    }

    // Also update local storage
    await AsyncStorage.setItem("quest_last_played_date", todayStr);
    await AsyncStorage.setItem(`quest_${questType}_status`, status);
  } catch (err) {
    console.error("[databaseService] saveQuestStatus failed:", err);
  }
}

/**
 * Fetches claimed rewards from Supabase user_rewards and syncs to AsyncStorage
 */
export async function syncUserRewards(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: rewards, error } = await supabase
      .from("user_rewards")
      .select("*")
      .eq("user_id", session.user.id);

    if (error) {
      console.warn("[databaseService] Error fetching user rewards:", error.message);
      return;
    }

    if (rewards) {
      const cReward = rewards.find(r => r.reward_type === "coupon_1k");
      const rReward = rewards.find(r => r.reward_type === "recharge_50k");

      if (cReward) {
        await AsyncStorage.setItem("reward_coupon_claimed", "true");
        await AsyncStorage.setItem("reward_coupon_code", cReward.reward_value);
      } else {
        await AsyncStorage.setItem("reward_coupon_claimed", "false");
        await AsyncStorage.removeItem("reward_coupon_code");
      }

      if (rReward) {
        await AsyncStorage.setItem("reward_recharge_claimed", "true");
        await AsyncStorage.setItem("reward_recharge_phone", rReward.reward_value);
      } else {
        await AsyncStorage.setItem("reward_recharge_claimed", "false");
        await AsyncStorage.removeItem("reward_recharge_phone");
      }
    }
  } catch (err) {
    console.error("[databaseService] syncUserRewards failed:", err);
  }
}

/**
 * Saves details of a played quiz/puzzle in the Supabase user_played_quizzes table
 */
export async function savePlayedQuiz(params: {
  puzzleId: string;
  category: string;
  difficulty: string;
  mode: string;
  question: string;
  answer: string;
  usedHint: boolean;
  revealedAnswer: boolean;
  coinsEarned: number;
  userAnswer?: string;
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from("user_played_quizzes")
      .insert({
        user_id: session.user.id,
        puzzle_id: params.puzzleId,
        category: params.category,
        difficulty: params.difficulty,
        mode: params.mode,
        question: params.question,
        answer: params.answer,
        used_hint: params.usedHint,
        revealed_answer: params.revealedAnswer,
        coins_earned: params.coinsEarned,
        user_answer: params.userAnswer || ""
      });

    if (error) {
      console.warn("[databaseService] Error saving played quiz:", error.message);
    }
  } catch (err) {
    console.error("[databaseService] savePlayedQuiz failed:", err);
  }
}

/**
 * Fetches all played quizzes history for the logged-in user from the database
 */
export async function fetchPlayedQuizzes(): Promise<any[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data, error } = await supabase
      .from("user_played_quizzes")
      .select("*")
      .eq("user_id", session.user.id)
      .order("played_at", { ascending: false });

    if (error) {
      console.warn("[databaseService] Error fetching played quizzes:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[databaseService] fetchPlayedQuizzes failed:", err);
    return [];
  }
}

/**
 * Records daily streak claim date and count in the Supabase user_daily_streaks table
 */
export async function recordDailyStreakLogin(streakCount: number): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { error } = await supabase
      .from("user_daily_streaks")
      .insert({
        user_id: session.user.id,
        login_date: todayStr,
        streak_count: streakCount
      });

    if (error && !error.message.includes("duplicate key")) {
      console.warn("[databaseService] Error saving daily streak login:", error.message);
    }
  } catch (err) {
    console.error("[databaseService] recordDailyStreakLogin failed:", err);
  }
}

/**
 * Saves a solved puzzle to user_solved_puzzles in Supabase, ignoring duplicate key/FK errors.
 */
export async function saveSolvedPuzzle(puzzleId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from("user_solved_puzzles")
      .insert({
        user_id: session.user.id,
        puzzle_id: puzzleId,
      });

    if (error && !error.message.includes("duplicate key")) {
      console.warn("[databaseService] Error saving solved puzzle:", error.message);
    }
  } catch (err) {
    console.error("[databaseService] saveSolvedPuzzle failed:", err);
  }
}

/**
 * Fetches max category limits from the database.
 * NOTE: The `category_limits` table is not yet created in Supabase — returns {} silently.
 */
export async function fetchCategoryLimits(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("category_limits")
      .select("category, max_limit");

    // Table may not exist yet — fail silently without spamming the console
    if (error) {
      return {};
    }

    const limits: Record<string, number> = {};
    if (data) {
      for (const row of data) {
        if (row.category && row.max_limit) {
          limits[row.category] = row.max_limit;
        }
      }
    }
    return limits;
  } catch (err) {
    // Silently ignore — table is not yet deployed
    return {};
  }
}

/**
 * Logs a rewarded/interstitial ad view in Supabase user_ads_watched table
 */
export async function recordAdWatched(
  adType: "rewarded" | "interstitial" | "banner",
  placement: string
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from("user_ads_watched")
      .insert({
        user_id: session.user.id,
        ad_type: adType,
        placement: placement,
      });

    if (error) {
      console.warn("[databaseService] Error saving ad watch log:", error.message);
    }
  } catch (err) {
    console.error("[databaseService] recordAdWatched failed:", err);
  }
}

export interface UserStoryChapter {
  id: string;
  user_id: string;
  chapter_id: number;
  title: string;
  hindi_title: string;
  narrative: string;
  puzzle_id: string;
  category: string;
  difficulty: string;
  question: string;
  answer: string;
  hint: string;
  language: string;
  solved: boolean;
  created_at: string;
}

/**
 * Fetches all story chapters generated for this user from Supabase and syncs with AsyncStorage
 */
export async function fetchUserStoryChapters(): Promise<UserStoryChapter[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Local fallback
      const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
      return cached ? JSON.parse(cached) : [];
    }

    const { data, error } = await supabase
      .from("user_story_chapters")
      .select("*")
      .eq("user_id", session.user.id)
      .order("chapter_id", { ascending: true });

    if (error) {
      console.warn("[databaseService] Error fetching user story chapters:", error.message);
      const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
      return cached ? JSON.parse(cached) : [];
    }

    if (data) {
      await AsyncStorage.setItem("shabdgyan_user_story_chapters", JSON.stringify(data));
      return data as UserStoryChapter[];
    }
    return [];
  } catch (err) {
    console.error("[databaseService] fetchUserStoryChapters failed:", err);
    try {
      const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Fetches a single user story chapter by chapter number
 */
export async function fetchUserStoryChapter(chapterId: number): Promise<UserStoryChapter | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
      if (cached) {
        const chapters: UserStoryChapter[] = JSON.parse(cached);
        return chapters.find(c => c.chapter_id === chapterId) || null;
      }
      return null;
    }

    const { data, error } = await supabase
      .from("user_story_chapters")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("chapter_id", chapterId)
      .maybeSingle();

    if (error) {
      console.warn("[databaseService] Error fetching user story chapter:", error.message);
      return null;
    }

    return data as UserStoryChapter | null;
  } catch (err) {
    console.error("[databaseService] fetchUserStoryChapter failed:", err);
    return null;
  }
}

/**
 * Saves a new AI-generated story chapter
 */
export async function saveUserStoryChapter(chapter: Omit<UserStoryChapter, "id" | "user_id" | "solved" | "created_at">): Promise<UserStoryChapter | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const mockId = Math.random().toString(36).substring(7);
    const mockUserId = session?.user?.id || "anonymous";

    const newChapter: UserStoryChapter = {
      ...chapter,
      id: mockId,
      user_id: mockUserId,
      solved: false,
      created_at: new Date().toISOString()
    };

    if (session?.user) {
      const { data, error } = await supabase
        .from("user_story_chapters")
        .insert({
          user_id: session.user.id,
          chapter_id: chapter.chapter_id,
          title: chapter.title,
          hindi_title: chapter.hindi_title,
          narrative: chapter.narrative,
          puzzle_id: chapter.puzzle_id,
          category: chapter.category,
          difficulty: chapter.difficulty,
          question: chapter.question,
          answer: chapter.answer,
          hint: chapter.hint,
          language: chapter.language,
          solved: false
        })
        .select()
        .single();

      if (error) {
        console.warn("[databaseService] Error saving user story chapter:", error.message);
      } else if (data) {
        // Update local cache
        const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
        const chapters: UserStoryChapter[] = cached ? JSON.parse(cached) : [];
        const index = chapters.findIndex(c => c.chapter_id === chapter.chapter_id);
        if (index !== -1) {
          chapters[index] = data;
        } else {
          chapters.push(data);
        }
        await AsyncStorage.setItem("shabdgyan_user_story_chapters", JSON.stringify(chapters));
        return data as UserStoryChapter;
      }
    }

    // Offline / Anonymous Save
    const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
    const chapters: UserStoryChapter[] = cached ? JSON.parse(cached) : [];
    const index = chapters.findIndex(c => c.chapter_id === chapter.chapter_id);
    if (index !== -1) {
      chapters[index] = newChapter;
    } else {
      chapters.push(newChapter);
    }
    await AsyncStorage.setItem("shabdgyan_user_story_chapters", JSON.stringify(chapters));
    return newChapter;
  } catch (err) {
    console.error("[databaseService] saveUserStoryChapter failed:", err);
    return null;
  }
}

/**
 * Marks a user story chapter as solved
 */
export async function markUserStoryChapterSolved(chapterId: number): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Sync solved list in general solvedIds
    const puzzleId = `story_ch_${chapterId}`;
    await saveSolvedPuzzle(puzzleId);

    if (session?.user) {
      const { error } = await supabase
        .from("user_story_chapters")
        .update({ solved: true })
        .eq("user_id", session.user.id)
        .eq("chapter_id", chapterId);

      if (error) {
        console.warn("[databaseService] Error marking user story chapter solved:", error.message);
      }
    }

    // Update local cache
    const cached = await AsyncStorage.getItem("shabdgyan_user_story_chapters");
    if (cached) {
      const chapters: UserStoryChapter[] = JSON.parse(cached);
      const index = chapters.findIndex(c => c.chapter_id === chapterId);
      if (index !== -1) {
        chapters[index].solved = true;
        await AsyncStorage.setItem("shabdgyan_user_story_chapters", JSON.stringify(chapters));
      }
    }

    // Also update solved list cached in AsyncStorage shabdgyan_solved_ids
    const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");
    const solvedIds = solvedIdsStr ? JSON.parse(solvedIdsStr) : [];
    if (!solvedIds.includes(puzzleId)) {
      solvedIds.push(puzzleId);
      await AsyncStorage.setItem("shabdgyan_solved_ids", JSON.stringify(solvedIds));
    }
  } catch (err) {
    console.error("[databaseService] markUserStoryChapterSolved failed:", err);
  }
}


