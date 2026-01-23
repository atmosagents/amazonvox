'use client'

import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function VotePage() {
  const [loading, setLoading] = useState(false)

  // -- STATES --
  const [candidate, setCandidate] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const [gender, setGender] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [concern, setConcern] = useState('')
  const [certainty, setCertainty] = useState(3)
  const [isVolunteer, setIsVolunteer] = useState(false)

  // -- HANDLERS --
  const handleCpfChange = (val: string) => {
    let v = val.replace(/\D/g, '')
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    if (v.length <= 14) setCpf(v)
  }

  const handleWhatsappChange = (val: string) => {
    let v = val.replace(/\D/g, '')
    v = v.replace(/^(\d{2})(\d)/, '($1) $2')
    v = v.replace(/(\d)(\d{4})$/, '$1-$2')
    if (v.length <= 15) setWhatsapp(v)
  }

  const handleVote = async () => {
    const rawCpf = cpf.replace(/\D/g, '')
    const rawWa = whatsapp.replace(/\D/g, '')

    if (!name || rawCpf.length !== 11 || rawWa.length < 10 || !candidate) {
      alert('Por favor, preencha nome, CPF, WhatsApp e escolha um candidato.')
      return
    }

    setLoading(true)

    if (!navigator.geolocation) {
      alert('Seu dispositivo não suporta geolocalização.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toString()
        const lng = position.coords.longitude.toString()

        const formData = new FormData()
        formData.append('candidate_id', candidate)
        formData.append('lat', lat)
        formData.append('lng', lng)
        formData.append('voter_name', name)
        formData.append('voter_cpf', cpf)
        formData.append('voter_whatsapp', whatsapp)
        formData.append('voter_gender', gender)
        formData.append('voter_age_range', ageRange)
        formData.append('main_concern', concern)
        formData.append('vote_certainty', certainty.toString())
        if (isVolunteer) formData.append('is_volunteer', 'on')

        try {
          const res = await fetch('/api/vote', {
            method: 'POST',
            body: formData,
          })

          const data = await res.json()

          if (data.success) {
            alert(data.message)
            // Reset
            setCandidate(null)
            setName('')
            setCpf('')
            setWhatsapp('')
            setCertainty(3)
            setIsVolunteer(false)
            setConcern('')
            setGender('')
            setAgeRange('')
          } else {
            alert(data.message || 'Erro ao votar.')
          }
        } catch (e) {
          alert('Erro de conexão.')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        let msg = error.code === 1 ? 'Você negou a permissão de localização.' : 'Não foi possível obter sua posição.'
        alert(msg)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Toggle Dark Mode Helper
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark')
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        
        body { font-family: 'Inter', sans-serif; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        
        /* Custom Range Slider */
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            background: #4338CA;
            cursor: pointer;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
      `}</style>

      <div className="font-sans bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center">
        <main className="w-full max-w-[430px] bg-white dark:bg-slate-900 min-h-screen shadow-2xl relative overflow-hidden flex flex-col">

          {/* HEADER */}
          <header className="bg-[#1E1B4B] pt-16 pb-12 px-8 rounded-b-[40px] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute top-20 -right-10 w-32 h-32 bg-[#4338CA] rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white tracking-tight">Vox Eleições</h1>
              <p className="text-slate-300 mt-2 text-sm font-light">Participe da pesquisa estratégica. Seus dados estão protegidos.</p>
            </div>
          </header>

          <div className="flex-1 px-6 -mt-8 pb-10 space-y-8 relative z-20">

            {/* DADOS */}
            <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#4338CA] text-xl">account_circle</span>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Seus Dados</h2>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-[#4338CA] focus:border-[#4338CA] transition-all text-sm outline-none"
                    placeholder="Nome Completo"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-[#4338CA] focus:border-[#4338CA] transition-all text-sm outline-none"
                    placeholder="CPF"
                    type="tel"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                  />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-[#4338CA] focus:border-[#4338CA] transition-all text-sm outline-none"
                    placeholder="WhatsApp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Gênero</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm appearance-none outline-none"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Faixa Etária</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm appearance-none outline-none"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="16-24">16 a 24 anos</option>
                    <option value="25-44">25 a 34 anos</option>
                    <option value="35-44">35 a 44 anos</option>
                    <option value="45-59">45 a 59 anos</option>
                    <option value="60+">60+ anos</option>
                  </select>
                </div>
              </div>
            </section>

            {/* DORES */}
            <section>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 px-1">Qual o maior problema do seu bairro hoje?</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Saude', label: 'Saúde', icon: 'medical_services' },
                  { id: 'Seguranca', label: 'Segurança', icon: 'security' },
                  { id: 'Educacao', label: 'Educação', icon: 'school' },
                  { id: 'Infraestrutura', label: 'Asfalto', icon: 'construction' },
                  { id: 'Emprego', label: 'Emprego', icon: 'work' },
                  { id: 'Outros', label: 'Outros', icon: 'more_horiz' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setConcern(item.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${concern === item.id
                        ? 'border-[#4338CA] bg-indigo-50 dark:bg-indigo-900/20 text-[#4338CA]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#4338CA] hover:text-[#4338CA] text-slate-400'
                      }`}
                  >
                    <span className="material-symbols-outlined mb-1">{item.icon}</span>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* VOTO */}
            <section>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 px-1 text-center">Sua intenção de voto</h3>
              <div className="grid grid-cols-2 gap-4">

                {/* CANDIDATO 1 */}
                <div onClick={() => setCandidate('1')} className="relative group cursor-pointer">
                  <div className={`absolute inset-0 bg-blue-500 opacity-0 rounded-2xl transition-all ${candidate === '1' ? 'opacity-10' : 'group-hover:opacity-5'}`}></div>
                  <div className={`bg-white dark:bg-slate-800 border p-4 rounded-2xl text-center shadow-sm transition-all border-b-4 ${candidate === '1' ? 'border-blue-500 border-t-2 border-x-2' : 'border-slate-200 dark:border-slate-700 border-b-blue-500'}`}>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden relative">
                      <span className="material-symbols-outlined text-blue-600 text-4xl">person_pin</span>
                      {candidate === '1' && <div className="absolute top-0 right-0 bg-blue-500 text-white rounded-full p-1 leading-none"><span className="material-symbols-outlined text-[12px]">check</span></div>}
                    </div>
                    <p className="text-blue-700 dark:text-blue-400 font-bold text-sm">Candidato Azul</p>
                    <p className="text-[10px] text-slate-400">Partido Liberal</p>
                  </div>
                </div>

                {/* CANDIDATO 2 */}
                <div onClick={() => setCandidate('2')} className="relative group cursor-pointer">
                  <div className={`absolute inset-0 bg-emerald-500 opacity-0 rounded-2xl transition-all ${candidate === '2' ? 'opacity-10' : 'group-hover:opacity-5'}`}></div>
                  <div className={`bg-white dark:bg-slate-800 border p-4 rounded-2xl text-center shadow-md transition-all border-b-4 ${candidate === '2' ? 'border-emerald-500 border-t-2 border-x-2' : 'border-slate-200 dark:border-slate-700 border-b-emerald-600'}`}>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mx-auto mb-3 flex items-center justify-center relative">
                      <span className="material-symbols-outlined text-emerald-600 text-4xl">person_pin</span>
                      {candidate === '2' && <div className="absolute top-0 right-0 bg-emerald-500 text-white rounded-full p-1 leading-none"><span className="material-symbols-outlined text-[12px]">check</span></div>}
                    </div>
                    <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Candidato Verde</p>
                    <p className="text-[10px] text-slate-400">Frente Democrática</p>
                  </div>
                </div>

              </div>
            </section>

            {/* CERTEZA */}
            <section className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center mb-6">Quão certo você está? ({certainty})</h3>
              <div className="relative px-2">
                <input
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4338CA]"
                  max="5" min="1" step="1" type="range"
                  value={certainty}
                  onChange={(e) => setCertainty(Number(e.target.value))}
                />
                <div className="flex justify-between mt-3 text-[10px] font-semibold text-slate-400 px-1 uppercase">
                  <span>Indeciso</span>
                  <span className="text-[#4338CA] text-sm">{certainty}</span>
                  <span>Absoluta</span>
                </div>
              </div>
            </section>

            {/* VOLUNTARIO */}
            <label className="flex items-center gap-4 bg-[#4338CA]/5 dark:bg-[#4338CA]/10 p-4 rounded-xl border border-[#4338CA]/20 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-[#4338CA] text-[#4338CA] focus:ring-[#4338CA] focus:ring-offset-0 bg-white dark:bg-slate-800"
                  checked={isVolunteer}
                  onChange={(e) => setIsVolunteer(e.target.checked)}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#4338CA] transition-colors">
                Quero receber material e ajudar na campanha!
              </span>
            </label>

            <button
              onClick={handleVote}
              disabled={loading}
              className="w-full py-4 bg-[#4338CA] hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-[#4338CA]/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Enviando Voto...' : 'Confirmar e Enviar Pesquisa'}</span>
              <span className="material-symbols-outlined text-lg">send</span>
            </button>

            <footer className="text-center pb-8">
              <p className="text-[10px] text-slate-400">© 2024 Vox Eleições. Pesquisa Registrada no TSE.</p>
            </footer>
          </div>
        </main>

        {/* DARK TOGGLE */}
        <button
          className="fixed bottom-6 right-6 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center z-50 hover:scale-110 transition"
          onClick={toggleDarkMode}
        >
          <span className="material-symbols-outlined dark:hidden text-slate-800">dark_mode</span>
          <span className="material-symbols-outlined hidden dark:block text-yellow-400">light_mode</span>
        </button>
      </div>
    </>
  )
}
