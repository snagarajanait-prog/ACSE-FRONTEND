/**
 * Lead capture. Nothing is transmitted — the submission only lands in the demo
 * slice — so the confirmation copy says "captured" and points at the address
 * listed alongside rather than promising a reply this page cannot send.
 *
 * Form controls are native elements with shared class tokens instead of a UI
 * library: this is the only form in the app, so a dependency would buy nothing.
 */

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CheckCircle2, Clock, Mail, MapPin } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import Button from '@/components/Button'
import type { Lead } from '@/redux/demoSlice'
import { cn } from '@/utils/cn'

const interestKeys = ['customerService', 'billing', 'both', 'walkthrough']

const FIELD_CLASS = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition',
  'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
)

interface ContactSectionProps {
  onSubmitLead: (lead: Lead) => void
}

export default function ContactSection({ onSubmitLead }: ContactSectionProps) {
  const { t } = useTranslation('landing')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [interest, setInterest] = useState('walkthrough')
  const [notes, setNotes] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmitLead({
      name: `${firstName} ${lastName}`.trim(),
      email,
      organization,
      interest: t(`contact.interests.${interest}`),
    })
    setSent(true)
    setFirstName('')
    setLastName('')
    setEmail('')
    setOrganization('')
    setNotes('')
  }

  return (
    <section id="contact" className="bg-slate-50/70 dark:bg-white/[0.02]">
      <div className="container py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Left: info */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-cyan">
              {t('contact.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-slate-100">
              {t('contact.heading')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t('contact.subtitle')}</p>

            <ul className="mt-8 space-y-4">
              <InfoRow icon={Mail} label={t('contact.info.emailLabel')} value={t('contact.info.emailValue')} />
              <InfoRow
                icon={MapPin}
                label={t('contact.info.coverageLabel')}
                value={t('contact.info.coverageValue')}
              />
              <InfoRow
                icon={Clock}
                label={t('contact.info.responseLabel')}
                value={t('contact.info.responseValue')}
              />
            </ul>
          </div>

          {/* Right: form */}
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8 dark:bg-white/[0.03]"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('contact.form.firstName')}>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('contact.form.firstNamePlaceholder')}
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label={t('contact.form.lastName')}>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('contact.form.lastNamePlaceholder')}
                  className={FIELD_CLASS}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('contact.form.workEmail')}>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('contact.form.workEmailPlaceholder')}
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label={t('contact.form.organization')}>
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder={t('contact.form.organizationPlaceholder')}
                  className={FIELD_CLASS}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label={t('contact.form.interest')}>
                <select
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className={FIELD_CLASS}
                >
                  {interestKeys.map((i) => (
                    <option key={i} value={i}>
                      {t(`contact.interests.${i}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <Field label={t('contact.form.notes')}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('contact.form.notesPlaceholder')}
                  rows={4}
                  className={cn(FIELD_CLASS, 'resize-y')}
                />
              </Field>
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full">
              {t('contact.form.submit')}
            </Button>

            {sent && (
              <p
                role="status"
                className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <Trans
                    t={t}
                    i18nKey="contact.sentMessage"
                    components={{ 1: <span className="font-medium" /> }}
                  />
                </span>
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-navy dark:bg-brand-cyan/15">
        <Icon className="h-4 w-4 text-brand-cyan" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium text-brand-navy dark:text-slate-100">{value}</p>
      </div>
    </li>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}
