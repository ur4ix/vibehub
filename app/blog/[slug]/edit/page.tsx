import { PostEditor } from '@/components/post-editor'

export const metadata = {
  title: 'Edit post · Blog',
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditPostPage({ params }: PageProps) {
  const { slug } = await params
  return <PostEditor slug={slug} />
}
