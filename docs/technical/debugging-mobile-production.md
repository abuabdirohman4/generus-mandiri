# Debugging Mobile Production Issues

## Problem: Skeleton Loading Forever di HP (Production)

**Gejala**:
- Desktop: ✅ Berfungsi normal
- Mobile (HP): ❌ Hanya menampilkan skeleton loading terus
- Clear cache sudah dilakukan
- Internet tersambung

---

## Root Cause Analysis

### Potensi Penyebab #1: `getCurrentUserId()` Gagal di Mobile ⚠️

**Lokasi**: `src/app/(admin)/absensi/hooks/useMeetings.ts:73-78`

```typescript
useEffect(() => {
  getCurrentUserId().then((id) => {
    setUserId(id)
    setIsGettingUserId(false)
  })
}, [])
```

**Masalah**:
- Jika `getCurrentUserId()` throw error atau return `null`, `setIsGettingUserId(false)` tidak dipanggil
- `isGettingUserId` tetap `true` selamanya
- `combinedLoading` selalu `true` (line 147)
- Skeleton loading tidak pernah hilang

**Kenapa bisa berbeda Desktop vs Mobile?**
- **Cookie handling**: Mobile browser (Safari, Chrome Mobile) punya behavior berbeda untuk third-party cookies
- **Service Worker**: PWA service worker di mobile mungkin interferensi dengan auth cookies
- **Supabase Client**: Browser detection di mobile mungkin berbeda

---

### Potensi Penyebab #2: SWR Fetch Error Tanpa Error Handling

**Lokasi**: `src/app/(admin)/absensi/hooks/useMeetings.ts:93-140`

```typescript
const { data, error, isLoading, mutate } = useSWR(
  swrKey,
  async () => {
    const result = await getMeetingsWithStats(classId, 1000)
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch meetings')
    }
    return { allMeetings: result.data || [], total: result.data.length }
  },
  {
    onError: (error) => {
      console.error('Error fetching meetings:', error) // ❌ Only logs, doesn't stop loading
    }
  }
)
```

**Masalah**:
- Jika fetch gagal, `isLoading` mungkin stuck di `true` (SWR behavior)
- Error hanya di-log, tidak ada fallback
- `combinedLoading` tetap `true`

---

### Potensi Penyebab #3: Network Request Timeout di Mobile

**Mobile Network Characteristics**:
- ⚠️ **Slower connection**: 3G/4G vs WiFi desktop
- ⚠️ **Higher latency**: Mobile tower distance
- ⚠️ **Intermittent connection**: Signal drops, switching towers
- ⚠️ **Battery optimization**: OS might throttle background requests

**Impact**:
- `getMeetingsWithStats()` fetch timeout
- No timeout handling → infinite loading

---

## Solusi & Debugging Steps

### Step 1: Remote Debugging untuk Melihat Error di HP

**Metode A: Chrome Remote Debugging (Android)**

1. **Di HP Android**:
   - Aktifkan Developer Options: Settings → About Phone → Tap "Build Number" 7x
   - Enable USB Debugging: Settings → Developer Options → USB Debugging

2. **Di Desktop Chrome**:
   - Sambungkan HP ke laptop via USB
   - Buka Chrome → `chrome://inspect`
   - Pilih device HP Anda
   - Klik "Inspect" pada tab browser HP
   - Buka Console untuk lihat error

**Metode B: Safari Remote Debugging (iOS/iPhone)**

1. **Di iPhone**:
   - Settings → Safari → Advanced → Enable "Web Inspector"

2. **Di Mac Safari**:
   - Safari → Preferences → Advanced → Show Develop menu
   - Sambungkan iPhone via USB/WiFi
   - Develop → [Nama iPhone] → [Tab Browser]
   - Console akan muncul

**Metode C: Eruda Console (Universal, No Cable Needed)** ⭐ **RECOMMENDED**

Tambahkan Eruda console ke production untuk debug tanpa kabel:

```typescript
// Di src/app/layout.tsx atau src/components/layouts/AdminLayoutProvider.tsx
useEffect(() => {
  // Only load Eruda in production on mobile for debugging
  if (typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/eruda'
    document.body.appendChild(script)
    script.onload = () => {
      // @ts-ignore
      if (window.eruda) window.eruda.init()
    }
  }
}, [])
```

Eruda akan muncul floating button di kanan bawah → Tap untuk lihat Console, Network, Resources

---

### Step 2: Fix - Add Error Handling & Timeout

**File**: `src/app/(admin)/absensi/hooks/useMeetings.ts`

```typescript
// Get current user ID for cache key with error handling
useEffect(() => {
  getCurrentUserId()
    .then((id) => {
      setUserId(id)
      setIsGettingUserId(false)
    })
    .catch((error) => {
      console.error('Failed to get user ID:', error)
      // ✅ CRITICAL: Set loading to false even on error
      setIsGettingUserId(false)
      // Optionally: Set a fallback userId or show error UI
    })
}, [])
```

**File**: `src/lib/userUtils.ts` (jika perlu)

```typescript
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('Supabase auth error:', error)
      return null
    }

    return user?.id || null
  } catch (error) {
    console.error('getCurrentUserId error:', error)
    return null // ✅ Return null instead of throwing
  }
}
```

---

### Step 3: Fix - Add SWR Timeout & Better Error State

