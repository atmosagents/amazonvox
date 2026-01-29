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

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DashboardPage() {
    // -- STATE --
    const [activeTab, setActiveTab] = useState<'map' | 'crm'>('map')
    const [lastUpdate, setLastUpdate] = useState('Conectando...')
    const [darkMode, setDarkMode] = useState(false)

    // Data & Filters
    const [surveys, setSurveys] = useState<any[]>([])
    const [selectedSurveyId, setSelectedSurveyId] = useState('')
    const [rawData, setRawData] = useState<any[]>([])
    const [filteredData, setFilteredData] = useState<any[]>([])
    const [filters, setFilters] = useState({
        candidate: '',
        gender: '',
        age: '',
        concern: '',
        education: '',
        income: ''
    })
    const [searchTerm, setSearchTerm] = useState('') // For CRM Search

    // Visuals State
    const [totalVotes, setTotalVotes] = useState(0)
    const [leader, setLeader] = useState({ text: '--', color: 'text-slate-500', dominance: '--%' })
    const [chartData, setChartData] = useState<any>(null)
    const [painPoints, setPainPoints] = useState<any[]>([])

    // Map State
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<google.maps.Map | null>(null)
    const heatmapInstance = useRef<google.maps.visualization.HeatmapLayer | null>(null)
    const markersRef = useRef<google.maps.Marker[]>([])
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

    // CRM Search
    const [crmSearchTerm, setCrmSearchTerm] = useState('')

    // Constants
    const C1_COLOR = '#3B82F6' // Accent Blue
    const C2_COLOR = '#10B981' // Accent Green

    // -- EFFECTS --
    useEffect(() => {
        // Init Dark Mode
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkMode(true)
        }
        loadSurveys()
    }, [])

    useEffect(() => {
        if (selectedSurveyId) loadData(selectedSurveyId)
    }, [selectedSurveyId])

    const loadSurveys = async () => {
        try {
            const res = await fetch('/api/surveys')
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
                setSurveys(data)
                // Select first one by default
                setSelectedSurveyId(data[0].id)
            } else {
                // No surveys? Try loading legacy data purely?
                loadData(null)
            }
        } catch (e) {
            console.error('Failed to load surveys', e)
            loadData(null) // Fallback to default
        }
    }

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    useEffect(() => {
        applyFilters()
    }, [rawData, filters])

    useEffect(() => {
        updateVisuals()
        if (mapInstance.current) {
            updateMap()
        }
    }, [filteredData])

    // -- LOAD DATA --
    const loadData = async (surveyId: string | null) => {
        try {
            const url = surveyId ? `/api/voters?survey_id=${surveyId}` : '/api/voters'
            const response = await fetch(url)
            const data = await response.json()
            setRawData(Array.isArray(data) ? data : [])
            setLastUpdate("Atualizado: " + new Date().toLocaleTimeString())
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            setLastUpdate("Erro na conexão")
        }
    }

    // -- FILTERING --
    const applyFilters = () => {
        let res = [...rawData]
        if (filters.candidate) res = res.filter(v => v.candidate_id.toString() === filters.candidate)
        if (filters.gender) res = res.filter(v => v.voter_gender === filters.gender)
        if (filters.age) res = res.filter(v => v.voter_age_range === filters.age)
        if (filters.concern) res = res.filter(v => v.main_concern === filters.concern)
        if (filters.education) res = res.filter(v => v.voter_education && v.voter_education.includes(filters.education))
        if (filters.income) res = res.filter(v => v.voter_income && v.voter_income.includes(filters.income))
        setFilteredData(res)
    }

    const resetFilters = () => {
        setFilters({ candidate: '', gender: '', age: '', concern: '', education: '', income: '' })
    }

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    // -- VISUALS UPDATE --
    const updateVisuals = () => {
        const total = filteredData.length
        setTotalVotes(total)

        // Leader
        if (total === 0) {
            setLeader({ text: '--', color: 'text-slate-500', dominance: 'Sem dados' })
        } else {
            const c1 = filteredData.filter(v => v.candidate_id === 1).length
            const c2 = filteredData.filter(v => v.candidate_id === 2).length

            if (c1 > c2) {
                setLeader({ text: 'Azul', color: 'text-[#3B82F6]', dominance: `${((c1 / total) * 100).toFixed(0)}%` })
            } else if (c2 > c1) {
                setLeader({ text: 'Verde', color: 'text-[#10B981]', dominance: `${((c2 / total) * 100).toFixed(0)}%` })
            } else {
                setLeader({ text: 'Empate', color: 'text-slate-500', dominance: '50/50' })
            }
        }

        // Chart
        const c1Count = filteredData.filter(v => v.candidate_id === 1).length
        const c2Count = filteredData.filter(v => v.candidate_id === 2).length
        setChartData({
            labels: ['Azul', 'Verde'],
            datasets: [{
                data: [c1Count, c2Count],
                backgroundColor: [C1_COLOR, C2_COLOR],
                borderWidth: 0,
            }],
        })

        // Pain Points
        const counts: Record<string, number> = {}
        filteredData.forEach(v => { const p = v.main_concern || 'Outros'; counts[p] = (counts[p] || 0) + 1 })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        setPainPoints(sorted.map(([name, val]) => ({
            name,
            pct: total > 0 ? ((val / total) * 100).toFixed(0) : 0
        })))
    }

    // -- MAP LOGIC --
    const initMap = async () => {
        if (!mapRef.current) return
        mapInstance.current = new google.maps.Map(mapRef.current, {
            zoom: 12,
            center: { lat: -23.1857, lng: -46.8978 },
            disableDefaultUI: true,
            styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
        })
        infoWindowRef.current = new google.maps.InfoWindow({ pixelOffset: new google.maps.Size(0, -10) })
        if (filteredData.length > 0) updateMap()
    }

    const updateMap = () => {
        if (!mapInstance.current) return

        // Clear old
        markersRef.current.forEach(m => m.setMap(null))
        markersRef.current = []
        if (heatmapInstance.current) heatmapInstance.current.setMap(null)

        // Add Markers
        markersRef.current = filteredData.map(v => {
            const color = v.candidate_id === 1 ? C1_COLOR : C2_COLOR
            const marker = new google.maps.Marker({
                position: { lat: parseFloat(v.latitude), lng: parseFloat(v.longitude) },
                map: mapInstance.current,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: color, fillOpacity: 1, strokeWeight: 2, strokeColor: '#fff' }
            })

            marker.addListener('click', () => {
                if (!infoWindowRef.current || !mapInstance.current) return
                const candName = v.candidate_id === 1 ? "Azul" : "Verde"
                const colorText = v.candidate_id === 1 ? "text-blue-600" : "text-green-600"

                const content = `
                    <div class="p-2 font-sans min-w-[220px]">
                        <div class="font-bold text-gray-800 mb-1 flex justify-between">
                            <span>${v.voter_name}</span>
                            <span class="text-[10px] bg-gray-100 px-1 rounded flex items-center">${v.voter_age_range || ''}</span>
                        </div>
                        
                        <div class="text-xs text-gray-500 mb-2 border-b pb-2">
                            Voto: <strong class="${colorText}">${candName}</strong>
                            <span class="ml-2 text-[10px] text-gray-400">(${v.vote_certainty >= 4 ? 'Firme' : 'Indeciso'})</span>
                        </div>

                        <div class="grid grid-cols-2 gap-2 mb-2 text-[10px] text-gray-600">
                            <div class="bg-slate-50 p-1.5 rounded">
                                <span class="block font-bold text-gray-400 uppercase text-[9px]">Escolaridade</span>
                                ${v.voter_education || '-'}
                            </div>
                            <div class="bg-slate-50 p-1.5 rounded">
                                <span class="block font-bold text-gray-400 uppercase text-[9px]">Renda</span>
                                ${v.voter_income || '-'}
                            </div>
                        </div>

                        <div class="bg-red-50 p-1.5 rounded border border-red-100 mb-2">
                             <div class="text-[9px] text-red-400 uppercase font-bold">Principal Dor</div>
                             <div class="text-xs font-medium text-red-700">${v.main_concern || 'Não informou'}</div>
                        </div>

                        <a href="https://wa.me/55${v.voter_whatsapp}" target="_blank" class="block w-full text-center bg-green-500 text-white text-xs font-bold py-2 rounded hover:bg-green-600 transition flex items-center justify-center gap-1" style="text-decoration:none; padding: 8px;">
                            <span class="material-icons-round text-sm">whatsapp</span> CHAMAR
                        </a>
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
            // Show Heatmap, Hide Markers
            const heatData = filteredData.map(v => new google.maps.LatLng(parseFloat(v.latitude), parseFloat(v.longitude)))
            heatmapInstance.current = new google.maps.visualization.HeatmapLayer({ data: heatData, radius: 30, opacity: 0.7, map: mapInstance.current })
            markersRef.current.forEach(m => m.setMap(null))
        } else {
            // Hide Heatmap, Show Markers
            heatmapInstance.current.setMap(null)
            markersRef.current.forEach(m => m.setMap(mapInstance.current))
        }
    }

    // -- CRM helpers --
    // We filter the filteredData further by search term for the list view
    const crmData = filteredData.filter(v => {
        if (!crmSearchTerm) return true
        const lower = crmSearchTerm.toLowerCase()
        return v.voter_name?.toLowerCase().includes(lower) || v.voter_cpf?.includes(lower)
    })

    return (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300 h-screen overflow-hidden flex flex-col">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons+Round');
                
                /* Custom Classes from Mockup */
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3)
                }
                .dark .glass-card {
                    background: rgba(30, 41, 59, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1)
                }
                .sidebar-scroll::-webkit-scrollbar { width: 6px }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px }
                .dark .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155 }
                .chart-container { position: relative; height: 180px; width: 100%; display: flex; justify-content: center; }
            `}</style>

            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyBfJgYGDKPfWGbVnbnkipVFEgq12465cJk&libraries=visualization,places`}
                async
                defer
                onReady={() => { initMap() }}
            />

            {/* HEADER */}
            <header className="h-16 px-6 bg-[#1E1B4B] flex items-center justify-between shadow-2xl shrink-0 z-50">
                <div className="flex items-center space-x-2">
                    <span className="text-white font-bold text-xl tracking-tight">Vox<span className="text-[#3B82F6]">Geo</span></span>
                    <span className="text-slate-400 font-light border-l border-slate-700 pl-3 ml-1">War Room</span>
                </div>

                {/* SURVEY SELECTOR */}
                <div className="hidden md:flex items-center bg-white/10 rounded-lg px-3 py-1 border border-white/10 mx-4 flex-1 max-w-sm">
                    <span className="material-icons-round text-indigo-400 text-sm mr-2">poll</span>
                    <select
                        value={selectedSurveyId}
                        onChange={e => setSelectedSurveyId(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer w-full outline-none [&>option]:text-slate-800"
                    >
                        {surveys.length === 0 && <option value="">Carregando pesquisas...</option>}
                        {surveys.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                    </select>
                </div>

                <Link href="/dashboard/surveys" className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border border-indigo-500 ml-2 shadow-sm" title="Criar ou Editar Pesquisas">
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

            {/* FILTERS BAR */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shadow-sm shrink-0 z-40">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Candidato</label>
                        <select value={filters.candidate} onChange={e => handleFilterChange('candidate', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-[#4F46E5] py-1.5 focus:outline-none border px-2">
                            <option value="">Todos</option>
                            <option value="1">Candidato Azul</option>
                            <option value="2">Candidato Verde</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gênero</label>
                        <select value={filters.gender} onChange={e => handleFilterChange('gender', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-[#4F46E5] py-1.5 focus:outline-none border px-2">
                            <option value="">Todos</option>
                            <option value="F">Feminino</option>
                            <option value="M">Masculino</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Idade</label>
                        <select value={filters.age} onChange={e => handleFilterChange('age', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-[#4F46E5] py-1.5 focus:outline-none border px-2">
                            <option value="">Todas</option>
                            <option value="16-24">16-24</option>
                            <option value="25-44">25-44</option>
                            <option value="45-59">45-59</option>
                            <option value="60+">60+</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Escolaridade</label>
                        <select value={filters.education || ''} onChange={e => handleFilterChange('education', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-[#4F46E5] py-1.5 focus:outline-none border px-2">
                            <option value="">Todas</option>
                            <option value="Fundamental">Fundamental</option>
                            <option value="Medio">Médio</option>
                            <option value="Superior">Superior</option>
                            <option value="Pos">Pós-Graduação</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Renda</label>
                        <select value={filters.income || ''} onChange={e => handleFilterChange('income', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-[#4F46E5] py-1.5 focus:outline-none border px-2">
                            <option value="">Todas</option>
                            <option value="Ate 1 SM">Até 1 SM</option>
                            <option value="1 a 3 SM">1-3 SM</option>
                            <option value="Acima de 10 SM">Alta Renda (&gt;10)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dor</label>
                        <select value={filters.concern} onChange={e => handleFilterChange('concern', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-[#4F46E5] py-1.5 focus:outline-none border px-2">
                            <option value="">Todas</option>
                            <option value="Seguranca">Segurança</option>
                            <option value="Saude">Saúde</option>
                            <option value="Educacao">Educação</option>
                            <option value="Infraestrutura">Infraestrutura</option>
                            <option value="Emprego">Emprego</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={resetFilters} className="w-full h-[34px] flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors text-xs font-semibold">
                            <span className="material-icons-round text-sm">filter_alt_off</span>
                            <span>Limpar</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="flex flex-1 overflow-hidden relative">

                {/* SIDEBAR */}
                <aside className="w-[340px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-xl shrink-0">
                    <div className="px-4 pt-4 shrink-0">
                        <div className="flex border-b border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setActiveTab('map')}
                                className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'map' ? 'text-[#4F46E5] border-b-2 border-[#4F46E5]' : 'text-slate-400 hover:text-slate-600'}`}
                            >Map View</button>
                            {/* CRM List made clickable */}
                            <button
                                onClick={() => setActiveTab('crm')}
                                className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'crm' ? 'text-[#4F46E5] border-b-2 border-[#4F46E5]' : 'text-slate-400 hover:text-slate-600'}`}
                            >CRM List</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-4">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="glass-card p-4 rounded-xl shadow-sm border-l-4 border-l-[#3B82F6]">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Volume</p>
                                <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">{totalVotes}</p>
                                <p className="text-[10px] text-slate-500">Filtrados</p>
                            </div>
                            <div className="glass-card p-4 rounded-xl shadow-sm border-l-4 border-l-[#10B981]">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Líder</p>
                                <p className={`text-xl font-bold mt-1 truncate ${leader.color}`}>{leader.text}</p>
                                <p className="text-[10px] text-slate-500">Dominância: {leader.dominance}</p>
                            </div>
                        </div>

                        {/* CHART */}
                        <div className="glass-card p-5 rounded-xl shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-4">Distribuição</p>
                            <div className="chart-container">
                                {chartData && <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }} />}
                            </div>
                        </div>

                        {/* PAIN POINTS */}
                        <div className="glass-card p-5 rounded-xl shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-4">Dores da Região</p>
                            <div className="space-y-4">
                                {painPoints.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center">Sem dados.</p>
                                ) : (
                                    painPoints.map((item, i) => {
                                        const gradients = ['from-blue-500 to-indigo-600', 'from-emerald-400 to-emerald-600', 'from-amber-400 to-orange-500']
                                        const grad = gradients[i % gradients.length]
                                        return (
                                            <div key={item.name}>
                                                <div className="flex justify-between text-xs mb-1 dark:text-slate-300">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                                    <span className="text-slate-500">{item.pct}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-gradient-to-r ${grad}`} style={{ width: `${item.pct}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button onClick={() => window.print()} className="w-full flex items-center justify-center space-x-2 bg-[#4F46E5] hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-all">
                            <span className="material-icons-round text-sm">print</span>
                            <span>Relatório</span>
                        </button>
                    </div>
                </aside>

                {/* CONTENT AREA (MAP or CRM) */}
                <div className="flex-1 relative bg-slate-200 dark:bg-slate-800">

                    {/* MAP VIEW */}
                    <div className={`w-full h-full relative ${activeTab === 'map' ? 'block' : 'hidden'}`}>
                        <div ref={mapRef} id="map" className="w-full h-full"></div>

                        {/* Map Controls */}
                        <div className="absolute top-6 left-6 space-y-2 z-10">
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-xl flex flex-col space-y-1">
                                <button onClick={() => mapInstance.current?.setZoom((mapInstance.current?.getZoom() || 12) + 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><span className="material-icons-round">add</span></button>
                                <button onClick={() => mapInstance.current?.setZoom((mapInstance.current?.getZoom() || 12) - 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><span className="material-icons-round">remove</span></button>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                <button onClick={toggleHeatmap} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group text-slate-600 dark:text-slate-300 group-hover:text-red-500"><span className="material-icons-round">local_fire_department</span></button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="absolute bottom-6 left-6 z-10">
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white dark:border-slate-800 space-y-3 min-w-[180px]">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">Legenda</p>
                                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleFilterChange('candidate', '1')}>
                                    <span className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-sm"></span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Candidato Azul</span>
                                </div>
                                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleFilterChange('candidate', '2')}>
                                    <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm"></span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Candidato Verde</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CRM VIEW (Integrated Table) */}
                    <div className={`w-full h-full flex flex-col p-6 overflow-hidden ${activeTab === 'crm' ? 'flex' : 'hidden'}`}>
                        <div className="shrink-0 mb-4 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-2">
                            <div className="relative flex-1">
                                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                <input
                                    type="text"
                                    value={crmSearchTerm}
                                    onChange={(e) => setCrmSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#4F46E5]/20 outline-none text-slate-700 dark:text-slate-200"
                                    placeholder="Buscar eleitor na lista..."
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 relative no-scrollbar">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eleitor</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perfil</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dor</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voto</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {crmData.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum eleitor encontrado.</td></tr>
                                    ) : (
                                        crmData.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{v.voter_name}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs text-slate-500">{v.voter_gender} • {v.voter_age_range}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">{v.main_concern}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-bold ${v.candidate_id === 1 ? 'text-[#3B82F6]' : 'text-[#10B981]'}`}>{v.candidate_id === 1 ? 'Azul' : 'Verde'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {v.voter_whatsapp && (
                                                        <a href={`https://wa.me/55${v.voter_whatsapp}`} target="_blank" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                            <span className="material-icons-round text-sm">chat</span>
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
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
