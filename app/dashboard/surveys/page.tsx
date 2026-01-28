'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SurveyListPage() {
    const [surveys, setSurveys] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSurveys()
    }, [])

    const fetchSurveys = async () => {
        try {
            const res = await fetch('/api/surveys')
            const data = await res.json()
            if (Array.isArray(data)) setSurveys(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const copyLink = (slug: string) => {
        const url = `${window.location.origin}/p/${slug}`
        navigator.clipboard.writeText(url)
        alert('Link copiado: ' + url)
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciador de Pesquisas</h1>
                    <p className="text-slate-500 text-sm">Crie formulários dinâmicos e gere links únicos.</p>
                </div>
                <Link href="/dashboard/surveys/create" className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                    <span className="material-icons-round text-sm">add</span>
                    Nova Pesquisa
                </Link>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center text-slate-400 py-10">Carregando...</div>
                ) : surveys.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 bg-white rounded-2xl border border-dashed border-slate-300">
                        Nenhuma pesquisa criada ainda.
                    </div>
                ) : (
                    surveys.map((s) => (
                        <div key={s.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{s.title}</h3>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-1">{s.description || 'Sem descrição'}</p>
                                <div className="text-xs text-slate-400 mt-2 flex gap-4">
                                    <span>Slug: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{s.slug}</code></span>
                                    <span>Perguntas: {s.questions_schema?.length || 0}</span>
                                    <span>Criado em: {new Date(s.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button onClick={() => copyLink(s.slug)} className="flex-1 md:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                                    Copiar Link
                                </button>
                                <Link href={`/dashboard?filter_survey=${s.slug}`} className="flex-1 md:flex-none px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors text-center">
                                    Ver Resultados
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
