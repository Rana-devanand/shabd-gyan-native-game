-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT,
    avatar TEXT DEFAULT '🧔🏽‍♂️',
    language TEXT,
    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    sound_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    difficulty_preference TEXT DEFAULT 'Easy' CHECK (difficulty_preference IN ('Easy', 'Medium', 'Hard', 'Super Hard')),
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    streak INTEGER DEFAULT 0 NOT NULL,
    max_streak INTEGER DEFAULT 0 NOT NULL,
    quest_claimed_bonus BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Apply trigger for updating updated_at timestamp on profiles
CREATE OR REPLACE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger function to automatically create a profile when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname, avatar, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.raw_user_meta_data->>'name', 'Player'),
        COALESCE(NEW.raw_user_meta_data->>'avatar', '🧔🏽‍♂️'),
        'USER'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
