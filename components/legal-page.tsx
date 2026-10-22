export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed text-muted-foreground [&_h2]:pt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-xs">Última actualización: {updated} · Borrador pendiente de revisión legal</p>
      </header>
      {children}
    </article>
  )
}
