import { cn } from '@/utils/cn'

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'bg-blue-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'bg-green-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', ring: 'bg-orange-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    ring: 'bg-red-100' },
  }
  const c = colors[color] ?? colors.blue

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-start gap-4">
      {Icon && (
        <div className={cn('p-3 rounded-xl flex-shrink-0', c.ring)}>
          <Icon className={cn('w-6 h-6', c.icon)} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.up ? 'text-green-600' : 'text-red-500')}>
            {trend.up ? '↑' : '↓'} {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
