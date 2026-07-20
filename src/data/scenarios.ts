/**
 * Scripted chatbot storyboards: pick a use case and the AI walks the request
 * from start to finish with mock data.
 *
 * Text may contain tokens resolved at render time against the selected account:
 *   {name}          customer name
 *   {account}       account number (chatbot context)
 *   {address}       service address
 *   {email}         email on file
 *   {source}        neutral name of the active mode ("the ACSE service platform")
 *   {sourceSystem}  neutral platform name of the active mode
 *
 * The {source} tokens are what make the active mode visible in the conversation
 * itself. They always resolve to the neutral chat vocabulary — an internal
 * system is never named to the customer.
 *
 * `think` (optional on ai/status/summary steps): a list of short status phrases
 * shown one-by-one with a shimmering "working" animation just before the step
 * appears — e.g. ["Analysing your request", "Reading usage history"]. When
 * omitted, a sensible default sequence is generated automatically.
 */

export type ChatStep =
  | { kind: "user"; text: string }
  | { kind: "ai"; text: string; think?: string[] }
  /** A system status line (renders with a small activity indicator). */
  | { kind: "status"; text: string; think?: string[] }
  /**
   * Identity verification card (SMS / email OTP).
   *
   * `text` is the card body once the code is accepted. `prompt` is the
   * instruction shown above the entry boxes while the assistant waits for the
   * customer to key a code in — its presence is what makes a step *able* to
   * challenge; whether it actually does is decided at play time by the engine.
   * `entered` is filled in at runtime with the digits the customer typed.
   */
  | {
      kind: "otp"
      channel: "sms" | "email"
      text: string
      prompt?: string
      entered?: string
    }
  /** A structured summary / confirmation card. */
  | { kind: "summary"; title: string; tone?: "info" | "success"; rows: [string, string][]; think?: string[] }
  /** Final success line. */
  | { kind: "done"; text: string }

export interface Scenario {
  id: string
  /** One-line description of what the storyboard demonstrates. */
  summary: string
  steps: ChatStep[]
}

