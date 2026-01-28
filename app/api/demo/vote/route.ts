import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            candidate_id,
            latitude,
            longitude,
            voter_whatsapp,
            voter_name,
            main_concern,
            vote_certainty,
            voter_gender,
            voter_age_range,
            voter_education,
            voter_income
        } = body

        // Basic Validation
        if (!candidate_id || !latitude || !longitude) {
            return NextResponse.json(
                { error: 'Missing required fields: candidate_id, latitude, longitude' },
                { status: 400 }
            )
        }

        // Insert into Supabase
        const { data, error } = await supabase
            .from('vote_intentions')
            .insert([
                {
                    candidate_id,
                    latitude,
                    longitude,
                    voter_whatsapp: voter_whatsapp || null,
                    voter_name: voter_name || 'Anonymous Demo Voter',
                    main_concern: main_concern || 'Not Specified',
                    vote_certainty: vote_certainty || 3,
                    voter_gender: voter_gender || null,
                    voter_age_range: voter_age_range || null,
                    voter_education: voter_education || null,
                    voter_income: voter_income || null,
                    ip_address: '127.0.0.1', // In a real app we'd get this from headers
                    is_volunteer: false
                }
            ])
            .select()

        if (error) {
            console.error('Supabase Insert Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Set a cookie to verify vote (optional, handled by frontend usually, but we can return success)
        return NextResponse.json({ success: true, data }, { status: 200 })

    } catch (e: any) {
        console.error('Server Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
