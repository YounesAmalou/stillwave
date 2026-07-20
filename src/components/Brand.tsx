export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <a className={`brand${inverse ? ' brand--inverse' : ''}`} href="/" data-route aria-label="Stillwave home">
      <svg className="brand__mark" viewBox="0 0 34 24" aria-hidden="true">
        <path d="M2 12h3c1.8 0 2-7 4-7s2.2 14 4.2 14 2.1-17 4.3-17 2.1 0 2.3 20 4.4 20 2 0 2.2-13 4.1-13s2.1 3 3.3 3H32" />
      </svg>
      <span>stillwave</span>
    </a>
  )
}
