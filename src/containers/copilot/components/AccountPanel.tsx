/**
 * The persistent "context" surface beside the conversation. Surfaces everything
 * the demo knows about the account in context: identity, contact, service,
 * balance, 6-month / 1-year / 2-year usage history with stats, and notices.
 *
 * Colour choices clear WCAG AA on both surfaces — note `bg-[#16789f]` for the
 * light-mode usage bars: brand cyan at full opacity is too pale on white for the
 * bar heights to read.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CalendarClock,
  CreditCard,
  Gauge,
  Mail,
  MapPin,
  Phone,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/containers/copilot/utils/formatCurrency'
import { findAccount, findCustomer, type Account } from '@/data/customers'
import { RANGE_LABEL, USAGE_RANGES, rangeSeries, usageStats, type UsageRange } from '@/data/usage'
import { setAccount } from '@/redux/demoSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { cn } from '@/utils/cn'

const CARD_CLASS =
  'rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10'
const HEADING_CLASS = 'text-brand-navy dark:text-slate-100'
const LABEL_CLASS = 'text-slate-500 dark:text-slate-400'

export default function AccountPanel() {
  const { t } = useTranslation('copilot')
  const dispatch = useAppDispatch()
  const { selectedCustomerId, selectedAccountId } = useAppSelector((s) => s.demoSlice)
  const customer = findCustomer(selectedCustomerId)
  const account = findAccount(customer, selectedAccountId)
  const [range, setRange] = useState<UsageRange>('1Y')

  // Reset the range whenever the account changes so the behaviour is symmetric
  // (not an accident of unmount timing on customer switch).
  useEffect(() => setRange('1Y'), [selectedAccountId])

  // Derive the history once per (account, range) rather than on every render.
  const usage = useMemo(() => {
    if (!account) return null
    const series = rangeSeries(account, range)
    return {
      series,
      stats: usageStats(account),
      maxUsage: Math.max(...series.map((p) => p.value), 1),
    }
  }, [account, range])

  if (!customer || !account || !usage) return null
  const { series, stats, maxUsage } = usage

  const span =
    series.length > 1
      ? `${series[0].label} ${series[0].year} – ${series[series.length - 1].label} ${
          series[series.length - 1].year
        }`
      : ''

  return (
    <div className="flex h-full flex-col">
      {/* Identity */}
      <div className="shrink-0 border-b border-slate-200 px-4 py-3.5 dark:border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn('truncate font-semibold', HEADING_CLASS)}>{customer.name}</p>
            <p className={cn('text-xs', LABEL_CLASS)}>
              {t('account.customerSince', { id: customer.id, since: customer.since })}
            </p>
          </div>
          <StatusBadge status={account.status} />
        </div>

        {customer.accounts.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {customer.accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => dispatch(setAccount(a.id))}
                className={cn(
                  'inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
                  a.id === account.id
                    ? 'bg-brand-cyan/10 text-brand-navy ring-1 ring-brand-cyan/30 dark:bg-brand-cyan/15 dark:text-white dark:ring-brand-cyan/40'
                    : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10',
                )}
              >
                <span className="text-brand-cyan">{a.type}</span>
                <span className={LABEL_CLASS}>{a.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="scrollbar-slim flex-1 space-y-4 overflow-y-auto p-4">
        {/* Contact + service */}
        <div className={cn('space-y-3', CARD_CLASS)}>
          <Row icon={Mail} label={t('account.email')} value={customer.email} />
          <Row icon={Phone} label={t('account.phone')} value={customer.phone} />
          <Row icon={MapPin} label={t('account.serviceAddress')} value={account.serviceAddress} />
          <Row icon={Gauge} label={t('account.meter')} value={`${account.meterId} · ${account.type}`} />
        </div>

        {/* Balance */}
        <div className={CARD_CLASS}>
          <div className={cn('flex items-center gap-2 text-sm font-medium', HEADING_CLASS)}>
            <CreditCard className="h-4 w-4 text-brand-cyan" />
            {t('account.balance')}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  account.balance > 0 ? HEADING_CLASS : 'text-emerald-700 dark:text-emerald-400',
                )}
              >
                {account.balance > 0 ? formatCurrency(account.balance) : '$0.00'}
              </p>
              <p className={cn('flex items-center gap-1 text-xs', LABEL_CLASS)}>
                <CalendarClock className="h-3 w-3" />
                {account.balance > 0
                  ? t('account.due', { date: account.dueDate })
                  : t('account.nothingDue')}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
                account.autopay
                  ? 'bg-brand-cyan/10 text-brand-cyan ring-brand-cyan/30'
                  : cn(LABEL_CLASS, 'ring-slate-200 dark:ring-white/15'),
              )}
            >
              {account.autopay ? t('account.autopayOn') : t('account.autopayOff')}
            </span>
          </div>
        </div>

        {/* Usage history */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between">
            <p className={cn('text-sm font-medium', HEADING_CLASS)}>
              {t('account.usage')} <span className={LABEL_CLASS}>({account.unit})</span>
            </p>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.06]">
              {USAGE_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  title={t(`usage.range.${r}`, RANGE_LABEL[r])}
                  className={cn(
                    'min-h-[28px] min-w-[34px] rounded-md px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
                    range === r
                      ? 'bg-brand-cyan text-brand-navy'
                      : 'text-slate-500 hover:text-brand-navy dark:text-slate-400 dark:hover:text-white',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Bars */}
          <div className="mt-4 flex h-28 items-end gap-[3px]">
            {series.map((p, i) => {
              const h = p.value === 0 ? 2 : Math.max(6, Math.round((p.value / maxUsage) * 100))
              const isPeak =
                stats.peak != null &&
                p.year === stats.peak.year &&
                p.monthIndex === stats.peak.monthIndex
              return (
                <div
                  key={`${p.year}-${p.monthIndex}-${i}`}
                  className={cn(
                    'flex-1 rounded-t-sm transition-all',
                    p.value === 0
                      ? 'bg-slate-300 dark:bg-white/10'
                      : isPeak
                        ? 'bg-brand-red'
                        : 'bg-[#16789f] dark:bg-brand-cyan/70',
                  )}
                  style={{ height: `${h}%` }}
                  title={`${p.label} ${p.year}: ${p.value.toLocaleString()} ${account.unit}`}
                />
              )
            })}
          </div>
          {span && <p className={cn('mt-2 text-center text-[10px]', LABEL_CLASS)}>{span}</p>}

          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-100 dark:bg-white/[0.06]">
            <Stat label={t('account.thisYear')} value={stats.thisYear.toLocaleString()} unit={account.unit} />
            <Stat label={t('account.lastYear')} value={stats.lastYear.toLocaleString()} unit={account.unit} />
            <Stat label={t('account.avgMonthly')} value={stats.avgMonthly.toLocaleString()} unit={account.unit} />
            <Stat
              label={t('account.peakMonth')}
              value={stats.peak ? stats.peak.value.toLocaleString() : '—'}
              unit={stats.peak ? `${account.unit} · ${stats.peak.label}` : ''}
            />
          </div>
          <YoY pct={stats.yoyPct} />
        </div>

        {/* Notifications */}
        <div className={CARD_CLASS}>
          <div className={cn('flex items-center gap-2 text-sm font-medium', HEADING_CLASS)}>
            <Bell className="h-4 w-4 text-brand-cyan" />
            {t('account.notifications')}
          </div>
          <ul className="mt-3 space-y-2">
            {account.notifications.map((n) => (
              <li
                key={n}
                className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/[0.03] dark:text-slate-300"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className={cn('text-xs', LABEL_CLASS)}>{label}</p>
        <p className="break-words font-medium text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white px-3 py-2.5 dark:bg-brand-navydeep/40">
      <p className={cn('text-[10px] uppercase tracking-wide', LABEL_CLASS)}>{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', HEADING_CLASS)}>
        {value} {unit && <span className={cn('text-[10px] font-normal', LABEL_CLASS)}>{unit}</span>}
      </p>
    </div>
  )
}

function YoY({ pct }: { pct: number | null }) {
  const { t } = useTranslation('copilot')
  if (pct === null) {
    return (
      <p className={cn('mt-2 text-center text-[11px]', LABEL_CLASS)}>{t('account.noBaseline')}</p>
    )
  }
  const up = pct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  const color = up ? 'text-red-700 dark:text-brand-red' : 'text-emerald-700 dark:text-emerald-400'
  return (
    <div className={cn('mt-2.5 flex items-center justify-center gap-1.5 text-xs', LABEL_CLASS)}>
      <Icon className={cn('h-3.5 w-3.5', color)} />
      <span className={cn('font-semibold', color)}>
        {up ? '+' : ''}
        {pct.toFixed(0)}%
      </span>
      <span>{t('account.yoy')}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Account['status'] }) {
  const map: Record<Account['status'], string> = {
    Active:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
    Pending:
      'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
    Final:
      'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/15',
  }
  return (
    <span
      className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', map[status])}
    >
      {status}
    </span>
  )
}
