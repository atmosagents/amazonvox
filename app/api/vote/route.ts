import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client (using service role if needed for RLS bypass, but anon is fine for now if policies allow)
// NOTE: Ideally use CreateClient from @supabase/ssr in a real app, but sticking to simple client for this task
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const candidate_id = formData.get('candidate_id')
        const lat = formData.get('lat')
        const lng = formData.get('lng')

        // 2. Recebimento dos Novos Dados Pessoais
        const name = formData.get('voter_name')?.toString().trim()
        const rawCpf = formData.get('voter_cpf')?.toString() || ''
        const rawWhatsapp = formData.get('voter_whatsapp')?.toString() || ''

        const cpf = rawCpf.replace(/[^0-9]/g, '')
        const whatsapp = rawWhatsapp.replace(/[^0-9]/g, '')

        // --- Novos Campos de Inteligência ---
        const gender = formData.get('voter_gender')?.toString() || null
        const age = formData.get('voter_age_range')?.toString() || null
        const concern = formData.get('main_concern')?.toString() || null
        const certainty = Number(formData.get('vote_certainty') || 3)
        // Checkbox vem como 'on' se marcado, ou null se não
        const is_volunteer = formData.get('is_volunteer') === 'on'

        // 3. Validação Rigorosa
        const errors: string[] = []
        if (!candidate_id || !lat || !lng) errors.push('Localização e candidato são obrigatórios.')
        if (!name || name.length < 3) errors.push('Digite um nome válido.')
        if (cpf.length !== 11) errors.push('CPF inválido (necessário 11 dígitos).')
        if (whatsapp.length < 10 || whatsapp.length > 11) errors.push('WhatsApp inválido (DDD + Número).')

        if (errors.length > 0) {
            return NextResponse.json({ success: false, message: errors.join(' ') }, { status: 400 })
        }

        // Get IP (naive approach for Next.js, in production use headers like x-forwarded-for)
        // Next.js doesn't expose IP directly easily in App Router without middleware or headers
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

        const { error } = await supabase
            .from('vote_intentions')
            .insert([
                {
                    candidate_id: Number(candidate_id),
                    latitude: parseFloat((lat ?? '').toString()),
                    longitude: parseFloat((lng ?? '').toString()),
                    ip_address: ip,
                    voter_name: name,
                    voter_cpf: cpf,
                    voter_whatsapp: whatsapp,
                    voter_gender: gender,
                    voter_age_range: age,
                    voter_education: formData.get('voter_education')?.toString() || null,
                    voter_income: formData.get('voter_income')?.toString() || null,
                    main_concern: concern,
                    vote_certainty: certainty,
                    is_volunteer: is_volunteer
                },
            ])

        if (error) {
            console.error('Supabase error:', error)
            // Check for duplicate CPF if constraint exists (Supabase returns code 23505 for unique violation)
            if (error.code === '23505') {
                return NextResponse.json({ success: false, message: 'Este CPF já registrou um voto.' }, { status: 400 })
            }
            return NextResponse.json({ success: false, message: 'Erro ao salvar voto.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Voto e dados registrados com sucesso!' })
    } catch (e) {
        console.error('Server error:', e)
        return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 })
    }
}
