import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, description, questions_schema, slug } = body

        if (!title || !questions_schema) {
            return NextResponse.json({ error: 'Title and Questions Schema are required' }, { status: 400 })
        }

        // Generate slug if not provided
        const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7)

        const { data, error } = await supabase
            .from('surveys')
            .insert([
                {
                    title,
                    description,
                    slug: finalSlug,
                    questions_schema
                }
            ])
            .select()
            .single()

        if (error) {
            if (error.code === '23505') { // Unique violation for slug
                return NextResponse.json({ error: 'Slug already exists. Please choose another.' }, { status: 409 })
            }
            throw error
        }

        return NextResponse.json({ success: true, data }, { status: 201 })

    } catch (e: any) {
        console.error('Create Survey Error:', e)
        return NextResponse.json({ error: e.message || 'Error creating survey' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        // Inject Legacy Option
        const legacy = {
            id: 'legacy',
            title: 'Pesquisa Original (Legado)',
            slug: 'legacy',
            description: 'Dados históricos da tabela original',
            questions_schema: [],
            created_at: new Date(0).toISOString(), // Oldest
            active: true
        }

        const combined = [legacy, ...(data || [])]

        return NextResponse.json(combined)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
