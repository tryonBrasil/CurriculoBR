/*
  # Sistema de Múltiplos Currículos e Compartilhamento

  1. New Tables
    - `user_profiles`: Dados adicionais do usuário
    - `resumes`: Armazena múltiplos currículos por usuário
    - `public_shares`: Links públicos para compartilhar currículos

  2. Security
    - Enable RLS em todas as tabelas
    - Usuários só podem ver seus próprios currículos
    - Links públicos são acessíveis para qualquer um
    - Policies para inserção, atualização e deleção

  3. Indexes
    - Índice em (user_id) para buscas rápidas
    - Índice em (share_token) para compartilhamento público
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Novo Currículo',
  data jsonb NOT NULL,
  template text DEFAULT 'modern_blue',
  font_size numeric DEFAULT 12,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, title)
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_resumes_user_id ON resumes(user_id);

CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_public_shares_token ON public_shares(share_token);
CREATE INDEX idx_public_shares_user_id ON public_shares(user_id);

CREATE POLICY "Anyone can view public shares by token"
  ON public_shares FOR SELECT
  USING (true);

CREATE POLICY "Users can create own public shares"
  ON public_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own public shares"
  ON public_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
