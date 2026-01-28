import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
    try {
        console.log('🔄 Iniciando Demo Seed: Manaus...')

        // 1. Limpa a tabela (Truncate Simulado com Delete sem filtro)
        // OBS: Para TRUNCATE real ou DELETE sem Where, o Supabase exige permissão.
        // Se a policy impedir, isso pode falhar. Assumindo que está liberado ou usando service_role.
        const { error: delError } = await supabase
            .from('vote_intentions')
            .delete()
            .neq('id', 0) // Delete all where ID is not 0 (effectively all)

        if (delError) throw new Error('Erro ao limpar tabela: ' + delError.message)

        // 2. Arrays de Dados
        const names = ["Cliente Teste 01", "Maria Silva", "João Santos", "Ana Pereira", "Carlos Oliveira", "Lucia Souza", "Marcos Lima", "Julia Costa"]
        const concerns = ["Seguranca", "Saude", "Educacao", "Infraestrutura", "Emprego"]
        const educations = ["Fundamental Incompleto", "Fundamental Completo", "Medio Completo", "Superior Completo", "Pos Graduacao"]
        const incomes = ["Ate 1 SM", "1 a 3 SM", "3 a 5 SM", "Acima de 10 SM"]

        // 3. Configurações
        const centerLat = -3.1190
        const centerLng = -60.0217
        const fixedPhone = '41985236910' // Fixo como pedido

        const rowsToInsert = []

        for (let i = 0; i < 50; i++) {
            // Dispersão 4km (aprox 0.04 graus)
            const latVar = (Math.random() * 0.08) - 0.04
            const lngVar = (Math.random() * 0.08) - 0.04

            const lat = centerLat + latVar
            const lng = centerLng + lngVar

            const name = names[Math.floor(Math.random() * names.length)] + " " + (i + 1)
            const concern = concerns[Math.floor(Math.random() * concerns.length)]
            const edu = educations[Math.floor(Math.random() * educations.length)]
            const inc = incomes[Math.floor(Math.random() * incomes.length)]

            const candidate_id = Math.random() < 0.5 ? 1 : 2
            const certainty = Math.floor(Math.random() * 4) + 2 // 2 to 5
            const is_volunteer = Math.random() > 0.7
            const gender = Math.random() < 0.5 ? 'M' : 'F'
            const ageRange = ['16-24', '25-44', '45-59', '60+'][Math.floor(Math.random() * 4)]

            rowsToInsert.push({
                candidate_id,
                latitude: lat,
                longitude: lng,
                voter_name: name,
                voter_cpf: '00000000000',
                voter_whatsapp: fixedPhone,
                voter_gender: gender,
                voter_age_range: ageRange,
                voter_education: edu,
                voter_income: inc,
                main_concern: concern,
                vote_certainty: certainty,
                is_volunteer: is_volunteer,
                ip_address: '127.0.0.1' // Demo IP
            })
        }

        const { error: insertError } = await supabase
            .from('vote_intentions')
            .insert(rowsToInsert)

        if (insertError) throw new Error('Erro ao inserir: ' + insertError.message)

        return new NextResponse(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #10B981;">✅ Demo Manaus Gerada!</h1>
                <p>Tabela limpa e 50 novos votos inseridos em Manaus.</p>
                <p><strong>WhatsApp Fixo:</strong> ${fixedPhone}</p>
                <div style="margin-top: 30px;">
                    <a href="/demo/dashboard" style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Acessar Dashboard Demo
                    </a>
                </div>
            </div>
        `, { headers: { 'content-type': 'text/html' } })

    } catch (e: any) {
        return new NextResponse(`<h1>❌ Erro: ${e.message}</h1>`, { headers: { 'content-type': 'text/html' } })
    }
}
