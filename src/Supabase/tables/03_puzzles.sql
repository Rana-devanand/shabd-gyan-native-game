-- Create puzzles table
CREATE TABLE IF NOT EXISTS public.puzzles (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    clue TEXT NOT NULL,
    answer TEXT NOT NULL,
    decoys TEXT[] NOT NULL DEFAULT '{}',
    hint TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Super Hard')),
    mode TEXT DEFAULT 'shabd' CHECK (mode IN ('shabd', 'paheli')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
