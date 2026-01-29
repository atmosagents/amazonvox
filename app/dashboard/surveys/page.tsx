'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'

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
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 min-h-screen font-sans">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
                
                body { font-family: 'Inter', sans-serif; }
                h1, h2, h3, h4, .font-display { font-family: 'Plus Jakarta Sans', sans-serif; }
                
                .survey-card-shadow {
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                }
                .ios-blur {
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
            `}</style>

            {/* SIDEBAR */}
            <aside className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col">
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#4F46E5] p-2 rounded-xl text-white">
                            <span className="material-symbols-outlined text-2xl">poll</span>
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-xl tracking-tight leading-none">VoxGeo</h1>
                            <p className="text-[10px] uppercase tracking-widest text-[#4F46E5] font-bold">Premium Manager</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link href="/dashboard" className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                        <span className="material-symbols-outlined group-hover:text-[#4F46E5] transition-colors">dashboard</span>
                        <span className="font-semibold text-sm">Painel</span>
                    </Link>

                    <a href="#" className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#4F46E5] bg-[#4F46E5]/5 border-r-4 border-[#4F46E5] font-bold">
                        <span className="material-symbols-outlined">assignment</span>
                        <span className="text-sm">Pesquisas</span>
                    </a>
                </nav>

                <div className="p-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold">
                                <span>AD</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">Admin VoxGeo</p>
                                <p className="text-[10px] text-slate-500">Plano Premium</p>
                            </div>
                        </div>
                        <button className="w-full py-2 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">logout</span> Sair
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="ml-72 min-h-screen">
                <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0F172A]/80 ios-blur border-b border-slate-200 dark:border-slate-800 px-10 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">Gerenciador de Pesquisas</h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <button className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">notifications</span>
                            </button>
                            <Link href="/dashboard/surveys/create" className="bg-gradient-to-r from-[#4F46E5] to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-[#4F46E5]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                <span className="material-symbols-outlined">add</span>
                                <span>Nova Pesquisa</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto px-10 pt-10 pb-20">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 survey-card-shadow flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Ativas</p>
                                <p className="text-5xl font-display font-black">{surveys.length}</p>
                            </div>
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 survey-card-shadow flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Respostas</p>
                                <p className="text-5xl font-display font-black">--</p>
                            </div>
                            <div className="w-16 h-16 bg-[#4F46E5]/5 dark:bg-[#4F46E5]/20 text-[#4F46E5] rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">analytics</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Recentes</h3>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {loading ? (
                                <div className="col-span-2 text-center py-20 text-slate-400">Carregando pesquisas...</div>
                            ) : surveys.length === 0 ? (
                                <div className="col-span-2 text-center py-20 text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                    Nenhuma pesquisa encontrada. Crie a primeira!
                                </div>
                            ) : (
                                surveys.map(s => {
                                    const isLegacy = s.id === 'legacy'
                                    return (
                                        <div key={s.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 survey-card-shadow overflow-hidden hover:border-[#4F46E5]/30 transition-all">
                                            <div className="p-8 h-full flex flex-col">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-2.5 h-2.5 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-red-500'} ${s.active ? 'animate-pulse' : ''}`}></span>
                                                            <h4 className="font-display font-bold text-xl text-slate-800 dark:text-white line-clamp-1">{s.title}</h4>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-[#4F46E5] bg-[#4F46E5]/5 px-2.5 py-1 rounded-lg">#{s.slug}</span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed line-clamp-2 h-12">
                                                        {s.description || 'Sem descrição definida para esta pesquisa.'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-8 mb-8">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-slate-400">help</span>
                                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{s.questions_schema?.length || 0} Perguntas</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-slate-400">calendar_month</span>
                                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                                {new Date(s.created_at).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                                    <button
                                                        onClick={() => copyLink(s.slug)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">content_copy</span> Copiar Link
                                                    </button>
                                                    {!isLegacy && (
                                                        <Link
                                                            href="/dashboard"
                                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-[#4F46E5] text-white font-bold text-sm rounded-xl shadow-md shadow-[#4F46E5]/10 hover:bg-indigo-600 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">insights</span> Ver Resultados
                                                        </Link>
                                                    )}
                                                    {isLegacy && (
                                                        <Link
                                                            href="/dashboard?survey_id=legacy"
                                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md hover:bg-slate-700 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">history</span> Ver Legado
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
