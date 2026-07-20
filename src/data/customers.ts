/**
 * Synthetic customer data — the "list of values" the client wants shown before
 * the chatbot. No real users exist in the demo; everything here is mock data,
 * and several customers intentionally have multiple accounts (per Siva's ask).
 *
 * In the live product the same records live in either the C2M application or the
 * Autonomous DB depending on the internal data-source toggle.
 */

export type ServiceType = "Water" | "Electric" | "Gas"
export type AccountStatus = "Active" | "Pending" | "Final"

export interface UsagePoint {
  month: string
  value: number
}

export interface Account {
  /** Account number shown to the user and used as the chatbot context key. */
  id: string
  type: ServiceType
  serviceAddress: string
  status: AccountStatus
  balance: number
  dueDate: string
  autopay: boolean
  meterId: string
  unit: string
  /** Trailing six-month usage, oldest first. */
  usage: UsagePoint[]
  /** Short account-level notices surfaced on the dashboard. */
  notifications: string[]
}

export interface Customer {
  /** Customer number — the primary key end users pick from the list. */
  id: string
  name: string
  email: string
  phone: string
  since: string
  accounts: Account[]
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

function usage(values: number[]): UsagePoint[] {
  return values.map((value, i) => ({ month: months[i], value }))
}

export const customers: Customer[] = [
  {
    id: "CUST-100482",
    name: "Robert Chen",
    email: "r.chen@example.com",
    phone: "(415) 555-0142",
    since: "2016",
    accounts: [
      {
        id: "WTR-47829301",
        type: "Water",
        serviceAddress: "218 Marlow Ave, Fremont, CA 94536",
        status: "Active",
        balance: 84.5,
        dueDate: "Jul 28, 2026",
        autopay: true,
        meterId: "MTR-8841-A",
        unit: "gal",
        usage: usage([4210, 3980, 4520, 6120, 8890, 9240]),
        notifications: ["Usage up 62% vs. spring average", "Autopay active"],
      },
      {
        id: "WTR-47829344",
        type: "Water",
        serviceAddress: "12 Cedar Court, Fremont, CA 94538",
        status: "Active",
        balance: 39.1,
        dueDate: "Jul 28, 2026",
        autopay: true,
        meterId: "MTR-9102-B",
        unit: "gal",
        usage: usage([2100, 2240, 2050, 2310, 2180, 2260]),
        notifications: ["Rental property — paperless billing"],
      },
    ],
  },
  {
    id: "CUST-100517",
    name: "Maria Gonzalez",
    email: "maria.g@example.com",
    phone: "(408) 555-0199",
    since: "2019",
    accounts: [
      {
        id: "WTR-51120078",
        type: "Water",
        serviceAddress: "905 Birchwood Ln, San Jose, CA 95126",
        status: "Active",
        balance: 0,
        dueDate: "—",
        autopay: true,
        meterId: "MTR-4471-C",
        unit: "gal",
        usage: usage([3100, 2980, 3050, 3210, 3180, 3020]),
        notifications: ["Autopay expires Aug 2, 2026", "Account in good standing"],
      },
    ],
  },
  {
    id: "CUST-100639",
    name: "James Patterson",
    email: "jpatterson@example.com",
    phone: "(510) 555-0173",
    since: "2012",
    accounts: [
      {
        id: "WTR-63340512",
        type: "Water",
        serviceAddress: "77 Hollis St, Oakland, CA 94608",
        status: "Active",
        balance: 152.75,
        dueDate: "Jul 22, 2026",
        autopay: false,
        meterId: "MTR-3320-D",
        unit: "gal",
        usage: usage([5200, 5100, 4980, 0, 0, 0]),
        notifications: ["3 consecutive zero reads flagged", "Balance past due"],
      },
      {
        id: "ELE-63340987",
        type: "Electric",
        serviceAddress: "77 Hollis St, Oakland, CA 94608",
        status: "Active",
        balance: 68.2,
        dueDate: "Jul 30, 2026",
        autopay: false,
        meterId: "MTR-7781-E",
        unit: "kWh",
        usage: usage([540, 512, 498, 610, 720, 760]),
        notifications: ["Summer usage trending high"],
      },
    ],
  },
  {
    id: "CUST-100744",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "(669) 555-0121",
    since: "2021",
    accounts: [
      {
        id: "WTR-74451190",
        type: "Water",
        serviceAddress: "1450 Oak Meadow Dr, Santa Clara, CA 95051",
        status: "Pending",
        balance: 0,
        dueDate: "—",
        autopay: false,
        meterId: "MTR-1190-F",
        unit: "gal",
        usage: usage([0, 0, 0, 0, 0, 0]),
        notifications: ["New service application in review"],
      },
    ],
  },
  {
    id: "CUST-100862",
    name: "David Okafor",
    email: "d.okafor@example.com",
    phone: "(925) 555-0188",
    since: "2015",
    accounts: [
      {
        id: "WTR-86620433",
        type: "Water",
        serviceAddress: "330 Sunset Blvd, Walnut Creek, CA 94596",
        status: "Active",
        balance: 47.9,
        dueDate: "Aug 4, 2026",
        autopay: true,
        meterId: "MTR-0433-G",
        unit: "gal",
        usage: usage([3600, 3720, 3540, 3680, 3610, 3590]),
        notifications: ["Account in good standing"],
      },
      {
        id: "GAS-86620455",
        type: "Gas",
        serviceAddress: "330 Sunset Blvd, Walnut Creek, CA 94596",
        status: "Active",
        balance: 22.4,
        dueDate: "Aug 4, 2026",
        autopay: true,
        meterId: "MTR-0455-H",
        unit: "therm",
        usage: usage([48, 52, 44, 30, 22, 19]),
        notifications: ["Low seasonal usage"],
      },
    ],
  },
  {
    id: "CUST-100915",
    name: "Sarah Whitfield",
    email: "s.whitfield@example.com",
    phone: "(650) 555-0164",
    since: "2018",
    accounts: [
      {
        id: "WTR-91530277",
        type: "Water",
        serviceAddress: "58 Larkspur Way, Redwood City, CA 94061",
        status: "Final",
        balance: 18.6,
        dueDate: "Jul 19, 2026",
        autopay: false,
        meterId: "MTR-0277-J",
        unit: "gal",
        usage: usage([2900, 3010, 2850, 2100, 900, 0]),
        notifications: ["Move-out scheduled", "Final bill pending"],
      },
    ],
  },
]

export function findCustomer(id: string | null): Customer | undefined {
  if (!id) return undefined
  return customers.find((c) => c.id === id)
}

export function findAccount(
  customer: Customer | undefined,
  accountId: string | null
): Account | undefined {
  if (!customer || !accountId) return undefined
  return customer.accounts.find((a) => a.id === accountId)
}
