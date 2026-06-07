-- Create user_solved_puzzles table
CREATE TABLE IF NOT EXISTS public.user_solved_puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    puzzle_id TEXT NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
    solved_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, puzzle_id)
);
