/**
 * The persistent lg+ "context" sidebar beside the conversation. Surfaces
 * everything the demo knows about the account in context: identity, contact,
 * balance, usage history with stats, and notices — stacked in one scroll.
 *
 * Below lg this same context is reached one card at a time through `AccountRail`,
 * so every card body lives in ./account/cards and is shared by both surfaces;
 * this file only supplies the sidebar's chrome (identity strip + boxed cards).
 */

import { Bell, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AccountSwitcher,
  BalanceContent,
  CARD_CLASS,
  ContactContent,
  IdentityInfo,
  LABEL_CLASS,
  NotificationsContent,
  SectionHeading,
  UsageContent,
} from '@/containers/copilot/components/account/cards'
import { useAccountContext } from '@/containers/copilot/components/account/useAccountContext'

export default function AccountPanel() {
  const { t } = useTranslation('copilot')
  const { customer, account } = useAccountContext()
  if (!customer || !account) return null

  return (
    <div className="flex h-full flex-col">
      {/* Identity */}
      <div className="shrink-0 border-b border-slate-200 px-4 py-3.5 dark:border-white/10">
        <IdentityInfo />
        {/* `empty:mt-0` swallows the gap for single-account customers, where the
            switcher renders nothing. */}
        <div className="mt-3 empty:mt-0">
          <AccountSwitcher />
        </div>
      </div>

      <div className="scrollbar-slim flex-1 space-y-4 overflow-y-auto p-4">
        {/* Contact + service */}
        <div className={CARD_CLASS}>
          <ContactContent />
        </div>

        {/* Balance */}
        <div className={CARD_CLASS}>
          <SectionHeading icon={CreditCard}>{t('account.balance')}</SectionHeading>
          <div className="mt-2">
            <BalanceContent />
          </div>
        </div>

        {/* Usage history */}
        <div className={CARD_CLASS}>
          <UsageContent
            label={
              <>
                {t('account.usage')} <span className={LABEL_CLASS}>({account.unit})</span>
              </>
            }
          />
        </div>

        {/* Notifications */}
        <div className={CARD_CLASS}>
          <SectionHeading icon={Bell}>{t('account.notifications')}</SectionHeading>
          <div className="mt-3">
            <NotificationsContent />
          </div>
        </div>
      </div>
    </div>
  )
}
