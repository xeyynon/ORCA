import type { ViewId } from '@/lib/views'
import { Button } from '../../atoms/Button/Button'
import { SectionHeader } from '../../molecules/SectionHeader/SectionHeader'
import { PageLayout } from '../../organisms/PageLayout/PageLayout'
import './HomeView.css'

type Props = { onGo: (view: ViewId) => void }

/** Mission control: the landing view. Placeholder until the bento tiles land (MD/design_system_v2.md milestone 2). */
export function HomeView({ onGo }: Props) {
  return (
    <PageLayout>
      <div className="home">
        <SectionHeader title="Mission control" subtitle="What is in orbit, how fresh the data is, and what needs a look." />
        <Button variant="primary" onClick={() => onGo('overview')}>Open the catalog</Button>
      </div>
    </PageLayout>
  )
}
