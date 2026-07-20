import { ArrowUpRight } from 'lucide-react'
import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">
        <div>
          <Brand inverse />
          <p>Full-band speech enhancement for recordings that deserve a quiet room.</p>
        </div>
        <div className="footer__cta">
          <span>Try it on your voice</span>
          <a href="/demo" data-route aria-label="Open Stillwave studio"><ArrowUpRight /></a>
        </div>
      </div>
      <div className="footer__base">
        <span>© {new Date().getFullYear()} Stillwave</span>
        <span>No account. No tracking. Audio auto-expires.</span>
        <a href="https://github.com/Rikorose/DeepFilterNet" target="_blank" rel="noreferrer">Powered by DeepFilterNet3</a>
      </div>
    </footer>
  )
}
