import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Demo | Amazon Vox',
    description: 'Sales Demo Environment',
}

export default function DemoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <section>{children}</section>
}
