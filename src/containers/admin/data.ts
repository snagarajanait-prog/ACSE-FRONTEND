/**
 * Seed rows for the admin file library — mock data, mirroring the design mockup.
 *
 * There is no backend yet: the hook loads these on first run, then persists the
 * working set (seed + user uploads − deletions) to localStorage so the panel
 * survives a refresh. Reset by clearing the `acse.admin.files` key.
 *
 * Dates are fixed ISO strings, not `new Date()`, so the table renders
 * deterministically and the same fixtures show up for everyone demoing it.
 */

import type { FileRecord } from '@/containers/admin/types'

/** Suggested categories offered in the upload form, per section. */
export const CATEGORY_OPTIONS: Record<FileRecord['section'], string[]> = {
  document: ['Financial', 'Quarterly', 'HR', 'Legal', 'Policy', 'Report', 'Other'],
  image: ['Branding', 'Product', 'Marketing', 'Screenshot', 'Diagram', 'Other'],
}

export const SEED_FILES: FileRecord[] = [
  {
    id: 'DOC-4801',
    section: 'document',
    fileName: 'Legal_Contract.pdf',
    category: 'Legal',
    uploadedBy: 'Robert Chen',
    uploadedAt: '2026-07-10T09:12:00.000Z',
    size: 2_411_520,
    notes: 'NDA template',
  },
  {
    id: 'DOC-4802',
    section: 'document',
    fileName: 'Q2_Financials.xlsx',
    category: 'Financial',
    uploadedBy: 'Robert Chen',
    uploadedAt: '2026-07-10T14:40:00.000Z',
    size: 986_112,
    notes: 'Quarterly financials',
  },
  {
    id: 'DOC-4803',
    section: 'document',
    fileName: 'Board_Deck_2026.pptx',
    category: 'Quarterly',
    uploadedBy: 'Sarah Kim',
    uploadedAt: '2026-07-17T11:05:00.000Z',
    size: 5_320_704,
  },
  {
    id: 'DOC-4804',
    section: 'document',
    fileName: 'Employee_Handbook.docx',
    category: 'HR',
    uploadedBy: 'Sarah Kim',
    uploadedAt: '2026-07-14T08:30:00.000Z',
    size: 1_204_224,
    notes: 'Updated 2026',
  },
  {
    id: 'DOC-4805',
    section: 'document',
    fileName: 'Team_Policy.pdf',
    category: 'Policy',
    uploadedBy: 'James Okafor',
    uploadedAt: '2026-07-10T16:22:00.000Z',
    size: 742_400,
    notes: 'Annual team policy',
  },
  {
    id: 'DOC-4806',
    section: 'document',
    fileName: 'Vendor_Agreement.pdf',
    category: 'Legal',
    uploadedBy: 'Lisa Wang',
    uploadedAt: '2026-07-06T10:48:00.000Z',
    size: 1_658_880,
  },
  {
    id: 'IMG-2201',
    section: 'image',
    fileName: 'Logo_Primary.png',
    category: 'Branding',
    uploadedBy: 'Robert Chen',
    uploadedAt: '2026-07-15T13:10:00.000Z',
    size: 318_464,
    notes: 'Transparent background',
  },
  {
    id: 'IMG-2202',
    section: 'image',
    fileName: 'Product_Hero.jpg',
    category: 'Product',
    uploadedBy: 'Lisa Wang',
    uploadedAt: '2026-07-12T09:55:00.000Z',
    size: 2_097_152,
  },
  {
    id: 'IMG-2203',
    section: 'image',
    fileName: 'Campaign_Banner.png',
    category: 'Marketing',
    uploadedBy: 'Sarah Kim',
    uploadedAt: '2026-07-09T15:30:00.000Z',
    size: 874_496,
    notes: 'Summer launch',
  },
]
