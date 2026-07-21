import { describe, it, expect } from 'vitest'
import { assessProofForensics, parsePdfDate, decideDuplicateEvidence, applyForensicsGate } from '@/lib/proof-forensics'

describe('parsePdfDate', () => {
  it('parses the PDF D: format', () => {
    expect(parsePdfDate('D:20260115093000Z')).toBe('2026-01-15')
    expect(parsePdfDate("D:20250301120000+08'00'")).toBe('2025-03-01')
  })
  it('returns null for garbage', () => {
    expect(parsePdfDate(undefined)).toBeNull()
    expect(parsePdfDate('yesterday')).toBeNull()
  })
})

describe('assessProofForensics', () => {
  it('flags image-editor producers', () => {
    const r = assessProofForensics({ producer: 'Adobe Photoshop 25.0', creator: null, creationDate: '2026-01-10' }, 2026)
    expect(r.suspicious).toBe(true)
    expect(r.signals).toContain('edited_with_image_editor')
  })

  it('flags creation dates far outside the admission cycle', () => {
    const late = assessProofForensics({ producer: 'Microsoft Word', creator: null, creationDate: '2028-06-01' }, 2026)
    expect(late.suspicious).toBe(true)
    expect(late.signals).toContain('implausible_creation_date')
    const early = assessProofForensics({ producer: null, creator: null, creationDate: '2023-01-01' }, 2026)
    expect(early.signals).toContain('implausible_creation_date')
  })

  it('a normal in-cycle office/print PDF is clean; missing metadata is not suspicious', () => {
    expect(assessProofForensics({ producer: 'Microsoft: Print To PDF', creator: 'Word', creationDate: '2026-02-20' }, 2026).suspicious).toBe(false)
    expect(assessProofForensics({ producer: null, creator: null, creationDate: null }, 2026).suspicious).toBe(false)
  })
})

describe('decideDuplicateEvidence', () => {
  it('same file from another author is a duplicate; own re-upload is not', () => {
    expect(decideDuplicateEvidence({ ownersOfSameHash: ['other-user'], currentAuthor: 'me' })).toBe(true)
    expect(decideDuplicateEvidence({ ownersOfSameHash: ['me'], currentAuthor: 'me' })).toBe(false)
    expect(decideDuplicateEvidence({ ownersOfSameHash: [], currentAuthor: 'me' })).toBe(false)
  })
})

describe('applyForensicsGate', () => {
  it('duplicates force mismatch regardless of the AI verdict', () => {
    expect(applyForensicsGate('verified', { suspicious: false, signals: [] }, true)).toBe('mismatch')
  })
  it('suspicious forensics downgrade verified to unverified (admin review), never upgrade', () => {
    expect(applyForensicsGate('verified', { suspicious: true, signals: ['edited_with_image_editor'] }, false)).toBe('unverified')
    expect(applyForensicsGate('unverified', { suspicious: false, signals: [] }, false)).toBe('unverified')
    expect(applyForensicsGate('mismatch', { suspicious: false, signals: [] }, false)).toBe('mismatch')
  })
  it('clean forensics leave the verdict alone', () => {
    expect(applyForensicsGate('verified', { suspicious: false, signals: [] }, false)).toBe('verified')
  })
})
