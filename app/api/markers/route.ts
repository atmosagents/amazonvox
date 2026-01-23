import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
    try {
        const { data: votes, error } = await supabase
            .from('vote_intentions')
            .select('candidate_id, latitude, longitude')

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json([])
        }

        return NextResponse.json(votes)
    } catch (e) {
        console.error('Server error:', e)
        return NextResponse.json([])
    }
}
