function initialsOf(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const SIZE_CLASSES: Record<number, string> = {
  6: 'w-6 h-6 text-[10px]',
  8: 'w-8 h-8 text-xs',
  9: 'w-9 h-9 text-sm',
  16: 'w-16 h-16 text-xl',
}

export function Avatar({ url, name, size = 8 }: { url: string | null | undefined; name: string; size?: 6 | 8 | 9 | 16 }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES[8]
  if (url) {
    return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
  }
  return (
    <div className={`${sizeClass} rounded-full bg-ink-900 dark:bg-ink-700 text-white flex items-center justify-center font-medium flex-shrink-0`}>
      {initialsOf(name || 'U')}
    </div>
  )
}
