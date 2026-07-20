import { ArrowUpRight } from 'lucide-react'
import { Brand } from './Brand'

export function Header({ dark = false }: { dark?: boolean }) {
  return (
    <header className={`site-header${dark ? ' site-header--dark' : ''}`}>
      <Brand inverse={dark} />
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/#how-it-works">How it works</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
      </nav>
      <a className={`button button--small${dark ? ' button--lime' : ' button--ink'}`} href="/demo" data-route>
        Open studio <ArrowUpRight size={15} strokeWidth={2.2} />
      </a>
    </header>
  )
}
