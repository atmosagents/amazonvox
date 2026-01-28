'use client'

import { useState } from 'react'
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

    // New Question State
    const [qLabel, setQLabel] = useState('')
    const [qType, setQType] = useState<QuestionType>('text')
    const [qOptions, setQOptions] = useState('')

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
                    slug: slug || undefined, // Send undefined if empty to let backend gen
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
        <div className="p-6 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* EDITOR SIDE */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Configuração da Pesquisa</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                            <input
                                value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500/50"
                                placeholder="Ex: Pesquisa Av. das Torres"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                            <textarea
                                value={desc} onChange={e => setDesc(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500/50 h-20"
                                placeholder="Uma breve descrição..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug Personalizado (Opcional)</label>
                            <div className="flex items-center">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-2 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-sm">/p/</span>
                                <input
                                    value={slug} onChange={e => setSlug(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500/50"
                                    placeholder="minha-pesquisa"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Adicionar Pergunta</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                <select
                                    value={qType} onChange={e => setQType(e.target.value as QuestionType)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none"
                                >
                                    <option value="text">Texto</option>
                                    <option value="select">Seleção (Dropdown)</option>
                                    <option value="radio">Radio Button</option>
                                    <option value="scale">Escala 1-5</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pergunta (Label)</label>
                                <input
                                    value={qLabel} onChange={e => setQLabel(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 ring-indigo-500/50"
                                    placeholder="Ex: Qual sua idade?"
                                />
                            </div>
                        </div>

                        {(qType === 'select' || qType === 'radio') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opções (Separadas por vírgula)</label>
                                <input
                                    value={qOptions} onChange={e => setQOptions(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 ring-indigo-500/50"
                                    placeholder="Ex: Opção A, Opção B, Opção C"
                                />
                            </div>
                        )}

                        <button
                            onClick={addQuestion}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-round">playlist_add</span>
                            Adicionar ao Formulário
                        </button>
                    </div>
                </div>
            </div>

            {/* PREVIEW SIDE */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[40px] overflow-hidden min-h-[600px] flex flex-col relative">
                    <div className="bg-[#1E1B4B] pt-12 pb-8 px-6 text-center relative shrink-0">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">{title || 'Título da Pesquisa'}</h2>
                        <p className="text-slate-300 text-xs">{desc || 'Descrição da pesquisa aparecerá aqui.'}</p>
                    </div>

                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-6 space-y-4 overflow-y-auto">
                        {questions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                As perguntas aparecerão aqui.
                            </div>
                        ) : (
                            questions.map((q, idx) => (
                                <div key={q.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                                    <button
                                        onClick={() => removeQuestion(q.id)}
                                        className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="material-icons-round text-sm">delete</span>
                                    </button>

                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {idx + 1}. {q.label}
                                    </label>

                                    {/* PREVIEW RENDERS */}
                                    {q.type === 'text' && (
                                        <input disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Resposta..." />
                                    )}

                                    {q.type === 'select' && (
                                        <select disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                            <option>Selecione...</option>
                                            {q.options?.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    )}

                                    {q.type === 'radio' && (
                                        <div className="space-y-2">
                                            {q.options?.map(o => (
                                                <div key={o} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-50"></div>
                                                    <span className="text-sm text-slate-600">{o}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'scale' && (
                                        <div className="flex justify-between px-2">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <div key={n} className="flex flex-col items-center gap-1">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">{n}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <button
                    onClick={saveSurvey}
                    disabled={loading}
                    className="w-full py-4 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all text-lg"
                >
                    {loading ? 'Salvando...' : 'Salvar e Gerar Link'}
                </button>
            </div>
        </div>
    )
}
