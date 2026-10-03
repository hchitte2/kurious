import { Link } from 'react-router-dom'
import { primaryButton } from '../components/kurious/buttons'
import { KuriMessage } from '../components/kurious/KuriMessage'
import { StaticHeader } from '../components/kurious/StaticHeader'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <title>Page not found | Kurious</title>
      <StaticHeader />
      <main className="py-16 md:py-24">
        <KuriMessage
          headingLevel={1}
          state="thinking"
          size={140}
          title="Hmm, Kuri looked everywhere for this page."
          actions={
            <Link to="/" className={primaryButton}>
              Ask something new
            </Link>
          }
        >
          It isn’t here. Maybe it flew away?
        </KuriMessage>
      </main>
    </div>
  )
}
