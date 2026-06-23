import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { canOnboard } from './actions/orchestration/logic'
import { getAllClassMasters } from '@/app/(admin)/kelas/actions/masters'
import { filterStandardMasters } from '@/app/(admin)/kelas/actions/batch-standard/logic'
import OnboardingClient from './OnboardingClient'
import type { ClassMaster } from '@/types/class'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Onboarding | Generus Mandiri',
  description: 'Setup organisasi, kelas, dan guru dalam satu wizard',
}

export default async function OnboardingPage() {
  const profile = await getCurrentUserProfile()

  if (!canOnboard(profile)) {
    redirect('/home')
  }

  const allMasters = await getAllClassMasters()
  const standardMasters: ClassMaster[] = filterStandardMasters(allMasters)

  return (
    <OnboardingClient
      profile={profile!}
      standardMasters={standardMasters}
    />
  )
}
