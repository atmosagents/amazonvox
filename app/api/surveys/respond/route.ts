import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { survey_id, respondent_data, latitude, longitude, origin_source } = body

        if (!survey_id || !respondent_data) {
            return NextResponse.json({ error: 'Survey ID and Data are required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('survey_responses')
            .insert([
                {
                    survey_id,
                    respondent_data,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    origin_source: origin_source || 'direct'
                }
            ])
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data }, { status: 201 })

    } catch (e: any) {
        console.error('Survey Response Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
