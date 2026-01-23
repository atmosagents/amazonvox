import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
    try {
        // Fetch last 1000 votes with full details
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
