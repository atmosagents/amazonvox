'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DemoPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [candidate, setCandidate] = useState<number | null>(null)
    const [step, setStep] = useState<'intro' | 'location' | 'vote' | 'success'>('intro')

    // Mock geolocation for demo if real API fails or user denies
    const mockLocation = () => {
        // Manaus Center
        setLocation({ lat: -3.1190, lng: -60.0217 })
        setStep('vote')
    }

    const getLocation = () => {
        setLoading(true)
        setError(null)
        if (!navigator.geolocation) {
            setError('Geolocalização não suportada pelo seu navegador.')
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                setLoading(false)
                setStep('vote')
            },
            (err) => {
                console.error(err)
                setError('Não foi possível obter sua localização. Usando localização simulada (Manaus).')
                mockLocation()
                setLoading(false)
            }
        )
    }

    const handleVote = async () => {
        if (!candidate || !location) return

        setLoading(true)
        try {
            const res = await fetch('/api/demo/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    candidate_id: candidate,
                    latitude: location.lat,
                    longitude: location.lng,
                    voter_name: 'Visitante Demo',
                    main_concern: 'Geral',
                    vote_certainty: 5
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao registrar voto')
            }

            setStep('success')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-emerald-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Amazon Vox</h1>
                    <p className="text-emerald-100 text-sm mt-1">Pesquisa Eleitoral Digital</p>
                </div>

                <div className="p-8">
                    {step === 'intro' && (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                                🗳️
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800">Bem-vindo à Pesquisa</h2>
                            <p className="text-slate-600">
                                Participe da nossa demonstração de intenção de votos. É rápido, seguro e anônimo.
                            </p>
                            <button
                                onClick={() => setStep('location')}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors ring-offset-2 focus:ring-2 ring-emerald-500"
                            >
                                Começar
                            </button>
                        </div>
                    )}

                    {step === 'location' && (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                                📍
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800">Confirme sua Localização</h2>
                            <p className="text-slate-600">
                                Para garantir a validade da pesquisa, precisamos registrar a região do seu voto.
                            </p>
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}
                            <button
                                onClick={getLocation}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? 'Obtendo...' : 'Compartilhar Localização'}
                            </button>
                            <button
                                onClick={mockLocation}
                                className="text-sm text-slate-400 underline hover:text-slate-600"
                            >
                                Pular (Simular Manaus)
                            </button>
                        </div>
                    )}

                    {step === 'vote' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-slate-800 text-center">Em quem você votaria?</h2>

                            <div className="grid gap-4">
                                <button
                                    onClick={() => setCandidate(1)}
                                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${candidate === 1
                                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                            : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="font-bold text-slate-800">Candidato A</div>
                                    <div className="text-sm text-slate-500">Partido do Progresso</div>
                                    {candidate === 1 && (
                                        <div className="absolute top-4 right-4 text-emerald-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>

                                <button
                                    onClick={() => setCandidate(2)}
                                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${candidate === 2
                                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                            : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="font-bold text-slate-800">Candidato B</div>
                                    <div className="text-sm text-slate-500">Partido da Renovação</div>
                                    {candidate === 2 && (
                                        <div className="absolute top-4 right-4 text-emerald-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleVote}
                                disabled={!candidate || loading}
                                className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${candidate && !loading
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {loading ? 'Registrando...' : 'Confirmar Voto'}
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
                                🎉
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Voto Confirmado!</h2>
                                <p className="text-slate-600 mt-2">
                                    Obrigado por participar da nossa demonstração.
                                </p>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setStep('intro');
                                        setCandidate(null);
                                    }}
                                    className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
                                >
                                    Votar novamente (Demo)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
                    Powered by <strong>Amazon Vox</strong> • Geolocalização Ativa
                </div>
            </div>
        </main>
    )
}
