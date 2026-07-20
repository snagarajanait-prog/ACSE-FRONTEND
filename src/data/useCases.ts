/**
 * The use-case "tablets/pills" shown inside the chatbot. Each maps 1:1 to a
 * scripted storyboard in scenarios.ts. Icons are referenced by name and resolved
 * in the component so the data stays presentation-free.
 */
export interface UseCase {
  id: string
  label: string
  /** The message the user "sends" when the pill is clicked. */
  prompt: string
  icon: string
  category: "Service" | "Billing" | "Account" | "Emergency"
}

export const useCases: UseCase[] = [
  {
    id: "start-service",
    label: "Start service",
    prompt: "I'd like to start water service at a new address.",
    icon: "Power",
    category: "Service",
  },
  {
    id: "stop-service",
    label: "Stop service",
    prompt: "I need to stop service — I'm moving out.",
    icon: "PowerOff",
    category: "Service",
  },
  {
    id: "transfer-service",
    label: "Transfer service",
    prompt: "I'm moving and want to transfer my service to a new home.",
    icon: "ArrowLeftRight",
    category: "Service",
  },
  {
    id: "high-bill",
    label: "Why is my bill high?",
    prompt: "Why is my bill so high this month?",
    icon: "TrendingUp",
    category: "Billing",
  },
  {
    id: "payment-arrangement",
    label: "Payment arrangement",
    prompt: "Can I set up a payment arrangement for my balance?",
    icon: "CalendarClock",
    category: "Billing",
  },
  {
    id: "report-outage",
    label: "Report / check outage",
    prompt: "Is there an outage in my area right now?",
    icon: "CloudOff",
    category: "Service",
  },
  {
    id: "update-contact",
    label: "Update contact info",
    prompt: "I need to update the phone number on my account.",
    icon: "UserCog",
    category: "Account",
  },
  {
    id: "report-leak",
    label: "Report a leak",
    prompt: "There's water leaking near my meter — this is urgent.",
    icon: "Droplets",
    category: "Emergency",
  },
]

export function findUseCase(id: string | null) {
  return useCases.find((u) => u.id === id)
}
