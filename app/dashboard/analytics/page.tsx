'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export default function AnalyticsDashboardPage() {
    const [surveys, setSurveys] = useState<any[]>([])
    const [selectedSurvey, setSelectedSurvey] = useState<string>('')
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // Map Refs
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<google.maps.Map | null>(null)
    const markersRef = useRef<google.maps.Marker[]>([])

    // Load Survey List on Mount
    useEffect(() => {
        fetch('/api/surveys')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setSurveys(data)
                    setSelectedSurvey(data[0].id) // Select first by default
                }
            })
    }, [])

    // Load Analytics when selection changes
    useEffect(() => {
        if (!selectedSurvey) return
        loadAnalytics(selectedSurvey)
    }, [selectedSurvey])

    // Update Map when data changes
    useEffect(() => {
        if (data?.geo_data && mapInstance.current) {
            updateMap(data.geo_data)
        }
    }, [data])

    const loadAnalytics = async (id: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/surveys/analytics?survey_id=${id}`)
            const json = await res.json()
            setData(json)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const initMap = () => {
        if (!mapRef.current) return
        mapInstance.current = new google.maps.Map(mapRef.current, {
            zoom: 12,
            center: { lat: -3.1190, lng: -60.0217 }, // Manaus Default
            disableDefaultUI: true,
            styles: [
                { featureType: "poi", stylers: [{ visibility: "off" }] }
            ]
        })
    }

    const updateMap = (geoData: any[]) => {
        if (!mapInstance.current) return

        // Clear existing markers
        markersRef.current.forEach(m => m.setMap(null))
        markersRef.current = []

        if (geoData.length === 0) return

        const bounds = new google.maps.LatLngBounds()

        markersRef.current = geoData.map(point => {
            const lat = parseFloat(point.lat)
            const lng = parseFloat(point.lng)

            if (isNaN(lat) || isNaN(lng)) return null

            const pos = { lat, lng }
            bounds.extend(pos)

            const marker = new google.maps.Marker({
                position: pos,
                map: mapInstance.current,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#4F46E5',
                    fillOpacity: 0.9,
                    strokeWeight: 1,
                    strokeColor: 'white'
                }
            })

            // Simple InfoWindow with summary
            const infoContent = `
                <div style="font-family: sans-serif; padding: 5px; font-size: 12px; color: #333;">
                    <strong>Respostas:</strong><br/>
                    ${Object.entries(point.summary).map(([k, v]) => `<b>${k}:</b> ${v}`).join('<br/>')}
                </div>
            `
            const infowindow = new google.maps.InfoWindow({ content: infoContent })
            marker.addListener('click', () => {
                infowindow.open(mapInstance.current, marker)
            })

            return marker
        }).filter(Boolean) as google.maps.Marker[]

        if (!bounds.isEmpty()) {
            mapInstance.current.fitBounds(bounds)
            // Prevent too much zoom if only one point
            if (geoData.length === 1) mapInstance.current.setZoom(15)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=visualization,places`}
                async
                defer
                onReady={initMap}
            />

            {/* HEADER / SELECTOR */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Analytics Universal</h1>
                    <p className="text-xs text-slate-500">Métricas em tempo real de suas pesquisas</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-xs font-bold uppercase text-slate-400">Pesquisa:</span>
                    <select
                        value={selectedSurvey}
                        onChange={e => setSelectedSurvey(e.target.value)}
                        className="flex-1 md:w-64 bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 dark:text-white focus:ring-2 ring-indigo-500"
                    >
                        {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400 animate-pulse">Carregando dados...</div>
            ) : !data ? (
                <div className="p-10 text-center text-slate-400">Selecione uma pesquisa para ver os dados.</div>
            ) : (
                <main className="p-6 max-w-7xl mx-auto space-y-6">
                    {/* STATS CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Respostas</p>
                            <p className="text-3xl font-bold text-indigo-600 mt-1">{data.meta.total}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Pontos no Mapa</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-1">{data.geo_data.length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Atualização</p>
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-1">
                                {new Date(data.meta.last_updated).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                    {/* MAP AREA */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-96 relative">
                        <div ref={mapRef} className="w-full h-full bg-slate-200" />
                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                            Distribuição Geográfica
                        </div>
                    </div>

                    {/* DYNAMIC CHARTS GRID */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="charts-area">
                        {data.charts.map((chart: any) => (
                            <div key={chart.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">{chart.title}</h3>

                                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                                    {chart.type === 'pie' && (
                                        <div className="w-full h-48">
                                            <Doughnut
                                                data={{
                                                    labels: chart.labels,
                                                    datasets: [{
                                                        data: chart.data,
                                                        backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                                                        borderWidth: 0
                                                    }]
                                                }}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } }
                                                }}
                                            />
                                        </div>
                                    )}

                                    {chart.type === 'bar' && (
                                        <div className="w-full h-48">
                                            <div className="text-center mb-2">
                                                <span className="text-2xl font-bold text-slate-800 dark:text-white">{chart.average}</span>
                                                <span className="text-xs text-slate-400 ml-1">Média</span>
                                            </div>
                                            <Bar
                                                data={{
                                                    labels: chart.labels,
                                                    datasets: [{
                                                        label: 'Votos',
                                                        data: chart.data,
                                                        backgroundColor: '#4F46E5',
                                                        borderRadius: 4
                                                    }]
                                                }}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: { y: { beginAtZero: true } }
                                                }}
                                            />
                                        </div>
                                    )}

                                    {chart.type === 'list' && (
                                        <div className="w-full space-y-2">
                                            {chart.data.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Sem respostas de text.</p>
                                            ) : (
                                                chart.data.map((txt: string, i: number) => (
                                                    <div key={i} className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                                                        "{txt}"
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            )}
        </div>
    )
}
