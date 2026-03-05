'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js'
import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DashboardPage() {
    // -- STATE --
    const [activeTab, setActiveTab] = useState<'map' | 'crm'>('map')
    const [lastUpdate, setLastUpdate] = useState('Conectando...')
    const [darkMode, setDarkMode] = useState(false)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

    const [surveys, setSurveys] = useState<any[]>([])
    const [selectedSurveyId, setSelectedSurveyId] = useState('')
    const [rawData, setRawData] = useState<any[]>([])
    const [filteredData, setFilteredData] = useState<any[]>([])
    const [filters, setFilters] = useState<Record<string, string>>({})
    const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    const [totalVotes, setTotalVotes] = useState(0)
    const [leader, setLeader] = useState({ text: '--', color: 'text-slate-500', dominance: '--%' })
    const [chartData, setChartData] = useState<any>(null)

    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<google.maps.Map | null>(null)
    const heatmapInstance = useRef<google.maps.visualization.HeatmapLayer | null>(null)
    const markersRef = useRef<google.maps.Marker[]>([])
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

    const [crmSearchTerm, setCrmSearchTerm] = useState('')

    // Paleta de Cores Dinâmicas para Mapa e Gráfico
    const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

    useEffect(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true)
        loadSurveys()
    }, [])

    useEffect(() => {
        if (selectedSurveyId) {
            setFilters({})
            loadData(selectedSurveyId)
        }
    }, [selectedSurveyId])

    useEffect(() => {
        if (!rawData || rawData.length === 0) {
            setDynamicQuestions([])
            return
        }

        const validFilters: any[] = []
        const ignoreWords = ['nome', 'telefone', 'whatsapp', 'cpf', 'rg', 'email']

        const actualKeys = new Set<string>()
        rawData.forEach(r => {
            const ans = r.raw_data || r.respondent_data || {}
            Object.keys(ans).forEach(k => actualKeys.add(k))
        })

        actualKeys.forEach(key => {
            const keyLower = key.toLowerCase()
            if (ignoreWords.some(w => keyLower.includes(w))) return

            const uniqueValues = new Set<string>()
            rawData.forEach(r => {
                const ans = r.raw_data || r.respondent_data || {}
                const val = ans[key]
                if (val && typeof val === 'string' && val.trim() !== '') {
                    uniqueValues.add(val.trim())
                }
            })

            if (uniqueValues.size > 0) {
                validFilters.push({
                    filterKey: key,
                    label: key,
                    options: Array.from(uniqueValues).map(v => ({ label: v, value: v }))
                })
            }
        })

        setDynamicQuestions(validFilters)
    }, [selectedSurveyId, rawData])

    const loadSurveys = async () => {
        try {
            const res = await fetch('/api/surveys')
            if (!res.ok) throw new Error('Failed to fetch surveys')
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
                setSurveys(data)
                setSelectedSurveyId(data[data.length - 1].id)
            }
        } catch (e) {
            setSurveys([{ id: 'legacy', title: 'Erro ao carregar (Offline)', slug: 'legacy' }])
        }
    }

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }, [darkMode])

    useEffect(() => { applyFilters() }, [rawData, filters])

    // Atualiza gráficos e mapa sempre que os filtros ou perguntas mudarem
    useEffect(() => {
        updateVisuals()
        if (mapInstance.current) updateMap()
    }, [filteredData, dynamicQuestions])

    const loadData = async (surveyId: string | null) => {
        try {
            const url = surveyId && surveyId !== 'legacy' ? `/api/voters?survey_id=${surveyId}` : '/api/voters'
            const response = await fetch(url)
            const data = await response.json()
            setRawData(Array.isArray(data) ? data : [])
            setLastUpdate("Atualizado: " + new Date().toLocaleTimeString())
        } catch (error) {
            setLastUpdate("Erro na conexão")
        }
    }

    const applyFilters = () => {
        let res = [...rawData]
        Object.keys(filters).forEach(key => {
            const filterValue = filters[key]
            if (filterValue) {
                res = res.filter(v => {
                    const ans = v.raw_data || v.respondent_data || {}
                    return String(ans[key]) === String(filterValue)
                })
            }
        })
        setFilteredData(res)
    }

    const resetFilters = () => setFilters({})
    const handleFilterChange = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }))

    // =========================================================================
    // NOVO MOTOR DE GRÁFICOS (Inteligência Dinâmica)
    // =========================================================================
    const updateVisuals = () => {
        const total = filteredData.length
        setTotalVotes(total)

        if (total === 0 || dynamicQuestions.length === 0) {
            setLeader({ text: '--', color: 'text-slate-500', dominance: 'Sem dados' })
            setChartData(null)
            return
        }

        // Tenta achar a pergunta principal de Voto (pela palavra votar/prefeito/candidato), ou pega a 1ª
        let mainQuestion = dynamicQuestions.find(q => q.label.toLowerCase().includes('votar') || q.label.toLowerCase().includes('candidato') || q.label.toLowerCase().includes('prefeito'))
        if (!mainQuestion) mainQuestion = dynamicQuestions[0]

        const key = mainQuestion.filterKey
        const counts: Record<string, number> = {}

        filteredData.forEach(v => {
            const ans = v.raw_data || v.respondent_data || {}
            const val = ans[key]
            if (val && typeof val === 'string' && val.trim() !== '') {
                counts[val] = (counts[val] || 0) + 1
            }
        })

        const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1])

        if (sortedCounts.length > 0) {
            const topLabel = sortedCounts[0][0]
            const topCount = sortedCounts[0][1]
            setLeader({ text: topLabel, color: 'text-[#4F46E5]', dominance: `${((topCount / total) * 100).toFixed(0)}%` })

            const labels = sortedCounts.map(item => item[0])
            const data = sortedCounts.map(item => item[1])

            setChartData({
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: CHART_COLORS.slice(0, labels.length),
                    borderWidth: 0
                }]
            })
        } else {
            setLeader({ text: '--', color: 'text-slate-500', dominance: 'Sem dados' })
            setChartData(null)
        }
    }

    // =========================================================================
    // MAPA COM CORES DINÂMICAS BASEADAS NO GRÁFICO
    // =========================================================================
    const initMap = async () => {
        if (!mapRef.current) return
        mapInstance.current = new google.maps.Map(mapRef.current, {
            zoom: 12, center: { lat: -23.1857, lng: -46.8978 }, disableDefaultUI: true, styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
        })
        infoWindowRef.current = new google.maps.InfoWindow({ pixelOffset: new google.maps.Size(0, -10) })
        if (filteredData.length > 0) updateMap()
    }

    const updateMap = () => {
        if (!mapInstance.current) return
        markersRef.current.forEach(m => m.setMap(null))
        markersRef.current = []
        if (heatmapInstance.current) heatmapInstance.current.setMap(null)

        // Pega a mesma pergunta principal que o gráfico usa para sincronizar as cores
        let mainQuestion = dynamicQuestions.find(q => q.label.toLowerCase().includes('votar') || q.label.toLowerCase().includes('candidato') || q.label.toLowerCase().includes('prefeito'))
        if (!mainQuestion && dynamicQuestions.length > 0) mainQuestion = dynamicQuestions[0]

        markersRef.current = filteredData.map(v => {
            const ans = v.raw_data || v.respondent_data || {}

            // Define a cor do Pin baseado na resposta
            let pinColor = CHART_COLORS[0]
            if (mainQuestion) {
                const userAns = ans[mainQuestion.filterKey]
                const optIndex = mainQuestion.options.findIndex((o: any) => o.value === userAns)
                if (optIndex >= 0) pinColor = CHART_COLORS[optIndex % CHART_COLORS.length]
            }

            const marker = new google.maps.Marker({
                position: { lat: parseFloat(v.latitude), lng: parseFloat(v.longitude) },
                map: mapInstance.current,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: pinColor, fillOpacity: 1, strokeWeight: 2, strokeColor: '#fff' }
            })

            marker.addListener('click', () => {
                if (!infoWindowRef.current || !mapInstance.current) return
                let dynamicContentHtml = ''

                Object.entries(ans).forEach(([key, val]) => {
                    if (!val || typeof val !== 'string' || val.trim() === '' || key.toLowerCase() === 'whatsapp') return;
                    dynamicContentHtml += `
                         <div class="bg-slate-50 p-1.5 rounded mb-1 border border-slate-100">
                             <span class="block font-bold text-gray-500 uppercase text-[9px] truncate">${key}</span>
                             <span class="text-[11px] font-medium text-slate-800 whitespace-normal">${val}</span>
                         </div>
                     `
                })

                const phoneField = v.voter_whatsapp || ans['Whatsapp'] || ans['Telefone'] || ans['telefone']
                const cleanPhone = phoneField ? String(phoneField).replace(/\D/g, '') : ''
                const waButtonHtml = cleanPhone ? `<a href="https://wa.me/55${cleanPhone}" target="_blank" class="block w-full text-center bg-green-500 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-1 mt-3 shadow-md" style="text-decoration:none;">CHAMAR NO WHATSAPP</a>` : ''

                const content = `
                    <div class="p-2 font-sans min-w-[220px] max-w-[260px] max-h-[300px] overflow-y-auto sidebar-scroll">
                        <div class="font-bold text-gray-800 mb-2 flex justify-between items-center border-b pb-2">
                            <span class="truncate pr-2 text-sm">${v.voter_name || ans['QUAL SEU NOME?'] || ans['Nome'] || ans['NOME'] || 'Eleitor'}</span>
                            <span class="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-100">Id: ${v.id}</span>
                        </div>
                        ${dynamicContentHtml}
                        ${waButtonHtml}
                    </div>
                `
                infoWindowRef.current.setContent(content)
                infoWindowRef.current.open(mapInstance.current, marker)
            })
            return marker
        })
    }

    const toggleHeatmap = () => {
        if (!mapInstance.current) return
        if (!heatmapInstance.current || heatmapInstance.current.getMap() === null) {
            const heatData = filteredData.map(v => new google.maps.LatLng(parseFloat(v.latitude), parseFloat(v.longitude)))
            heatmapInstance.current = new google.maps.visualization.HeatmapLayer({ data: heatData, radius: 30, opacity: 0.7, map: mapInstance.current })
            markersRef.current.forEach(m => m.setMap(null))
        } else {
            heatmapInstance.current.setMap(null)
            markersRef.current.forEach(m => m.setMap(mapInstance.current))
        }
    }

    const crmData = filteredData.filter(v => {
        if (!crmSearchTerm) return true
        const lower = crmSearchTerm.toLowerCase()
        return v.voter_name?.toLowerCase().includes(lower) || JSON.stringify(v.raw_data || v.respondent_data || {}).toLowerCase().includes(lower)
    })

    const exportToPDF = async () => {
        setIsGeneratingPdf(true)
        try {
            const element = document.getElementById('pdf-report-container')
            if (element) {
                const dataUrl = await toPng(element, {
                    cacheBust: true,
                    pixelRatio: 2,
                    backgroundColor: darkMode ? '#0F172A' : '#F8FAFC',
                    filter: (node) => {
                        if (node.tagName === 'BUTTON' && node.innerText && node.innerText.includes('Gerando')) return false;
                        return true;
                    }
                });

                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [element.offsetWidth * 2, element.offsetHeight * 2]
                })
                pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth * 2, element.offsetHeight * 2)
                pdf.save('Relatorio_VoxGeo_Intencao_Votos.pdf')
            }
        } catch (error: any) {
            console.error('Erro ao gerar PDF:', error)
            alert('Erro ao gerar PDF: ' + error.message)
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    return (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300 h-screen overflow-hidden flex flex-col">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons+Round');
                .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.3) }
                .dark .glass-card { background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.1) }
                .sidebar-scroll::-webkit-scrollbar { width: 6px }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px }
                .dark .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155 }
                .chart-container { position: relative; height: 180px; width: 100%; display: flex; justify-content: center; }
            `}</style>

            <Script src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyBfJgYGDKPfWGbVnbnkipVFEgq12465cJk&libraries=visualization,places`} async defer onReady={() => { initMap() }} />

            <header className="h-16 px-6 bg-[#1E1B4B] flex items-center justify-between shadow-2xl shrink-0 z-50">
                <div className="flex items-center space-x-2">
                    <span className="text-white font-bold text-xl tracking-tight">Vox<span className="text-[#3B82F6]">Geo</span></span>
                    <span className="text-slate-400 font-light border-l border-slate-700 pl-3 ml-1">War Room</span>
                </div>

                <div className="hidden md:flex items-center bg-white/10 rounded-lg px-3 py-1 border border-white/10 mx-4 flex-1 max-w-sm">
                    <span className="material-icons-round text-indigo-400 text-sm mr-2">poll</span>
                    <select value={selectedSurveyId} onChange={e => setSelectedSurveyId(e.target.value)} className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer w-full outline-none [&>option]:text-slate-800">
                        {surveys.length === 0 && <option value="">Carregando pesquisas...</option>}
                        {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>

                <Link href="/dashboard/surveys" className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border border-indigo-500 ml-2 shadow-sm">
                    <span className="material-icons-round text-sm">settings</span>
                    <span className="hidden md:inline">Gerenciar</span>
                </Link>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                        <span className="text-white/80 text-xs font-medium">{lastUpdate}</span>
                    </div>
                    <button className="text-white/70 hover:text-white p-2 transition" onClick={() => setDarkMode(!darkMode)}>
                        <span className="material-icons-round">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shadow-sm shrink-0 z-40">
                <div className="flex flex-nowrap overflow-x-auto sidebar-scroll pb-2 md:pb-0 gap-3">
                    {dynamicQuestions.length === 0 && (
                        <div className="text-xs text-slate-400 flex items-center h-[34px] px-2 font-medium">Aguardando respostas para gerar os filtros...</div>
                    )}

                    {dynamicQuestions.map(q => (
                        <div key={q.filterKey} className="space-y-1 shrink-0 w-[200px]">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate block" title={q.label}>{q.label}</label>
                            <select
                                value={filters[q.filterKey] || ''}
                                onChange={e => handleFilterChange(q.filterKey, e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-[#4F46E5] focus:border-[#4F46E5] py-1.5 focus:outline-none border px-2 text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Todos</option>
                                {q.options.map((opt: any, i: number) => (
                                    <option key={i} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    ))}

                    {dynamicQuestions.length > 0 && (
                        <div className="flex items-end ml-2">
                            <button onClick={resetFilters} className="h-[32px] px-4 flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors text-xs font-bold border border-slate-200 dark:border-slate-700">
                                <span className="material-icons-round text-[16px]">filter_alt_off</span>
                                <span>Limpar</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <main id="pdf-report-container" className="flex flex-1 overflow-hidden relative">
                <aside className="w-[340px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-xl shrink-0">
                    <div className="px-4 pt-4 shrink-0">
                        <div className="flex border-b border-slate-100 dark:border-slate-800">
                            <button onClick={() => setActiveTab('map')} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'map' ? 'text-[#4F46E5] border-b-2 border-[#4F46E5]' : 'text-slate-400 hover:text-slate-600'}`}>Map View</button>
                            <button onClick={() => setActiveTab('crm')} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'crm' ? 'text-[#4F46E5] border-b-2 border-[#4F46E5]' : 'text-slate-400 hover:text-slate-600'}`}>CRM List</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="glass-card p-4 rounded-xl shadow-sm border-l-4 border-l-[#3B82F6]">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Volume</p>
                                <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">{totalVotes}</p>
                                <p className="text-[10px] text-slate-500">Respondentes</p>
                            </div>
                            <div className="glass-card p-4 rounded-xl shadow-sm border-l-4 border-l-[#10B981]">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Líder do Filtro</p>
                                <p className={`text-xl font-bold mt-1 truncate ${leader.color}`}>{leader.text}</p>
                                <p className="text-[10px] text-slate-500">{leader.dominance}</p>
                            </div>
                        </div>

                        <div className="glass-card p-5 rounded-xl shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-4">Intenção Geral</p>
                            <div className="chart-container">
                                {chartData ? (
                                    <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-slate-400">Sem dados para análise</div>
                                )}
                            </div>
                        </div>

                        {/* Botão de PDF */}
                        <button
                            onClick={exportToPDF}
                            disabled={isGeneratingPdf}
                            className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm transition-all mt-4 ${isGeneratingPdf ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-[#1E1B4B] hover:bg-slate-800 dark:hover:bg-indigo-900 text-white shadow-md'}`}
                        >
                            <span className="material-icons-round text-[18px]">
                                {isGeneratingPdf ? 'hourglass_empty' : 'picture_as_pdf'}
                            </span>
                            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Gerar Relatório'}</span>
                        </button>
                    </div>
                </aside>

                <div className="flex-1 relative bg-slate-200 dark:bg-slate-800">
                    <div className={`w-full h-full relative ${activeTab === 'map' ? 'block' : 'hidden'}`}>
                        <div ref={mapRef} id="map" className="w-full h-full"></div>
                        <div className="absolute top-6 left-6 space-y-2 z-10">
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-xl flex flex-col space-y-1">
                                <button onClick={() => mapInstance.current?.setZoom((mapInstance.current?.getZoom() || 12) + 1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><span className="material-icons-round">add</span></button>
                                <button onClick={() => mapInstance.current?.setZoom((mapInstance.current?.getZoom() || 12) - 1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><span className="material-icons-round">remove</span></button>
                                <div className="h-px bg-slate-200 mx-2"></div>
                                <button onClick={toggleHeatmap} className="p-2 hover:bg-slate-100 rounded-lg group text-slate-600 group-hover:text-red-500"><span className="material-icons-round">local_fire_department</span></button>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* CRM LIST - AGORA FORMATADA E PROFISSIONAL */}
                    {/* ========================================================================= */}
                    <div className={`w-full h-full flex flex-col p-6 overflow-hidden ${activeTab === 'crm' ? 'flex' : 'hidden'}`}>
                        <div className="shrink-0 mb-4 bg-white p-3 rounded-xl shadow-sm border flex gap-2">
                            <div className="relative flex-1">
                                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input type="text" value={crmSearchTerm} onChange={(e) => setCrmSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm outline-none" placeholder="Buscar eleitor por nome ou resposta..." />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-white rounded-xl shadow-lg border relative sidebar-scroll">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Eleitor / Contato</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Respostas da Pesquisa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {crmData.length === 0 ? (
                                        <tr><td colSpan={2} className="text-center py-12 text-slate-400 font-medium">Nenhum eleitor encontrado na base.</td></tr>
                                    ) : (
                                        crmData.map(v => {
                                            const ans = v.raw_data || v.respondent_data || {};
                                            const name = v.voter_name || ans['QUAL SEU NOME?'] || ans['Nome'] || ans['NOME'] || 'Anônimo';
                                            const phone = v.voter_whatsapp || ans['Whatsapp'] || ans['Telefone'] || ans['telefone'];

                                            return (
                                                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-800">{name}</span>
                                                            <span className="text-xs text-slate-400 mt-1">ID: {v.id}</span>
                                                            {phone && (
                                                                <a href={`https://wa.me/55${String(phone).replace(/\D/g, '')}`} target="_blank" className="mt-2 inline-flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700">
                                                                    <span className="material-icons-round text-sm mr-1">whatsapp</span>
                                                                    Contatar
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {Object.entries(ans).map(([k, val], idx) => {
                                                                if (!val || typeof val !== 'string' || val.trim() === '' || k.toLowerCase().includes('whatsapp') || k.toLowerCase() === 'nome') return null;
                                                                return (
                                                                    <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{k}</span>
                                                                        <span className="text-xs font-medium text-slate-700">{val}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}