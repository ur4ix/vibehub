import type { Metadata } from 'next'
import { ProfileView } from '@/components/profile-view'

export const metadata: Metadata = {
  title: 'Profile — VibeHub',
  description: 'Your repositories, stats and settings.',
}

export default function ProfilePage() {
  return <ProfileView />
}
