import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    // Await params because in Next.js 15 they are promises in some contexts or to be safe
    const { slug } = await params

    try {
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('slug', slug)
            .single()

        if (error) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })

        return NextResponse.json(data)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
