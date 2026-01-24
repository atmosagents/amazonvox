-- Adiciona colunas socioeconomicas na tabela de intencao de votos
ALTER TABLE vote_intentions
ADD COLUMN IF NOT EXISTS voter_education text, -- Ex: Medio Completo, Superior
ADD COLUMN IF NOT EXISTS voter_income text;    -- Ex: 1-3 salarios