```typescript
const { data, error, isLoading, mutate } = useSWR(
  swrKey,
  async () => {
    // Add timeout wrapper
    const fetchWithTimeout = (promise: Promise<any>, timeoutMs = 30000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
      ])
    }

    try {
      const result = await fetchWithTimeout(
        getMeetingsWithStats(classId, 1000),
        30000 // 30 second timeout
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meetings')
      }

      return {
        allMeetings: result.data || [],
        total: result.data.length
      }
    } catch (error: any) {
      console.error('Fetch error:', error)
      // Return empty data instead of throwing (prevents infinite loading)
      return {
        allMeetings: [],
        total: 0
      }
    }
  },
  {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    shouldRetryOnError: true, // ✅ Retry on error
    errorRetryCount: 3, // ✅ Max 3 retries
    errorRetryInterval: 5000, // ✅ 5 seconds between retries
    onError: (error) => {
      console.error('SWR Error:', error)
      console.error('SWR Key:', swrKey)
      console.error('Device:', navigator.userAgent)
    }
  }
)
```

---

### Step 4: Add Loading Timeout Fallback di Page

**File**: `src/app/(admin)/absensi/page.tsx`

```typescript
export default function AbsensiPage() {
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // Add timeout for loading state (30 seconds)
  useEffect(() => {
    if (initialLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
        console.error('Loading timeout exceeded')
      }, 30000) // 30 seconds

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [initialLoading])

  // Show error UI if loading timeout
  if (loadingTimeout) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Gagal Memuat Data
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Koneksi Anda mungkin lambat atau server tidak merespons.
            </p>
            <button
              onClick={() => {
                setLoadingTimeout(false)
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return <LoadingState />
  }

  // Rest of component...
}
```

---

### Step 5: Check Service Worker (PWA) Interference

**File**: `public/sw.js` or `src/app/sw.ts` (jika ada)

```typescript
// Make sure auth endpoints are NOT cached
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // ✅ NEVER cache auth endpoints
  if (
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/api/auth/') ||
    url.hostname.includes('supabase.co')
  ) {
    return // Let it pass through to network
  }

  // Cache other resources...
})
```

**Verify PWA isn't caching auth**:
- Di HP, buka Settings → Clear Site Data (bukan hanya cache)
- Atau: DevTools → Application → Clear Storage → Unregister Service Worker

---

## Quick Diagnostic Checklist

Jalankan ini di HP menggunakan Eruda Console atau Remote Debugging:

```javascript
// Paste di Console browser HP
(async () => {
  console.log('=== Diagnostic Start ===')

  // 1. Check Supabase client
  console.log('1. Supabase client available:', typeof createClient)

  // 2. Check auth state
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('2. Auth user:', user?.id || 'NOT LOGGED IN')
  console.log('2. Auth error:', authError)

  // 3. Check localStorage (SWR cache)
  console.log('3. LocalStorage keys:', Object.keys(localStorage))

  // 4. Test fetch meeting
  const { getMeetingsWithStats } = await import('@/app/(admin)/absensi/actions')
  console.log('4. Fetching meetings...')
  const result = await getMeetingsWithStats(undefined, 10)
  console.log('4. Result:', result)

  console.log('=== Diagnostic End ===')
})()
```

---

## Expected Outputs & Actions

### Scenario 1: `Auth user: NOT LOGGED IN`
**Root Cause**: Session lost di mobile
**Fix**:
- Logout → Login ulang di HP
- Check cookie settings browser
- Check if Supabase URL env var correct di production

### Scenario 2: `Auth error: {...}`
**Root Cause**: Supabase connection issue
**Fix**:
- Check MCP Supabase connection (per CLAUDE.md)
- Verify `NEXT_PUBLIC_SUPABASE_URL` in Vercel env vars
- Check CORS settings di Supabase dashboard

### Scenario 3: `Fetching meetings...` timeout
**Root Cause**: Slow query or network timeout
**Fix**:
- Add index to `meetings` table: `CREATE INDEX idx_meetings_class_id ON meetings(class_id)`
- Reduce `getMeetingsWithStats` limit from 1000 to 100
- Add pagination to backend

### Scenario 4: `Result: { success: false, error: "..." }`
**Root Cause**: Database query error
**Fix**:
- Check error message
- Verify RLS policies allow read for user role
- Check if user has `classes` assigned (teacher role)

---

## Monitoring untuk Prevent Recurrence

### Add Sentry/Error Tracking (Production)

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Add device info
    event.contexts = {
      ...event.contexts,
      device: {
        type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        screen_width: window.innerWidth,
        user_agent: navigator.userAgent
      }
    }
    return event
  }
})
```

Ini akan capture error otomatis dengan context device type.

---

## Summary - Action Items

**Immediate (untuk debug sekarang)**:
1. ✅ Tambahkan Eruda console ke production (copy snippet di atas)
2. ✅ Deploy Vercel
3. ✅ Buka halaman absensi di HP
4. ✅ Tap floating Eruda button → Console
5. ✅ Screenshot error message → kirim ke saya

**Short-term (fix permanent)**:
1. ✅ Tambahkan `.catch()` handler di `getCurrentUserId()` (useMeetings.ts:73)
2. ✅ Tambahkan timeout & retry logic di SWR fetcher
3. ✅ Tambahkan loading timeout fallback (30 detik)
4. ✅ Test di HP production

**Long-term (monitoring)**:
1. Setup Sentry error tracking
2. Add performance monitoring (Core Web Vitals per device)
3. Create mobile-specific test suite

---

## Referensi File Terkait

- `src/app/(admin)/absensi/page.tsx` - Main page
- `src/app/(admin)/absensi/hooks/useMeetings.ts` - Data fetching hook
- `src/lib/userUtils.ts` - getCurrentUserId()
- `src/app/(admin)/absensi/actions.ts` - getMeetingsWithStats()
- `docs/claude/business-rules.md` - Business logic reference

---

**Last Updated**: 2026-02-21
**Status**: Ready for debugging
