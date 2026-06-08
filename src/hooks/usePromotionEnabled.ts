'use client'

import useSWR from 'swr'
import { getPromotionEnabled } from '@/app/(admin)/naik-kelas/actions'

const fetcher = async () => {
    const res = await getPromotionEnabled()
    return res.data?.enabled === true
}

/** Status toggle "Mode Naik Kelas" — dipakai sidebar untuk show/hide menu. */
export function usePromotionEnabled() {
    const { data, error, isLoading, mutate } = useSWR('promotion-enabled', fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 5 * 60 * 1000,
    })

    return {
        promotionEnabled: data === true,
        isLoading,
        error: error?.message,
        mutate,
    }
}
