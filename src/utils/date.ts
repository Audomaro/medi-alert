export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `Hoy es ${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`
}

export function getWeekDates(): { day: string; date: number; iso: string; active: boolean }[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const week: { day: string; date: number; iso: string; active: boolean }[] = []
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - dayOfWeek + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    week.push({
      day: labels[i],
      date: d.getDate(),
      iso,
      active: iso === todayISO(),
    })
  }
  return week
}

export function formatTime24to12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}
