'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    ActiveElement,
    ChartEvent
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export default function DashboardPage() {
    const mapRef = useRef<HTMLDivElement>(null)

    // -- STATE --
    const [activeTab, setActiveTab] = useState<'map' | 'crm'>('map')
    const [lastUpdate, setLastUpdate] = useState('Carregando...')
    const [showHeatmap, setShowHeatmap] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Search / Places State
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

    // Data
    const [rawData, setRawData] = useState<any[]>([])
    const [filteredData, setFilteredData] = useState<any[]>([])

    // Filters
    const [filters, setFilters] = useState({
        candidate: '',
        gender: '',
        age: '',
        concern: ''
    })

    // Visuals
    const [totalVotes, setTotalVotes] = useState(0)
    const [leader, setLeader] = useState({ text: 'Calculando...', percentage: 0, color: 'text-gray-600' })
    const [chartData, setChartData] = useState<any>(null)
    const [concernsData, setConcernsData] = useState<any>(null)

    // Maps Objects
    const mapInstance = useRef<google.maps.Map | null>(null)
    const heatmapInstance = useRef<google.maps.visualization.HeatmapLayer | null>(null)
    const markersRef = useRef<google.maps.Marker[]>([])
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

    const C1_COLOR = '#3B4CCA' // Royal Blue
    const C2_COLOR = '#10B981' // Emerald Green

    // -- EFFECTS --

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [rawData, filters, searchTerm])

    useEffect(() => {
        updateKPIs()
        updateCharts()
        if (mapInstance.current) {
            updateMap()
        }
    }, [filteredData])

    useEffect(() => {
        if (mapInstance.current) {
            updateMap()
        }
    }, [showHeatmap])

    // -- DATA --
    const loadData = async () => {
        try {
            const response = await fetch('/api/voters')
            const data = await response.json()
            setRawData(data)
            setLastUpdate(new Date().toLocaleTimeString())
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        }
    }

    // -- FILTERING --
    const applyFilters = () => {
        let res = [...rawData]
        if (filters.candidate) res = res.filter(v => v.candidate_id.toString() === filters.candidate)
        if (filters.gender) res = res.filter(v => v.voter_gender === filters.gender)
        if (filters.age) res = res.filter(v => v.voter_age_range === filters.age)
        if (filters.concern) res = res.filter(v => v.main_concern === filters.concern)
        if (searchTerm) {
            const lower = searchTerm.toLowerCase()
            res = res.filter(v => v.voter_name?.toLowerCase().includes(lower) || v.voter_cpf?.includes(lower))
        }
        setFilteredData(res)
    }

    const resetFilters = () => {
        setFilters({ candidate: '', gender: '', age: '', concern: '' })
        setSearchTerm('')
    }

    // -- VISUALS --
    const updateKPIs = () => {
        const total = filteredData.length
        setTotalVotes(total)
        if (total === 0) {
            setLeader({ text: '-', percentage: 0, color: 'text-gray-600' })
            return
        }
        const c1Count = filteredData.filter(v => v.candidate_id === 1).length
        const c2Count = filteredData.filter(v => v.candidate_id === 2).length
        if (c1Count > c2Count) {
            setLeader({ text: 'Azul', percentage: (c1Count / total) * 100, color: 'text-[#3B4CCA]' })
        } else if (c2Count > c1Count) {
            setLeader({ text: 'Verde', percentage: (c2Count / total) * 100, color: 'text-[#10B981]' })
        } else {
            setLeader({ text: 'Empate', percentage: 50, color: 'text-gray-600' })
        }
    }

    const updateCharts = () => {
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
        const problems: Record<string, number> = {}
        filteredData.forEach(v => {
            const p = v.main_concern || 'Não informou'
            problems[p] = (problems[p] || 0) + 1
        })
        const sortedLabels = Object.keys(problems).sort((a, b) => problems[b] - problems[a])
        const sortedData = sortedLabels.map(l => problems[l])
        setConcernsData({
            labels: sortedLabels,
            datasets: [{
                label: 'Votos',
                data: sortedData,
                backgroundColor: '#3B4CCA',
                borderRadius: 4,
                barThickness: 12
            }]
        })
    }

    // -- MAPS --
    const initMap = async () => {
        if (!mapRef.current) return
        mapInstance.current = new google.maps.Map(mapRef.current, {
            zoom: 12,
            center: { lat: -23.1857, lng: -46.8978 },
            mapId: 'DEMO_MAP_ID',
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
        })
        infoWindowRef.current = new google.maps.InfoWindow()
        if (filteredData.length > 0) updateMap()
    }

    const updateMap = () => {
        if (!mapInstance.current) return
        if (markersRef.current && markersRef.current.length > 0) {
            markersRef.current.forEach(m => m.setMap(null))
        }
        markersRef.current = []

        markersRef.current = filteredData.map(v => {
            const color = v.candidate_id === 1 ? C1_COLOR : C2_COLOR
            const icon = { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: color, fillOpacity: 1, strokeWeight: 2, strokeColor: 'white' }
            const marker = new google.maps.Marker({
                position: { lat: parseFloat(v.latitude), lng: parseFloat(v.longitude) },
                icon: icon,
                title: v.voter_name,
                map: mapInstance.current
            })
            marker.addListener("click", () => {
                if (!infoWindowRef.current || !mapInstance.current) return
                const candName = v.candidate_id === 1 ? "Candidato Azul" : "Candidato Verde"
                const candColor = v.candidate_id === 1 ? "text-[#3B4CCA]" : "text-[#10B981]"
                let certText = "Indeciso", certBg = "bg-yellow-100 text-yellow-800"
                if (v.vote_certainty >= 4) { certText = "Voto Firme"; certBg = "bg-purple-100 text-purple-800" }

                const contentString = `
                    <div class="p-1 min-w-[220px] font-sans">
                        <h3 class="font-bold text-gray-900 text-base mb-1">${v.voter_name}</h3>
                        <p class="text-xs text-gray-500 mb-3">CPF: ${v.voter_cpf}</p>
                        <div class="flex justify-between items-center mb-2 text-sm">
                            <span class="font-bold ${candColor}">${candName}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded ${certBg}">${certText}</span>
                        </div>
                        <div class="bg-gray-50 p-2 rounded border border-gray-100 mb-3">
                             <p class="text-xs text-gray-500 font-bold uppercase">Dor Principal</p>
                             <p class="text-sm text-gray-800 font-bold">${v.main_concern || 'Não informou'}</p>
                        </div>
                        <a href="https://wa.me/55${v.voter_whatsapp}" target="_blank" class="block w-full text-center bg-[#10B981] text-white text-sm font-bold py-2 rounded transition">Chamar no Zap</a>
                    </div>
                `
                infoWindowRef.current.setContent(contentString)
                infoWindowRef.current.open({ anchor: marker, map: mapInstance.current, shouldFocus: false })
            })
            return marker
        })
        if (heatmapInstance.current) heatmapInstance.current.setMap(null)
        const heatData = filteredData.map(v => new google.maps.LatLng(parseFloat(v.latitude), parseFloat(v.longitude)))
        heatmapInstance.current = new google.maps.visualization.HeatmapLayer({ data: heatData, radius: 30, opacity: 0.6 })
        if (showHeatmap && mapInstance.current) heatmapInstance.current.setMap(mapInstance.current)
    }

    const toggleHeatmap = () => setShowHeatmap(p => !p)
    const handleFilter = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }))

    // -- PLACES SEARCH --
    const toggleSearch = (show: boolean) => {
        setIsSearchOpen(show)
        if (show) {
            // Wait for render
            setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus()
                    initAutocomplete()
                }
            }, 100)
        }
    }

    const initAutocomplete = () => {
        if (!searchInputRef.current || !mapInstance.current || autocompleteRef.current) return

        const options = {
            fields: ["geometry", "name"],
            strictBounds: false,
        };

        autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, options);
        autocompleteRef.current.bindTo("bounds", mapInstance.current);

        autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace();
            if (!place || !place.geometry || !place.geometry.location) {
                return;
            }
            if (place.geometry.viewport) {
                mapInstance.current?.fitBounds(place.geometry.viewport);
            } else {
                mapInstance.current?.setCenter(place.geometry.location);
                mapInstance.current?.setZoom(15);
            }
        });
    }

    return (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 min-h-screen font-sans">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Material+Icons+Outlined&display=swap');
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .active-tab { border-bottom: 2px solid #3B4CCA; color: #3B4CCA; }
            `}</style>

            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyBfJgYGDKPfWGbVnbnkipVFEgq12465cJk&libraries=visualization,places`}
                async
                defer
                onReady={() => { initMap() }}
            />

            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#3B4CCA] rounded-lg flex items-center justify-center text-white font-bold text-xl">V</div>
                    <h1 className="font-bold text-lg tracking-tight">VoxGeo <span className="text-[#3B4CCA] font-medium">War Room</span></h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">{lastUpdate}</span>
                    <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <span className="material-icons-outlined text-sm">tune</span>
                    </button>
                </div>
            </header>

            <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <button onClick={() => setActiveTab('map')} className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'map' ? 'active-tab' : 'text-slate-400 dark:text-slate-500'}`}>Map View</button>
                <button onClick={() => setActiveTab('crm')} className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'crm' ? 'active-tab' : 'text-slate-400 dark:text-slate-500'}`}>CRM List</button>
            </div>

            <div className="p-4 overflow-x-auto no-scrollbar flex gap-2 whitespace-nowrap bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="relative inline-block">
                    <select value={filters.candidate} onChange={e => handleFilter('candidate', e.target.value)} className="appearance-none pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3B4CCA]">
                        <option value="">Candidato: Todos</option>
                        <option value="1">Candidato Azul</option>
                        <option value="2">Candidato Verde</option>
                    </select>
                    <span className="material-icons-outlined text-[14px] absolute right-2 top-1.5 pointer-events-none text-slate-500">expand_more</span>
                </div>
                <div className="relative inline-block">
                    <select value={filters.gender} onChange={e => handleFilter('gender', e.target.value)} className="appearance-none pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3B4CCA]">
                        <option value="">Gênero: Todos</option>
                        <option value="F">Feminino</option>
                        <option value="M">Masculino</option>
                    </select>
                    <span className="material-icons-outlined text-[14px] absolute right-2 top-1.5 pointer-events-none text-slate-500">expand_more</span>
                </div>
                <div className="relative inline-block">
                    <select value={filters.age} onChange={e => handleFilter('age', e.target.value)} className="appearance-none pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3B4CCA]">
                        <option value="">Faixa Etária: Todas</option>
                        <option value="16-24">16-24</option>
                        <option value="25-44">25-44</option>
                        <option value="45-59">45-59</option>
                        <option value="60+">60+</option>
                    </select>
                    <span className="material-icons-outlined text-[14px] absolute right-2 top-1.5 pointer-events-none text-slate-500">expand_more</span>
                </div>
                <div className="relative inline-block">
                    <select value={filters.concern} onChange={e => handleFilter('concern', e.target.value)} className="appearance-none pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3B4CCA]">
                        <option value="">Dor: Todas</option>
                        <option value="Seguranca">Segurança</option>
                        <option value="Saude">Saúde</option>
                        <option value="Educacao">Educação</option>
                        <option value="Infraestrutura">Asfalto</option>
                        <option value="Emprego">Emprego</option>
                    </select>
                    <span className="material-icons-outlined text-[14px] absolute right-2 top-1.5 pointer-events-none text-slate-500">expand_more</span>
                </div>
                <button onClick={resetFilters} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-full text-xs font-bold transition">Limpar</button>
            </div>

            <main className="p-4 pb-24 flex-grow overflow-hidden flex flex-col">
                <div className={`space-y-4 flex-col h-full overflow-y-auto ${activeTab === 'map' ? 'flex' : 'hidden'}`}>
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Volume Filtrado</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{totalVotes}</span>
                                <span className="text-xs text-slate-400">votos</span>
                            </div>
                            <div className="mt-3 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-[#3B4CCA]" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Líder (Seleção)</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-bold truncate ${leader.color}`}>{leader.text}</span>
                                <span className={`text-sm font-semibold ${leader.color}`}>({leader.percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="mt-3 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${leader.text === 'Azul' ? 'bg-[#3B4CCA]' : leader.text === 'Verde' ? 'bg-[#10B981]' : 'bg-gray-400'}`} style={{ width: `${leader.percentage}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="relative bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px] flex-grow">
                        <div ref={mapRef} id="map" className="w-full h-full absolute inset-0"></div>
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                            <button onClick={toggleHeatmap} className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 text-[#3B4CCA]">
                                <span className="material-icons-outlined text-sm">layers</span>
                            </button>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg text-[10px] shadow-sm flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#3B4CCA]"></span>
                                <span className="font-medium">Candidato Azul</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                <span className="font-medium">Candidato Verde</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 pb-10">
                        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                            <div className="w-24 h-24 shrink-0">
                                {chartData && <Doughnut data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }} />}
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Distribuição</h3>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium"><span className="w-2 h-2 rounded-full bg-[#3B4CCA]"></span> Azul</div>
                                    <div className="flex items-center gap-2 text-xs font-medium"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> Verde</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Principais Dores</h3>
                            <div className="h-32 w-full">
                                {concernsData && <Bar data={concernsData} options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`h-full overflow-hidden flex flex-col ${activeTab === 'crm' ? 'flex' : 'hidden'}`}>
                    <div className="shrink-0 mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex gap-2">
                        <div className="relative flex-1">
                            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#3B4CCA]/20 outline-none text-slate-700" placeholder="Buscar eleitor..." />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-100 relative no-scrollbar">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eleitor</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perfil</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dor</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voto</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredData.map(v => (
                                    <tr key={v.id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-slate-800">{v.voter_name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-slate-500">{v.voter_gender} • {v.voter_age_range}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-600">{v.main_concern}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold ${v.candidate_id === 1 ? 'text-[#3B4CCA]' : 'text-[#10B981]'}`}>{v.candidate_id === 1 ? 'Azul' : 'Verde'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {v.voter_whatsapp && (
                                                <a href={`https://wa.me/55${v.voter_whatsapp}`} target="_blank" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100">
                                                    <span className="material-icons-outlined text-sm">chat</span>
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 ${activeTab === 'map' ? 'block' : 'hidden'}`}>
                <div className="bg-[#3B4CCA] rounded-2xl shadow-2xl p-4 flex items-center justify-between transition-all duration-300 overflow-hidden">

                    {!isSearchOpen ? (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4 text-white">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <span className="material-icons-outlined text-2xl">search</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold opacity-75 uppercase tracking-wider">Ação Rápida</p>
                                    <h3 className="font-bold text-lg leading-none">Pesquisar Região</h3>
                                </div>
                            </div>
                            <button onClick={() => toggleSearch(true)} className="bg-white text-[#3B4CCA] hover:bg-indigo-50 px-6 py-2 rounded-lg font-bold text-sm shadow transition">
                                ABRIR
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex items-center gap-2">
                            <span className="material-icons-outlined text-white text-xl animate-bounce">place</span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Digite uma cidade, bairro ou rua..."
                                className="w-full bg-[#3B4CCA] text-white placeholder-indigo-200 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-white outline-none transition"
                            />

                            <button onClick={() => toggleSearch(false)} className="text-indigo-200 hover:text-white p-2 rounded-full hover:bg-white/20 transition">
                                <span className="material-icons-outlined text-2xl">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
