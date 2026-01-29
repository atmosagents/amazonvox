'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type QuestionType = 'text' | 'select' | 'scale' | 'radio'

interface Question {
    id: string
    type: QuestionType
    label: string
    options?: string[]
}

export default function SurveyBuilderPage() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [desc, setDesc] = useState('')
    const [slug, setSlug] = useState('')
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(false)
    const [darkMode, setDarkMode] = useState(false)

    // New Question State
    const [qLabel, setQLabel] = useState('')
    const [qType, setQType] = useState<QuestionType>('text')
    const [qOptions, setQOptions] = useState('')

    useEffect(() => {
        // Simple dark mode init
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkMode(true)
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
        document.documentElement.classList.toggle('dark')
    }

    const addQuestion = () => {
        if (!qLabel) return

        let opts: string[] | undefined = undefined
        if (qType === 'select' || qType === 'radio') {
            opts = qOptions.split(',').map(s => s.trim()).filter(Boolean)
        }

        const newQ: Question = {
            id: Math.random().toString(36).substr(2, 9),
            type: qType,
            label: qLabel,
            options: opts
        }

        setQuestions([...questions, newQ])
        setQLabel('')
        setQOptions('')
        setQType('text')
    }

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id))
    }

    const saveSurvey = async () => {
        if (!title || questions.length === 0) {
            alert('Preencha o título e adicione pelo menos uma pergunta.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/surveys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description: desc,
                    slug: slug || undefined,
                    questions_schema: questions
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar')

            alert('Pesquisa criada com sucesso!')
            router.push('/dashboard/surveys')
        } catch (e: any) {
            alert(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                
                body { font-family: 'Inter', sans-serif; }
                .ios-shadow { box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.05); }
                .glass { 
                    backdrop-filter: blur(12px); 
                    -webkit-backdrop-filter: blur(12px);
                }
                .main-container {
                     min-height: calc(100vh - 80px); padding-bottom: 120px;
                }
            `}</style>

            <div className="max-w-7xl mx-auto px-6 py-10 main-container">
                <header className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5]">analytics</span>
                            VoxGeo Premium
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Criação de Pesquisa Eleitoral e de Mercado</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            onClick={toggleDarkMode}
                        >
                            <span className="material-symbols-outlined dark:hidden">dark_mode</span>
                            <span className="material-symbols-outlined hidden dark:block">light_mode</span>
                        </button>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 ios-shadow">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-[#4F46E5] text-xl">settings</span>
                                <h2 className="text-xl font-semibold">Configuração da Pesquisa</h2>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Título da Pesquisa</label>
                                    <input
                                        value={title} onChange={e => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none"
                                        placeholder="Ex: Pesquisa de Intenção de Voto - Av. das Torres"
                                        type="text"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Descrição</label>
                                    <textarea
                                        value={desc} onChange={e => setDesc(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none resize-none"
                                        placeholder="Uma breve descrição sobre os objetivos desta coleta de dados..."
                                        rows={3}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Slug Personalizado (Opcional)</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                                            voxgeo.com/p/
                                        </span>
                                        <input
                                            value={slug} onChange={e => setSlug(e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-r-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none"
                                            placeholder="minha-pesquisa-2026"
                                            type="text"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 ios-shadow">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-[#4F46E5] text-xl">add_circle</span>
                                <h2 className="text-xl font-semibold">Adicionar Pergunta</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Tipo de Resposta</label>
                                    <select
                                        value={qType} onChange={e => setQType(e.target.value as QuestionType)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none"
                                    >
                                        <option value="text">Texto Curto</option>
                                        <option value="select">Seleção Única (Dropdown)</option>
                                        <option value="radio">Seleção Múltipla (Radio)</option>
                                        <option value="scale">Escala Linear 1-5</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Pergunta (Label)</label>
                                    <input
                                        value={qLabel} onChange={e => setQLabel(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none"
                                        placeholder="Ex: Qual sua idade?"
                                        type="text"
                                    />
                                </div>

                                {(qType === 'select' || qType === 'radio') && (
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Opções (Separadas por vírgula)</label>
                                        <input
                                            value={qOptions} onChange={e => setQOptions(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none"
                                            placeholder="Ex: Opção A, Opção B, Opção C"
                                            type="text"
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={addQuestion}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-[#1E293B] text-white rounded-xl hover:bg-slate-800 transition-all font-medium"
                            >
                                <span className="material-symbols-outlined text-xl">playlist_add</span>
                                Adicionar ao Formulário
                            </button>
                        </section>
                    </div>

                    <div className="lg:col-span-5 flex flex-col items-center">
                        <div className="sticky top-10 w-full max-w-sm">
                            <div className="mb-4 flex items-center justify-between px-2">
                                <span className="text-sm font-medium text-slate-400">Live Preview</span>
                                <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Live
                                </span>
                            </div>
                            <div className="relative w-full aspect-[9/18.5] bg-white dark:bg-slate-900 rounded-[3rem] border-[8px] border-slate-900 dark:border-slate-800 overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20"></div>
                                <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
                                    <div className="pt-12 pb-8 px-6 bg-[#1E293B] text-white text-center shrink-0">
                                        <h3 className="text-xl font-bold mb-2">{title || 'Título da Pesquisa'}</h3>
                                        <p className="text-xs text-slate-400 opacity-80 leading-relaxed">
                                            {desc || 'Descrição da pesquisa aparecerá aqui conforme você digita.'}
                                        </p>
                                    </div>
                                    <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-950 space-y-4">
                                        {questions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-400">quiz</span>
                                                </div>
                                                <p className="text-slate-400 text-sm">As perguntas aparecerão aqui.</p>
                                            </div>
                                        ) : (
                                            questions.map((q, idx) => (
                                                <div key={q.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative group text-left">
                                                    <button
                                                        onClick={() => removeQuestion(q.id)}
                                                        className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>

                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                        {q.label}
                                                    </label>

                                                    {q.type === 'text' && (
                                                        <input disabled className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Resposta..." />
                                                    )}

                                                    {q.type === 'select' && (
                                                        <select disabled className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                                                            <option>Selecione...</option>
                                                            {q.options?.map(o => <option key={o}>{o}</option>)}
                                                        </select>
                                                    )}

                                                    {q.type === 'radio' && (
                                                        <div className="space-y-2">
                                                            {q.options?.map(o => (
                                                                <div key={o} className="flex items-center gap-2">
                                                                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"></div>
                                                                    <span className="text-sm text-slate-600 dark:text-slate-400">{o}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {q.type === 'scale' && (
                                                        <div className="flex justify-between px-2">
                                                            {[1, 2, 3, 4, 5].map(n => (
                                                                <div key={n} className="flex flex-col items-center gap-1">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">{n}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 mt-auto">
                                        <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 glass bg-white/70 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 py-6 px-6 z-50">
                <div className="max-w-7xl mx-auto flex flex-col items-center">
                    <button
                        onClick={saveSurvey}
                        disabled={loading}
                        className="w-full max-w-md py-4 px-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <span className="material-symbols-outlined">rocket_launch</span>
                        {loading ? 'Publicando...' : 'Salvar e Gerar Link'}
                    </button>
                    <p className="text-center text-[10px] font-medium uppercase tracking-widest text-slate-400 mt-3">A pesquisa será publicada instantaneamente para coleta de dados</p>
                </div>
            </footer>

            <div className="fixed top-0 left-0 -z-10 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-[#4F46E5]/20 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-indigo-500/20 blur-[100px] rounded-full"></div>
            </div>
        </div>
    )
}
