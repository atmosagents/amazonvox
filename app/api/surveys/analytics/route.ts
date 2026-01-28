import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const surveyIdParam = searchParams.get('survey_id')

        let surveyId = surveyIdParam

        // If no ID provided, get the most recent active survey
        if (!surveyId) {
            const { data: recentSurvey } = await supabase
                .from('surveys')
                .select('id')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (recentSurvey) surveyId = recentSurvey.id
        }

        if (!surveyId) {
            return NextResponse.json({ error: 'Nenhuma pesquisa encontrada' }, { status: 404 })
        }

        // 1. Fetch Survey Schema
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', surveyId)
            .single()

        if (surveyError || !survey) {
            return NextResponse.json({ error: 'Erro ao buscar pesquisa' }, { status: 500 })
        }

        // 2. Fetch Responses
        const { data: responses, error: respError } = await supabase
            .from('survey_responses')
            .select('*')
            .eq('survey_id', surveyId)
            .order('created_at', { ascending: false })

        if (respError) {
            return NextResponse.json({ error: 'Erro ao buscar respostas' }, { status: 500 })
        }

        // 3. Process Data
        const total = responses.length
        const geo_data: any[] = []
        const rawAnswers: Record<string, any[]> = {}

        // Initialize raw collections based on schema
        survey.questions_schema.forEach((q: any) => {
            rawAnswers[q.label] = []
        })

        responses.forEach((r: any) => {
            // Geo Data
            if (r.latitude && r.longitude) {
                geo_data.push({
                    lat: r.latitude,
                    lng: r.longitude,
                    summary: r.respondent_data
                })
            }

            // Aggregate Answers
            Object.keys(r.respondent_data).forEach(key => {
                if (rawAnswers[key]) {
                    rawAnswers[key].push(r.respondent_data[key])
                }
            })
        })

        // 4. Build Charts
        const charts: any[] = []

        survey.questions_schema.forEach((q: any) => {
            const answers = rawAnswers[q.label] || []

            if (q.type === 'select' || q.type === 'radio' || q.type === 'dropdown') {
                const counts: Record<string, number> = {}
                answers.forEach(a => {
                    const k = String(a)
                    counts[k] = (counts[k] || 0) + 1
                })

                charts.push({
                    id: q.id,
                    title: q.label,
                    type: 'pie', // Frontend decides implementation
                    labels: Object.keys(counts),
                    data: Object.values(counts)
                })
            } else if (q.type === 'scale') {
                const counts: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
                let sum = 0
                let valid = 0

                answers.forEach(a => {
                    const val = parseInt(String(a))
                    if (!isNaN(val) && val >= 1 && val <= 5) {
                        counts[String(val)] = (counts[String(val)] || 0) + 1
                        sum += val
                        valid++
                    }
                })

                charts.push({
                    id: q.id,
                    title: q.label,
                    type: 'bar',
                    average: valid > 0 ? (sum / valid).toFixed(1) : 0,
                    labels: ["1", "2", "3", "4", "5"],
                    data: ["1", "2", "3", "4", "5"].map(k => counts[k])
                })
            } else if (q.type === 'text') {
                charts.push({
                    id: q.id,
                    title: q.label,
                    type: 'list',
                    data: answers.slice(0, 5) // Last 5
                })
            }
        })

        return NextResponse.json({
            meta: {
                title: survey.title,
                total,
                last_updated: new Date().toISOString()
            },
            geo_data,
            charts
        })

    } catch (e: any) {
        console.error('Analytics Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
