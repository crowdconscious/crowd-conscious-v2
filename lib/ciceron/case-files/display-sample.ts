/**
 * Lawyer-facing display for sample case files (B6 F1–F2).
 * Strips DEMO- prefixes and remaps legacy federal seed rows to state-style
 * labels without writing to the database.
 */

export type SampleCaseDisplay = {
  court: string
  fileNumber: string
  juicio: string
  secretaria: string | null
}

/** Legacy federal seed file numbers → state-style display. */
const BY_FILE_NUMBER: Record<string, SampleCaseDisplay> = {
  'DEMO-TFJA-1001/2026': {
    court: 'Trigésimo Primero Civil de Proceso Oral',
    fileNumber: '1001/2026',
    juicio: 'Oral Merc.',
    secretaria: null,
  },
  'DEMO-JDA-220/2026': {
    court: 'Juzgado Décimo Primero Civil',
    fileNumber: '220/2026',
    juicio: 'Ord. Merc.',
    secretaria: null,
  },
  'DEMO-TFJA-331/2026': {
    court: 'Juzgado Cuarto de lo Mercantil',
    fileNumber: '331/2026',
    juicio: 'Ejec. Merc.',
    secretaria: '2',
  },
  'DEMO-AMP-404/2026': {
    court: 'Juzgado Primero Civil de Proceso Oral del Estado de México',
    fileNumber: '404/2026',
    juicio: 'Ejec. Merc.',
    secretaria: null,
  },
  'DEMO-TFJA-515/2026': {
    court: 'Juzgado Segundo Mercantil — Ciudad Judicial',
    fileNumber: '515/2026',
    juicio: 'Oral Merc.',
    secretaria: null,
  },
  'DEMO-CIV-616/2026': {
    court: 'Juzgado Civil de Cuantía Mayor',
    fileNumber: '616/2026',
    juicio: 'Oral Civ.',
    secretaria: null,
  },
  'DEMO-LAB-717/2026': {
    court: 'Juzgado Primero Familiar de Proceso Oral',
    fileNumber: '717/2026',
    juicio: 'Oral Civ.',
    secretaria: '1',
  },
  'DEMO-SCJN-A-808/2026': {
    court: 'Trigésimo Segundo Civil de Proceso Oral',
    fileNumber: '808/2026',
    juicio: 'Ord. Merc.',
    secretaria: null,
  },
}

const BY_CASE_ID: Record<string, SampleCaseDisplay> = {
  'f1000000-0000-4000-8000-000000000001': BY_FILE_NUMBER['DEMO-TFJA-1001/2026']!,
  'f1000000-0000-4000-8000-000000000002': BY_FILE_NUMBER['DEMO-JDA-220/2026']!,
  'f1000000-0000-4000-8000-000000000003': BY_FILE_NUMBER['DEMO-TFJA-331/2026']!,
  'f1000000-0000-4000-8000-000000000004': BY_FILE_NUMBER['DEMO-AMP-404/2026']!,
  'f1000000-0000-4000-8000-000000000005': BY_FILE_NUMBER['DEMO-TFJA-515/2026']!,
  'f1000000-0000-4000-8000-000000000006': BY_FILE_NUMBER['DEMO-CIV-616/2026']!,
  'f1000000-0000-4000-8000-000000000007': BY_FILE_NUMBER['DEMO-LAB-717/2026']!,
  'f1000000-0000-4000-8000-000000000008': BY_FILE_NUMBER['DEMO-SCJN-A-808/2026']!,
  'case-1': BY_FILE_NUMBER['DEMO-TFJA-1001/2026']!,
  'case-2': BY_FILE_NUMBER['DEMO-AMP-404/2026']!,
}

/** Strip DEMO- prefixes; prefer structured remap when known. */
export function displaySampleCase(input: {
  id?: string | null
  fileNumber?: string | null
  court?: string | null
}): SampleCaseDisplay {
  const byId = input.id ? BY_CASE_ID[input.id] : undefined
  if (byId) return byId
  const byFile = input.fileNumber ? BY_FILE_NUMBER[input.fileNumber] : undefined
  if (byFile) return byFile

  const raw = input.fileNumber ?? '—'
  const stripped = raw.replace(/^DEMO-[A-Z]+-/i, '').replace(/^DEMO-/i, '')
  return {
    court: input.court ?? '—',
    fileNumber: stripped,
    juicio: '',
    secretaria: null,
  }
}

export function stripDemoFilePrefix(fileNumber: string | null | undefined): string {
  if (!fileNumber) return '—'
  return displaySampleCase({ fileNumber }).fileNumber
}
