import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Dashboard | Amazon Vox',
    description: 'Premium War Room Analytics',
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <section>{children}</section>
}
