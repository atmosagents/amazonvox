'use client'

import { useState, useEffect, Suspense } from 'react'
import Head from 'next/head'
import { useSearchParams } from 'next/navigation'

function VotePageContent() {
  const searchParams = useSearchParams()
  const surveyIdParam = searchParams?.get('surveyId')

  const [loading, setLoading] = useState(true)
  const [survey, setSurvey] = useState<any>(null)

  // -- DYNAMIC STATE --
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)

  // -- INIT FETCH --
  useEffect(() => {
    fetchSurvey()
  }, [surveyIdParam])

  const fetchSurvey = async () => {
    try {
      if (surveyIdParam) {
        // Fetch specific by ID (requires a route, but for now we fetch all and filter)
        const res = await fetch('/api/surveys')
        const data = await res.json()
        const found = data.find((s: any) => s.id.toString() === surveyIdParam)
        if (found) setSurvey(found)
        else setError('Pesquisa não encontrada.')
      } else {
        // Auto-load most recent survey
        const res = await fetch('/api/surveys')
        const data = await res.json()
        const activeSurveys = data.filter((s: any) => s.id !== 'legacy' && s.active !== false)
        if (activeSurveys.length > 0) {
          setSurvey(activeSurveys[0])
        } else {
          setError('Nenhuma pesquisa ativa encontrada no momento.')
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const [error, setError] = useState('')

  // -- HANDLERS --
  const handleAnswer = (questionName: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionName]: value }))
  }

  const handleVote = async () => {
    setSubmitting(true)

    if (!navigator.geolocation) {
      alert('Seu dispositivo não suporta geolocalização. Necessário para enviar os dados de campo.')
      setSubmitting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        try {
          const res = await fetch('/api/surveys/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              survey_id: survey.id,
              respondent_data: answers,
              latitude: lat,
              longitude: lng,
              origin_source: 'coletor_web'
            })
          })

          const data = await res.json()

          if (data.success) {
            alert("Resposta enviada com sucesso!")
            // Reset
            setAnswers({})
            window.scrollTo(0, 0)
          } else {
            alert(data.error || 'Erro ao salvar resposta no banco de dados.')
          }
        } catch (e) {
          alert('Erro de conexão ao servidor.')
        } finally {
          setSubmitting(false)
        }
      },
      (geoError) => {
        let msg = geoError.code === 1 ? 'Você negou a permissão de localização. Libere o GPS no navegador.' : 'Não foi possível obter sua posição GPS.'
        alert(msg)
        setSubmitting(false)
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
          <header className="bg-[#1E1B4B] pt-16 pb-12 px-8 rounded-b-[40px] text-center relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute top-20 -right-10 w-32 h-32 bg-[#4338CA] rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white tracking-tight">{survey?.title || 'Pesquisa'}</h1>
              <p className="text-slate-300 mt-2 text-sm font-light">{survey?.description || 'Participe de nossa pesquisa estratégica.'}</p>
            </div>
          </header>

          <div className="flex-1 px-6 -mt-8 pb-10 space-y-8 relative z-20">

            {loading ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-[#4338CA] text-4xl mb-4">refresh</span>
                <p className="text-slate-500">Carregando formulário...</p>
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl text-center text-red-500 border border-red-200">
                <span className="material-symbols-outlined text-4xl mb-2">error</span>
                <p>{error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {survey?.questions_schema?.map((q: any, idx: number) => {
                  const type = (q.type || 'text').toLowerCase()
                  const qName = q.name || q.label || `q_${idx}`

                  // Common label
                  const QuestionLabel = () => (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#4338CA] text-xl">help_outline</span>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{q.label || q.title}</h3>
                    </div>
                  )

                  // 1. Text, Telephone, Email, Number
                  if (['text', 'tel', 'email', 'number', 'date', 'textarea'].includes(type)) {
                    return (
                      <section key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                        <QuestionLabel />
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-[#4338CA] focus:border-[#4338CA] transition-all text-sm outline-none placeholder:text-slate-400 dark:text-white"
                          type={type === 'textarea' ? 'text' : type}
                          placeholder={q.placeholder || 'Sua resposta...'}
                          required={q.required}
                          value={answers[qName] || ''}
                          onChange={(e) => handleAnswer(qName, e.target.value)}
                        />
                      </section>
                    )
                  }

                  // 2. Select / Dropdown
                  if (type === 'select' || type === 'dropdown') {
                    const opts = q.options || q.choices || []
                    return (
                      <section key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                        <QuestionLabel />
                        <select
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:ring-[#4338CA] focus:border-[#4338CA] dark:text-white"
                          required={q.required}
                          value={answers[qName] || ''}
                          onChange={(e) => handleAnswer(qName, e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {opts.map((opt: any, i: number) => {
                            const val = typeof opt === 'string' ? opt : opt.value
                            const label = typeof opt === 'string' ? opt : opt.label
                            return <option key={i} value={val}>{label}</option>
                          })}
                        </select>
                      </section>
                    )
                  }

                  // 3. Radio / Multiple Choice (Cards)
                  if (type === 'radio' || type === 'multiple_choice' || type === 'list') {
                    const opts = q.options || q.choices || []
                    return (
                      <section key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                        <QuestionLabel />
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {opts.map((opt: any, i: number) => {
                            const val = typeof opt === 'string' ? opt : opt.value
                            const label = typeof opt === 'string' ? opt : opt.label
                            const isSelected = answers[qName] === val

                            return (
                              <div
                                key={i}
                                onClick={() => handleAnswer(qName, val)}
                                className="relative group cursor-pointer h-full"
                              >
                                <div className={`absolute inset-0 bg-[#4338CA] opacity-0 rounded-2xl transition-all ${isSelected ? 'opacity-10' : 'group-hover:opacity-5'}`}></div>
                                <div className={`h-full flex flex-col items-center justify-center bg-white dark:bg-slate-800 border p-3 py-4 rounded-2xl text-center shadow-sm transition-all border-b-4 ${isSelected ? 'border-[#4338CA] border-t-2 border-x-2 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 border-b-[#4338CA]/30 hover:border-b-[#4338CA] hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">{label}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )
                  }

                  // 4. Scale 1-5 or 1-10
                  if (type === 'scale') {
                    const max = q.max || 5
                    const arr = Array.from({ length: max }, (_, i) => i + 1)
                    return (
                      <section key={idx} className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center mb-6">{q.label || q.title} ({answers[qName] || '-'})</h3>
                        <div className="relative px-2">
                          <input
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4338CA]"
                            max={max} min="1" step="1" type="range"
                            value={answers[qName] || 1}
                            onChange={(e) => handleAnswer(qName, Number(e.target.value))}
                          />
                          <div className="flex justify-between mt-3 text-[10px] font-semibold text-slate-400 px-1 uppercase">
                            <span>Mínimo</span>
                            <span className="text-[#4338CA] text-sm">{answers[qName] || '-'}</span>
                            <span>Máximo</span>
                          </div>
                        </div>
                      </section>
                    )
                  }

                  // Fallback Text Input
                  return (
                    <section key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                      <QuestionLabel />
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-[#4338CA] transition-all text-sm outline-none dark:text-white"
                        placeholder="Sua resposta..."
                        value={answers[qName] || ''}
                        onChange={(e) => handleAnswer(qName, e.target.value)}
                      />
                    </section>
                  )
                })}

                <button
                  onClick={handleVote}
                  disabled={submitting || loading || !!error}
                  className="w-full py-4 bg-[#4338CA] hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-[#4338CA]/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                >
                  <span>{submitting ? 'Enviando Dados...' : 'Confirmar e Enviar Pesquisa'}</span>
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>

                <footer className="text-center pb-8 pt-4">
                  <p className="text-[10px] text-slate-400">© 2024 Vox Eleições. Pesquisa Registrada no TSE.</p>
                </footer>
              </div>
            )}

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

export default function VotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">Carregando...</div>}>
      <VotePageContent />
    </Suspense>
  )
}
