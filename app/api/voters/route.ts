import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const surveyId = searchParams.get('survey_id')

        // MODE 1: SaaS Survey Adapter. Explicitly check it's NOT legacy.
        if (surveyId && surveyId !== 'legacy') {
            // 1. Fetch Survey Schema to get Labels (Optional optimisation, but good for robust mapping)
            const { data: survey } = await supabase
                .from('surveys')
                .select('questions_schema')
                .eq('id', surveyId)
                .single()

            // 2. Fetch Responses
            const { data: responses, error } = await supabase
                .from('survey_responses')
                .select('*')
                .eq('survey_id', surveyId)
                .order('created_at', { ascending: false })
                .limit(1000)

            if (error) throw error

            // 3. Adapter Logic: Map Dynamic JSON to Fixed Dashboard Schema
            const voters = responses.map((r: any) => {
                const data = r.respondent_data || {}

                // Heuristics to find fields
                let candidate = 'Indeciso'
                let name = 'Anônimo'
                let concern = 'Não informado'
                let age = null
                let income = null
                let gender = null

                // Look for common keys in the JSON data
                for (const [key, value] of Object.entries(data)) {
                    const k = key.toLowerCase()
                    const v = String(value)

                    if (k.includes('candidato') || k.includes('opção') || k.includes('voto') || k.includes('escolha')) {
                        candidate = v
                    } else if (k.includes('nome')) {
                        name = v
                    } else if (k.includes('problema') || k.includes('dor') || k.includes('melhoria')) {
                        concern = v
                    } else if (k.includes('idade') || k.includes('anos')) {
                        age = v
                    } else if (k.includes('renda') || k.includes('ganha')) {
                        income = v
                    } else if (k.includes('sexo') || k.includes('gênero')) {
                        gender = v
                    }
                }

                // If candidate wasn't found by name, take the first select/radio value if available? 
                // For now, let's trust the heuristics.

                return {
                    id: r.id,
                    voter_name: name,
                    candidate_id: candidate, // Important: Dashboard expects this
                    main_concern: concern,
                    age_range: age,
                    gender: gender,
                    income_range: income,
                    latitude: r.latitude,
                    longitude: r.longitude,
                    created_at: r.created_at
                }
            })

            return NextResponse.json(voters)
        }

        // MODE 2: Legacy / Default (Vote Intentions Table)
        const { data: voters, error } = await supabase
            .from('vote_intentions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000)

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
        }

        return NextResponse.json(voters)
    } catch (e) {
        console.error('Server error:', e)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
