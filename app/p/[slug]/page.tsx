'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation' // Use useParams for client components

export default function SurveyRendererPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [survey, setSurvey] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)

    // Responses State
    const [answers, setAnswers] = useState<Record<string, any>>({})

    // Geo State
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)

    useEffect(() => {
        if (slug) fetchSurvey()
    }, [slug])

    const fetchSurvey = async () => {
        try {
            const res = await fetch(`/api/surveys/${slug}`)
            const data = await res.json()

            if (!res.ok) {
                setError('Pesquisa não encontrada ou desativada.')
                return
            }
            setSurvey(data)
        } catch (e) {
            setError('Erro de conexão.')
        } finally {
            setLoading(false)
        }
    }

    const handleAnswer = (questionLabel: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionLabel]: value
        }))
    }

    const handleSubmit = async () => {
        if (!location) {
            // Try get location again if missing
            getLocationAndSubmit()
            return
        }
        submitNow(location.lat, location.lng)
    }

    const getLocationAndSubmit = () => {
        setSubmitting(true)
        if (!navigator.geolocation) {
            alert('Geolocalização é obrigatória para esta pesquisa.')
            setSubmitting(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                setLocation({ lat, lng })
                submitNow(lat, lng)
            },
            (err) => {
                alert('Erro ao obter localização. Permita o acesso ao GPS e tente novamente.')
                setSubmitting(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const submitNow = async (lat: number, lng: number) => {
        try {
            const res = await fetch('/api/surveys/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    survey_id: survey.id,
                    respondent_data: answers,
                    latitude: lat,
                    longitude: lng,
                    origin_source: 'web_direct'
                })
            })

            if (!res.ok) throw new Error('Erro ao salvar')

            setCompleted(true)
        } catch (e) {
            alert('Erro ao enviar resposta.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando pesquisa...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>
    if (completed) return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons-round text-emerald-600 text-4xl">check</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Obrigado!</h1>
                <p className="text-slate-500">Sua resposta foi registrada com sucesso.</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col items-center p-4 font-sans text-slate-800 dark:text-slate-100">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons+Round');
            `}</style>

            <div className="w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl rounded-[32px] overflow-hidden flex flex-col min-h-[80vh]">
                {/* HEADER */}
                <header className="bg-[#1E1B4B] pt-12 pb-8 px-8 text-center relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold text-white tracking-tight">{survey.title}</h1>
                        {survey.description && <p className="text-slate-300 mt-2 text-sm">{survey.description}</p>}
                    </div>
                </header>

                {/* FORM */}
                <main className="flex-1 p-8 space-y-6">
                    {/* Location Warning */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-xs flex items-center gap-2 mb-6">
                        <span className="material-icons-round text-sm">location_on</span>
                        <span>Sua localização será registrada ao enviar.</span>
                    </div>

                    {survey.questions_schema.map((q: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{q.label}</label>

                            {q.type === 'text' && (
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-indigo-500/50"
                                    placeholder="Sua resposta..."
                                    value={answers[q.label] || ''}
                                    onChange={e => handleAnswer(q.label, e.target.value)}
                                />
                            )}

                            {(q.type === 'select' || q.type === 'dropdown') && (
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-indigo-500/50 appearance-none"
                                    value={answers[q.label] || ''}
                                    onChange={e => handleAnswer(q.label, e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {q.options?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}

                            {q.type === 'radio' && (
                                <div className="space-y-2">
                                    {q.options?.map((opt: string) => (
                                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${answers[q.label] === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                                            <input
                                                type="radio"
                                                name={q.label}
                                                value={opt}
                                                checked={answers[q.label] === opt}
                                                onChange={() => handleAnswer(q.label, opt)}
                                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.type === 'scale' && (
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => handleAnswer(q.label, val)}
                                            className={`h-12 rounded-xl font-bold flex items-center justify-center transition-all ${answers[q.label] === val ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                    <div className="col-span-5 flex justify-between text-[9px] text-slate-400 uppercase font-bold px-1 mt-1">
                                        <span>Discordo</span>
                                        <span>Concordo</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </main>

                <div className="p-8 pt-0">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Enviando...' : 'Enviar Pesquisa'}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-6">Powered by Amazon Vox SaaS</p>
                </div>
            </div>
        </div>
    )
}
