import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, Globe, Package, Briefcase,
  BarChart2, TrendingUp, Settings, LogOut, ChevronRight, Zap, MessageSquare,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const adminNav = [
  { to: '/admin',             label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/admin/clients',     label: 'Clients',      icon: Users },
  { to: '/admin/users',       label: 'Users',        icon: UserCheck },
  { to: '/admin/directories', label: 'Directories',  icon: Globe },
  { to: '/admin/packages',    label: 'Packages',     icon: Package },
  { to: '/admin/jobs',        label: 'Jobs',         icon: Briefcase },
  { to: '/admin/reports',     label: 'Reports',      icon: BarChart2 },
  { to: '/admin/analytics',   label: 'Analytics',    icon: TrendingUp },
  { to: '/admin/support',     label: 'Support',      icon: MessageSquare },
  { to: '/admin/settings',    label: 'Settings',     icon: Settings },
]

const clientNav = [
  { to: '/dashboard',          label: 'Overview',    icon: LayoutDashboard, end: true },
  { to: '/dashboard/citations', label: 'Citations',  icon: Globe },
  { to: '/dashboard/listings',  label: 'My Listings', icon: TrendingUp },
  { to: '/dashboard/billing',  label: 'Billing',    icon: CreditCard },
  { to: '/dashboard/reports',  label: 'Reports',    icon: BarChart2 },
]

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
        isActive
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
    </NavLink>
  )
}

export default function Sidebar({ mobile = false, onClose }) {
  const { userProfile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const nav = isAdmin ? adminNav : clientNav

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <aside className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200',
      mobile ? 'w-full' : 'w-64',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">ReBoost</p>
          <p className="text-xs text-gray-400">Citations</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 pt-4 pb-1">
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full',
          isAdmin ? 'bg-brand-50 text-brand-700' : 'bg-green-50 text-green-700',
        )}>
          {isAdmin ? 'Admin' : 'Client'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
            {userProfile?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">{userProfile?.email}</p>
            <p className="text-xs text-gray-400 capitalize">{userProfile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
