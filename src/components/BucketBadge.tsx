import { getBucketColor, colorBadgeStyle } from '../lib/colors'
import { useTheme } from '../contexts/ThemeContext'

export function BucketBadge({ bucket }: { bucket: string }) {
  const { theme } = useTheme()
  const color = getBucketColor(bucket)
  return (
    <span className="badge" style={colorBadgeStyle(color, theme === 'dark')}>
      {bucket}
    </span>
  )
}
