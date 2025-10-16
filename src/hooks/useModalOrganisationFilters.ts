'use client'

import { useState, useMemo, useCallback } from 'react'
import { 
  shouldShowDaerahFilter, 
  shouldShowDesaFilter, 
  shouldShowKelompokFilter,
  getRequiredOrgFields,
  getAutoFilledOrgValues,
  type UserProfile 
} from '@/lib/userUtils'

interface Daerah {
  id: string
  name: string
}

interface Desa {
  id: string
  name: string
  daerah_id: string
}

interface Kelompok {
  id: string
  name: string
  desa_id: string
}

interface UseModalOrganisationFiltersProps {
  userProfile: UserProfile | null | undefined
  daerahList: Daerah[]
  desaList: Desa[]
  kelompokList: Kelompok[]
  initialDaerah?: string
  initialDesa?: string
  initialKelompok?: string
}

export function useModalOrganisationFilters({
  userProfile,
  daerahList,
  desaList,
  kelompokList,
  initialDaerah = '',
  initialDesa = '',
  initialKelompok = ''
}: UseModalOrganisationFiltersProps) {
  // Get auto-filled values based on user role
  const autoFilledValues = userProfile ? getAutoFilledOrgValues(userProfile) : {}
  
  // Initialize state with auto-filled values or provided initials
  const [selectedDaerah, setSelectedDaerah] = useState(
    initialDaerah || autoFilledValues.daerah_id || ''
  )
  const [selectedDesa, setSelectedDesa] = useState(
    initialDesa || autoFilledValues.desa_id || ''
  )
  const [selectedKelompok, setSelectedKelompok] = useState(
    initialKelompok || autoFilledValues.kelompok_id || ''
  )

  // Determine which filters should be shown based on user role
  const shouldShowDaerah = userProfile ? shouldShowDaerahFilter(userProfile) : false
  const shouldShowDesa = userProfile ? shouldShowDesaFilter(userProfile) : false
  const shouldShowKelompok = userProfile ? shouldShowKelompokFilter(userProfile) : false

  // Get required fields based on user role
  const requiredFields = userProfile ? getRequiredOrgFields(userProfile) : {
    daerah: true,
    desa: true,
    kelompok: true
  }

  // Filter lists based on cascading selection
  const filteredDesaList = useMemo(() => {
    if (!shouldShowDesa) return []
    if (!selectedDaerah) return desaList
    return desaList.filter(desa => desa.daerah_id === selectedDaerah)
  }, [desaList, selectedDaerah, shouldShowDesa])

  const filteredKelompokList = useMemo(() => {
    if (!shouldShowKelompok) return []
    if (!selectedDesa) return kelompokList
    return kelompokList.filter(kelompok => kelompok.desa_id === selectedDesa)
  }, [kelompokList, selectedDesa, shouldShowKelompok])

  // Handlers with cascading reset logic
  const handleDaerahChange = useCallback((value: string) => {
    setSelectedDaerah(value)
    setSelectedDesa('')
    setSelectedKelompok('')
  }, [])

  const handleDesaChange = useCallback((value: string) => {
    setSelectedDesa(value)
    setSelectedKelompok('')
  }, [])

  const handleKelompokChange = useCallback((value: string) => {
    setSelectedKelompok(value)
  }, [])

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSelectedDaerah(initialDaerah || autoFilledValues.daerah_id || '')
    setSelectedDesa(initialDesa || autoFilledValues.desa_id || '')
    setSelectedKelompok(initialKelompok || autoFilledValues.kelompok_id || '')
  }, [initialDaerah, initialDesa, initialKelompok, autoFilledValues])

  // Get current form data for submission
  const getFormData = useCallback(() => {
    const formData: { daerah_id?: string; desa_id?: string; kelompok_id?: string } = {}
    
    if (shouldShowDaerah && selectedDaerah) {
      formData.daerah_id = selectedDaerah
    } else if (autoFilledValues.daerah_id) {
      formData.daerah_id = autoFilledValues.daerah_id
    }
    
    if (shouldShowDesa && selectedDesa) {
      formData.desa_id = selectedDesa
    } else if (autoFilledValues.desa_id) {
      formData.desa_id = autoFilledValues.desa_id
    }
    
    if (shouldShowKelompok && selectedKelompok) {
      formData.kelompok_id = selectedKelompok
    } else if (autoFilledValues.kelompok_id) {
      formData.kelompok_id = autoFilledValues.kelompok_id
    }
    
    return formData
  }, [selectedDaerah, selectedDesa, selectedKelompok, shouldShowDaerah, shouldShowDesa, shouldShowKelompok, autoFilledValues])

  // Validate required fields
  const validateForm = useCallback(() => {
    const errors: string[] = []
    
    if (requiredFields.daerah && !selectedDaerah && !autoFilledValues.daerah_id) {
      errors.push('Daerah harus dipilih')
    }
    
    if (requiredFields.desa && !selectedDesa && !autoFilledValues.desa_id) {
      errors.push('Desa harus dipilih')
    }
    
    if (requiredFields.kelompok && !selectedKelompok && !autoFilledValues.kelompok_id) {
      errors.push('Kelompok harus dipilih')
    }
    
    return errors
  }, [requiredFields, selectedDaerah, selectedDesa, selectedKelompok, autoFilledValues])

  return {
    // State
    selectedDaerah,
    selectedDesa,
    selectedKelompok,
    
    // Setters
    setSelectedDaerah,
    setSelectedDesa,
    setSelectedKelompok,
    
    // Handlers
    handleDaerahChange,
    handleDesaChange,
    handleKelompokChange,
    resetFilters,
    
    // Filtered lists
    filteredDesaList,
    filteredKelompokList,
    
    // Visibility flags
    shouldShowDaerah,
    shouldShowDesa,
    shouldShowKelompok,
    
    // Required fields
    requiredFields,
    
    // Utilities
    getFormData,
    validateForm
  }
}

