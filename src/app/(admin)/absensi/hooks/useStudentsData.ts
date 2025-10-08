'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
}

const fetcher = async (url: string): Promise<Student[]> => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get user profile to determine which class they teach
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Profile not found')
  }

  let query = supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      classes!inner(
        id,
        name
      )
    `)

  // If user is a teacher, get their class and filter students
  if (profile.role === 'teacher') {
    const { data: teacherClass } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)
      .single()

    if (teacherClass) {
      query = query.eq('class_id', teacherClass.id)
    }
  }

  const { data, error } = await query.order('name')

  if (error) {
    throw new Error(error.message)
  }

  return data.map(student => ({
    id: student.id,
    name: student.name,
    gender: student.gender,
    class_name: (student.classes as any).name,
    class_id: (student.classes as any).id
  }))
}

export function useStudentsData() {
  const router = useRouter()

  const { data, error, isLoading, mutate } = useSWR<Student[]>(
    '/api/students',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute cache
      onError: (error) => {
        console.error('Error fetching students:', error)
        // Redirect to signin if not authenticated
        if (error.message === 'User not authenticated') {
          router.push('/signin')
        }
      }
    }
  )

  return {
    students: data || [],
    error,
    isLoading,
    mutate
  }
}
