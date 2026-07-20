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
import Button from '@/components/Button'
import type { Lead } from '@/redux/demoSlice'
import { cn } from '@/utils/cn'

const interests = [
  'Customer service automation',
  'Billing exception workflows',
  'Both — full platform',
  'A walkthrough / pricing',
]

const FIELD_CLASS = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition',
  'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
)

interface ContactSectionProps {
  onSubmitLead: (lead: Lead) => void
}

export default function ContactSection({ onSubmitLead }: ContactSectionProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [interest, setInterest] = useState(interests[3])
  const [notes, setNotes] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmitLead({ name: `${firstName} ${lastName}`.trim(), email, organization, interest })
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
              Get in touch
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-slate-100">
              See ACSE AI in action
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We work with water and utility providers of all sizes. Tell us about your operation and
              we&apos;ll show you exactly how ACSE AI fits in.
            </p>

            <ul className="mt-8 space-y-4">
              <InfoRow icon={Mail} label="Email" value="info@acsesolutions.com" />
              <InfoRow icon={MapPin} label="Coverage" value="Serving utilities across North America" />
              <InfoRow icon={Clock} label="Response time" value="Within 1 business day" />
            </ul>
          </div>

          {/* Right: form */}
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8 dark:bg-white/[0.03]"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jordan"
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Last name">
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Rivera"
                  className={FIELD_CLASS}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Work email">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@utility.gov"
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Organization">
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Metro Water District"
                  className={FIELD_CLASS}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="I'm interested in">
                <select
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className={FIELD_CLASS}
                >
                  {interests.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Tell us about your current setup">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Systems you run today, call volume, pain points…"
                  rows={4}
                  className={cn(FIELD_CLASS, 'resize-y')}
                />
              </Field>
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full">
              Send message
            </Button>

            {sent && (
              <p
                role="status"
                className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Thanks — your details were captured. For a direct reply, email us at
                  <span className="font-medium"> info@acsesolutions.com</span>.
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
