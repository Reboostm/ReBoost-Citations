import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Select = forwardRef(function Select({ label, error, options = [], placeholder, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'transition duration-150 bg-white',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})

export default Select
