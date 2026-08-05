// Parsea texto con segmentos **en negrita** y los renderiza como elementos
// React reales (no HTML crudo), para que cualquier dato ingresado por el
// usuario (ej: nombre de una empresa) nunca pueda ejecutarse como HTML/JS.
export function BoldText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-[var(--text)]">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}
