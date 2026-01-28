-- Tabela de Pesquisas (A "Receita" do formulário)
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL, -- Para URL amigável (ex: amazonvox.com/p/manaus-2026)
    questions_schema JSONB NOT NULL, -- Guarda a estrutura: [{"type":"text", "label":"Nome"}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Tabela de Respostas (Dados Flexíveis)
CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id),
    respondent_data JSONB NOT NULL, -- Guarda as respostas: {"q1": "Joao", "q2": "Wilson Lima"}
    latitude DECIMAL(10, 8),
    longitude DECIMAL(10, 8),
    origin_source TEXT DEFAULT 'direct', -- 'facebook', 'whatsapp', 'coletor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Creating policies to allow public access for now (for Demo purposes)
-- In production, 'surveys' creation should be restricted to authenticated users
CREATE POLICY "Public Read Surveys" ON surveys FOR SELECT USING (true);
CREATE POLICY "Public Insert Surveys" ON surveys FOR INSERT WITH CHECK (true);

-- Responses policies
CREATE POLICY "Public Insert Responses" ON survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Responses" ON survey_responses FOR SELECT USING (true);
