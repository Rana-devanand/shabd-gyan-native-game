// Supabase Edge Function — sync-game-data
// Deno runtime (TypeScript)
//
// PURPOSE:
//   Server-side validation endpoint. Called from the app after a puzzle is
//   solved to verify the answer and award XP, preventing client-side score
//   manipulation.
//
// DEPLOY:
//   supabase functions deploy sync-game-data
//
// ENVIRONMENT VARIABLES (set in Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL          — Your project URL
//   SUPABASE_SERVICE_KEY  — Service role key (server-side only, never expose to client)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_KEY") ?? ""
    );

    // Extract user JWT from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { puzzle_id, answer, points, reason } = body;

    // --------------------------------------------------------
    // TODO: Add server-side answer verification here
    // Example: fetch puzzle from DB and compare answer
    // const { data: puzzle } = await supabase
    //   .from("puzzles")
    //   .select("answer")
    //   .eq("id", puzzle_id)
    //   .single();
    //
    // if (puzzle.answer.toUpperCase() !== answer.toUpperCase()) {
    //   return new Response(JSON.stringify({ error: "Wrong answer" }), { status: 400 });
    // }
    // --------------------------------------------------------

    // Call the solve_puzzle_and_reward RPC
    const { data, error } = await supabase.rpc("solve_puzzle_and_reward", {
      p_user_id:   user.id,
      p_puzzle_id: puzzle_id,
      p_points:    points ?? 100,
      p_reason:    reason ?? "puzzle_solved",
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, profile: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
