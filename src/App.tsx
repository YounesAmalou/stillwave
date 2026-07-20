import { useEffect, useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { DemoPage } from './pages/DemoPage'

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/'
}

export default function App() {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onPopState = () => setPath(currentPath())
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-route]')
      if (!anchor || anchor.origin !== window.location.origin) return
      event.preventDefault()
      window.history.pushState({}, '', anchor.href)
      setPath(currentPath())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return path === '/demo' ? <DemoPage /> : <LandingPage />
}
