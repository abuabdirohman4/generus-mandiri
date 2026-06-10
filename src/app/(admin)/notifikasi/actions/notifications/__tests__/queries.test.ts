import { describe, it, expect, vi } from 'vitest'
import {
  insertNotification,
  insertRecipients,
  fetchRecipientProfileIds,
  countUnread,
  markRead,
  markAllRead,
  dismiss,
} from '../queries'
import type { NotificationTargetScope } from '@/types/notification'

// ─── Mock Factory ─────────────────────────────────────────────────────────────

function createChain(resolvedValue: any) {
  const chain: any = {}
  const methods = ['select', 'insert', 'update', 'eq', 'in', 'neq', 'order', 'limit', 'single']
  methods.forEach(method => {
    chain[method] = vi.fn().mockReturnValue(chain)
  })
  // Make the chain thenable so `await chain` returns resolvedValue
  chain.then = (resolve: (v: any) => any, _reject?: (e: any) => any) => Promise.resolve(resolvedValue).then(resolve, _reject)
  chain.catch = (reject: (e: any) => any) => Promise.resolve(resolvedValue).catch(reject)
  return chain
}

function createMockSupabase(result: any = { data: [], error: null }) {
  const fromFn = vi.fn().mockReturnValue(createChain(result))
  return { from: fromFn }
}

// ─── insertNotification ───────────────────────────────────────────────────────

describe('insertNotification', () => {
  it('calls from("notifications")', async () => {
    const chain = createChain({ data: { id: 'n1' }, error: null })
    // insert → select → single must resolve
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    await insertNotification(supabase as any, {
      title: 'Test',
      body: 'Body',
      type: 'broadcast',
      target_scope: {},
      sender_id: 'user-1',
    })

    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })
})

// ─── insertRecipients ─────────────────────────────────────────────────────────

describe('insertRecipients', () => {
  it('returns early without calling supabase when rows is empty', async () => {
    const supabase = createMockSupabase()
    const result = await insertRecipients(supabase as any, [])
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result).toEqual({ data: [], error: null })
  })

  it('calls from("notification_recipients") when rows is non-empty', async () => {
    const chain = createChain({ data: null, error: null })
    chain.insert = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    await insertRecipients(supabase as any, [
      { notification_id: 'n1', recipient_id: 'u1' },
    ])

    expect(supabase.from).toHaveBeenCalledWith('notification_recipients')
  })
})

// ─── fetchRecipientProfileIds ─────────────────────────────────────────────────

describe('fetchRecipientProfileIds', () => {
  it('calls from("profiles")', async () => {
    const chain = createChain({ data: [{ id: 'u1' }, { id: 'u2' }], error: null })
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    // Final await resolves via then
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    const scope: NotificationTargetScope = { kelompok_id: 'k1', roles: ['teacher'] }
    await fetchRecipientProfileIds(supabase as any, scope)

    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('returns empty array on error', async () => {
    const chain = createChain({ data: null, error: new Error('db error') })
    chain.select = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    const result = await fetchRecipientProfileIds(supabase as any, {})
    expect(result).toEqual([])
  })

  it('excludes the excludeUserId from results', async () => {
    const chain = createChain({ data: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }], error: null })
    chain.select = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    const result = await fetchRecipientProfileIds(supabase as any, {}, 'u2')
    expect(result).toEqual(['u1', 'u3'])
  })
})

// ─── countUnread ──────────────────────────────────────────────────────────────

describe('countUnread', () => {
  it('calls from("notification_recipients") with count option', async () => {
    const chain = createChain({ count: 5, error: null })
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    const result = await countUnread(supabase as any, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('notification_recipients')
    expect(result).toBe(5)
  })

  it('returns 0 on error', async () => {
    const chain = createChain({ count: null, error: new Error('fail') })
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    const result = await countUnread(supabase as any, 'user-1')
    expect(result).toBe(0)
  })

  it('returns 0 when count is null and no error', async () => {
    const chain = createChain({ count: null, error: null })
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    const result = await countUnread(supabase as any, 'user-1')
    expect(result).toBe(0)
  })
})

// ─── markRead ─────────────────────────────────────────────────────────────────

describe('markRead', () => {
  it('returns early without calling supabase when ids is empty', async () => {
    const supabase = createMockSupabase()
    const result = await markRead(supabase as any, 'user-1', [])
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result).toEqual({ error: null })
  })

  it('calls from("notification_recipients") when ids is non-empty', async () => {
    const chain = createChain({ data: null, error: null })
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    await markRead(supabase as any, 'user-1', ['n1', 'n2'])

    expect(supabase.from).toHaveBeenCalledWith('notification_recipients')
  })
})

// ─── markAllRead ──────────────────────────────────────────────────────────────

describe('markAllRead', () => {
  it('calls from("notification_recipients")', async () => {
    const chain = createChain({ data: null, error: null })
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    await markAllRead(supabase as any, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('notification_recipients')
  })
})

// ─── dismiss ──────────────────────────────────────────────────────────────────

describe('dismiss', () => {
  it('calls from("notification_recipients")', async () => {
    const chain = createChain({ data: null, error: null })
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    const supabase = { from: vi.fn().mockReturnValue(chain) }

    await dismiss(supabase as any, 'user-1', 'n1')

    expect(supabase.from).toHaveBeenCalledWith('notification_recipients')
  })
})