const scenarios: Record<string, Scenario> = {
  "start-service": {
    id: "start-service",
    summary: "Authenticate, validate the service area, and submit a start request.",
    steps: [
      { kind: "user", text: "I'd like to start water service at a new address." },
      { kind: "ai", text: "Happy to help you start service, {name}. First I need to confirm it's really you on account {account}." },
      { kind: "status", text: "Sending a one-time code to the email on file…" },
      { kind: "otp", channel: "email",
        text: "Identity confirmed with the code sent to {email}.",
        prompt: "We emailed a 6-digit code to {email}. Enter it below to continue." },
      { kind: "ai", text: "Thanks — you're verified. Which address would you like to start service at?" },
      { kind: "user", text: "1450 Oak Meadow Dr, Santa Clara, CA 95051." },
      { kind: "status", text: "Checking the address against the utility service territory…" },
      { kind: "ai", text: "That address is inside our service county. I'll need your requested start date and contact type to open the request." },
      { kind: "user", text: "Start next Monday, residential." },
      { kind: "status", text: "Connecting to {source} to submit the start-service request…",
        think: ["Validating service territory", "Preparing the request", "Submitting to {source}"] },
      { kind: "summary", title: "Start service request", tone: "info", rows: [
        ["Account", "{account}"],
        ["Service address", "1450 Oak Meadow Dr, Santa Clara"],
        ["Request type", "Residential — Start service"],
        ["Requested date", "Mon, next week"],
        ["Routed to", "{sourceSystem}"],
      ] },
      { kind: "ai", text: "Request submitted. A back-office activity was created and the field team will confirm the turn-on." },
      { kind: "done", text: "Start-service request logged to {source} and to the audit trail. Reference SR-4471-190." },
    ],
  },

  "stop-service": {
    id: "stop-service",
    summary: "Verify the customer, confirm a move-out date, and schedule a final bill.",
    steps: [
      { kind: "user", text: "I need to stop service — I'm moving out." },
      { kind: "ai", text: "I can take care of that, {name}. Let me verify account {account} before making changes." },
      { kind: "status", text: "Sending a verification code by email…" },
      { kind: "otp", channel: "email", text: "Code sent to the email on file. (Verified automatically)" },
      { kind: "ai", text: "Verified. What date should service end at {address}?" },
      { kind: "user", text: "This Friday, please." },
      { kind: "status", text: "Scheduling the stop and estimating the final bill via {source}…" },
      { kind: "summary", title: "Stop service confirmation", tone: "info", rows: [
        ["Account", "{account}"],
        ["Service ends", "This Friday"],
        ["Estimated final bill", "$18.60"],
        ["Final read", "Scheduled — field activity created"],
        ["Processed in", "{sourceSystem}"],
      ] },
      { kind: "done", text: "Move-out scheduled and a final read work order was created. You'll get the closing statement by email." },
    ],
  },

  "transfer-service": {
    id: "transfer-service",
    summary: "One flow that stops service at the old home and starts it at the new one.",
    steps: [
      { kind: "user", text: "I'm moving and want to transfer my service to a new home." },
      { kind: "ai", text: "Great — a transfer keeps everything on one account, {name}. Verifying account {account} first." },
      { kind: "status", text: "Sending a one-time code to the phone on file…" },
      { kind: "otp", channel: "sms", text: "Code sent by SMS. (Verified automatically)" },
      { kind: "ai", text: "You're verified. What's the new service address and move date?" },
      { kind: "user", text: "905 Birchwood Ln, San Jose — moving on the 1st." },
      { kind: "status", text: "Validating the new address is in our territory…" },
      { kind: "ai", text: "Confirmed in-territory. I'll close the current stop and open the new start together." },
      { kind: "status", text: "Submitting the transfer to {source}…" },
      { kind: "summary", title: "Transfer service", tone: "info", rows: [
        ["Account", "{account}"],
        ["Stop at", "{address}"],
        ["Start at", "905 Birchwood Ln, San Jose"],
        ["Move date", "The 1st"],
        ["Routed to", "{sourceSystem}"],
      ] },
      { kind: "done", text: "Transfer submitted as a single request. No gap in service — reference SR-5112-078." },
    ],
  },

  "high-bill": {
    id: "high-bill",
    summary: "Review consumption history, detect the spike, and open a meter investigation.",
    steps: [
      { kind: "user", text: "Why is my bill so high this month?" },
      { kind: "ai", text: "Let me look into that for you, {name}. Pulling the usage history for account {account}.",
        think: ["Analysing your request", "Reading 12 months of usage", "Detecting anomalies"] },
      { kind: "status", text: "Reading consumption history from {source}…" },
      { kind: "ai", text: "Your last two billing cycles are well above your baseline — up about 62% from your spring average. That pattern usually points to a leak or a meter anomaly." },
      { kind: "summary", title: "Consumption review", tone: "info", rows: [
        ["Account", "{account}"],
        ["Baseline (spring avg)", "~4,200 gal"],
        ["Last cycle", "9,240 gal"],
        ["Change", "+62%"],
        ["Assessment", "Anomaly — recommend meter investigation"],
      ] },
      { kind: "ai", text: "I can open a field activity to have the meter checked at no cost. Want me to schedule it?" },
      { kind: "user", text: "Yes, please schedule it." },
      { kind: "status", text: "Creating a meter-investigation work order in {source}…" },
      { kind: "done", text: "Field activity created and dispatched. You'll get an ETA by text — reference FA-8841-A." },
    ],
  },

  "payment-arrangement": {
    id: "payment-arrangement",
    summary: "Negotiate a policy-compliant payment plan and log it to the account.",
    steps: [
      { kind: "user", text: "Can I set up a payment arrangement for my balance?" },
      { kind: "ai", text: "Of course, {name}. Let me review the balance on account {account}." },
      { kind: "status", text: "Fetching balance and payment history from {source}…" },
      { kind: "ai", text: "Your current balance is $152.75 and part of it is past due. Based on your history and our arrangement policy, you qualify for a 3-month plan." },
      { kind: "summary", title: "Proposed payment plan", tone: "info", rows: [
        ["Account", "{account}"],
        ["Balance", "$152.75"],
        ["Plan", "3 monthly installments"],
        ["Monthly amount", "$50.92"],
        ["First payment", "Jul 22, 2026"],
      ] },
      { kind: "user", text: "That works for me." },
      { kind: "status", text: "Logging the arrangement to {source}…" },
      { kind: "done", text: "Payment arrangement set up and confirmed. A summary was emailed to you — reference PA-6334-512." },
    ],
  },

  "report-outage": {
    id: "report-outage",
    summary: "Give a real-time service status for the address without agent escalation.",
    steps: [
      { kind: "user", text: "Is there an outage in my area right now?" },
      { kind: "ai", text: "Let me check the live status for {address}." },
      { kind: "status", text: "Querying network status from {source}…" },
      { kind: "summary", title: "Service status", tone: "info", rows: [
        ["Address", "{address}"],
        ["Status", "Planned maintenance"],
        ["Affected", "Water — low pressure"],
        ["Estimated restore", "Today, 4:30 PM"],
        ["Crew", "On site"],
      ] },
      { kind: "ai", text: "There's planned maintenance affecting your street; pressure should be back to normal by 4:30 PM today. Want a text when it's restored?" },
      { kind: "user", text: "Yes, notify me." },
      { kind: "done", text: "You're subscribed to restoration alerts for this address." },
    ],
  },

  "update-contact": {
    id: "update-contact",
    summary: "Verify identity and update account contact details instantly.",
    steps: [
      { kind: "user", text: "I need to update the phone number on my account." },
      { kind: "ai", text: "Sure, {name}. I just need to verify account {account} before changing contact details." },
      { kind: "status", text: "Sending a verification code by email…" },
      { kind: "otp", channel: "email", text: "Code sent to the email on file. (Verified automatically)" },
      { kind: "ai", text: "Verified. What's the new phone number?" },
      { kind: "user", text: "(408) 555-0207" },
      { kind: "status", text: "Updating contact details in {source}…" },
      { kind: "summary", title: "Contact updated", tone: "success", rows: [
        ["Account", "{account}"],
        ["New phone", "(408) 555-0207"],
        ["Notifications", "SMS re-enabled"],
        ["Updated in", "{sourceSystem}"],
      ] },
      { kind: "done", text: "Your phone number is updated and the change is recorded in the audit log." },
    ],
  },

  "report-leak": {
    id: "report-leak",
    summary: "Capture an emergency report and route it straight to dispatch.",
    steps: [
      { kind: "user", text: "There's water leaking near my meter — this is urgent." },
      { kind: "ai", text: "Thanks for flagging this, {name}. I'm treating it as an emergency and won't make you wait on verification." },
      { kind: "status", text: "Capturing the emergency report for {address}…" },
      { kind: "ai", text: "For your safety, please keep clear of the meter area until a technician arrives." },
      { kind: "status", text: "Routing to emergency dispatch via {source}…" },
      { kind: "summary", title: "Emergency work order", tone: "success", rows: [
        ["Account", "{account}"],
        ["Type", "Leak — near meter"],
        ["Priority", "Emergency"],
        ["Dispatch", "Crew notified"],
        ["ETA", "Within 60 minutes"],
      ] },
      { kind: "done", text: "Emergency work order created and dispatched. A crew is on the way — reference EM-9153-277." },
    ],
  },
}

export function getScenario(id: string | null): Scenario | undefined {
  if (!id) return undefined
  return scenarios[id]
}
