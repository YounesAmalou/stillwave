import { ArrowRight, Check, ChevronDown, Headphones, Mic2, ShieldCheck, Sparkles } from 'lucide-react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { WaveBand } from '../components/WaveBand'

const faqs = [
  ['What kind of noise can Stillwave remove?', 'Fans, traffic, keyboard clicks, air conditioning, room hum, and broad background chatter. It is tuned to preserve natural speech while reducing non-speech sound.'],
  ['Do I need to install anything?', 'No. Record or upload directly in a modern browser. Stillwave returns a cleaned WAV you can preview and download.'],
  ['Is my audio used for training?', 'No. Audio is processed only to create your result and is automatically deleted from the server after its short retention window.'],
  ['Will it work on music?', 'Stillwave is optimized for spoken voice. It may alter music or singing, so we recommend using it for podcasts, interviews, voice notes, and calls.'],
]

export function LandingPage() {
  return (
    <div className="landing-page">
      <Header />
      <main>
        <section className="hero">
          <div className="hero__eyebrow"><span className="pulse-dot" /> Full-band AI speech enhancement</div>
          <h1>Keep the voice.<br /><em>Lose the room.</em></h1>
          <p className="hero__lede">Studio-grade noise reduction for podcasts, interviews, and voice notes—right in your browser.</p>
          <div className="hero__actions">
            <a className="button button--ink button--large" href="/demo" data-route>Clean a recording <ArrowRight size={18} /></a>
            <span>No account · First 10 minutes free</span>
          </div>
          <div className="hero-console" aria-label="Audio noise reduction illustration">
            <div className="hero-console__top">
              <div><span className="status-light" /> LIVE SIGNAL</div>
              <span>48 KHZ / DF3</span>
              <span>00:18.42</span>
            </div>
            <div className="hero-console__track hero-console__track--noisy">
              <span className="track-label">RAW / ROOM</span>
              <WaveBand />
              <span className="track-reading">−24 dB</span>
            </div>
            <div className="hero-console__track hero-console__track--clean">
              <span className="track-label">STILL / VOICE</span>
              <WaveBand />
              <span className="track-reading">−7 dB</span>
            </div>
            <div className="hero-console__meter">
              <span>ROOM TONE</span><i /><b>−18.6 dB removed</b>
            </div>
          </div>
          <div className="hero__proof">
            <span>Built for voices on</span>
            <b>REMOTE CALLS</b><b>PODCASTS</b><b>FIELD NOTES</b><b>INTERVIEWS</b>
          </div>
        </section>

        <section className="statement">
          <div className="section-index">01 / THE DIFFERENCE</div>
          <div className="statement__copy">
            <h2>Noise disappears.<br />Your voice <em>doesn’t.</em></h2>
            <p>Stillwave listens beyond volume. It identifies the texture of speech across the full frequency range, then removes everything that gets in its way.</p>
          </div>
          <div className="difference-grid">
            <article>
              <Mic2 />
              <span>01</span>
              <h3>Voice-first</h3>
              <p>Preserves consonants, breath, and tone so you still sound like you.</p>
            </article>
            <article className="difference-grid__feature">
              <div className="orbital"><span /><span /><span /></div>
              <span>02</span>
              <h3>Full-band clarity</h3>
              <p>48 kHz processing keeps recordings crisp, not muffled or metallic.</p>
            </article>
            <article>
              <ShieldCheck />
              <span>03</span>
              <h3>Private by default</h3>
              <p>No account, no library, no training. Files automatically expire.</p>
            </article>
          </div>
        </section>

        <section className="how" id="how-it-works">
          <div className="section-index section-index--light">02 / HOW IT WORKS</div>
          <div className="how__intro">
            <h2>From noisy to noteworthy<br />in three quiet steps.</h2>
            <p>Nothing to install, configure, or learn. Bring a voice—we’ll find the silence around it.</p>
          </div>
          <div className="steps">
            <article><span>01</span><div className="step-icon"><Mic2 /></div><h3>Record or upload</h3><p>Capture directly from your mic or bring an existing audio file.</p></article>
            <article><span>02</span><div className="step-icon step-icon--active"><Sparkles /></div><h3>Let Stillwave listen</h3><p>DeepFilterNet3 separates your speech from room noise and interference.</p></article>
            <article><span>03</span><div className="step-icon"><Headphones /></div><h3>Compare and keep</h3><p>Hear original and enhanced versions side by side, then download.</p></article>
          </div>
        </section>

        <section className="pricing" id="pricing">
          <div className="section-index">03 / SIMPLE PRICING</div>
          <div className="pricing__heading">
            <h2>Clear audio.<br /><em>No fuzzy pricing.</em></h2>
            <p>Start without a card. Pay for the minutes you actually use when you’re ready to make Stillwave part of your workflow.</p>
          </div>
          <div className="price-grid">
            <article className="price-card">
              <div><span>TRY IT</span><h3>Free</h3><p>For testing a take or cleaning the occasional voice note.</p></div>
              <div className="price"><b>$0</b><span>forever</span></div>
              <ul><li><Check /> 10 minutes each month</li><li><Check /> WAV export</li><li><Check /> No account required</li></ul>
              <a className="button button--outline" href="/demo" data-route>Start cleaning <ArrowRight size={16} /></a>
            </article>
            <article className="price-card price-card--featured">
              <div className="popular">MOST POPULAR</div>
              <div><span>CREATE</span><h3>Studio</h3><p>For podcasters, creators, and teams shipping voice every week.</p></div>
              <div className="price"><b>$12</b><span>/ month</span></div>
              <ul><li><Check /> 5 hours each month</li><li><Check /> Priority processing</li><li><Check /> 24-bit WAV export</li><li><Check /> Commercial use</li></ul>
              <a className="button button--lime button--full" href="/demo" data-route>Try the studio <ArrowRight size={16} /></a>
            </article>
            <article className="price-card">
              <div><span>SCALE</span><h3>Production</h3><p>For audio teams that need predictable volume and an API.</p></div>
              <div className="price"><b>$49</b><span>/ month</span></div>
              <ul><li><Check /> 30 hours each month</li><li><Check /> API access</li><li><Check /> Batch processing</li><li><Check /> Shared minute pool</li></ul>
              <a className="button button--outline" href="mailto:hello@stillwave.audio">Talk to us <ArrowRight size={16} /></a>
            </article>
          </div>
        </section>

        <section className="testimonial">
          <div className="quote-mark">“</div>
          <blockquote>We recorded an interview next to a working espresso machine. Stillwave gave us back the conversation.</blockquote>
          <div className="testimonial__person"><span>MS</span><div><b>Maya Sato</b><small>Producer, Fieldwork FM</small></div></div>
        </section>

        <section className="faq" id="faq">
          <div className="section-index">04 / GOOD TO KNOW</div>
          <div className="faq__layout">
            <div><h2>Questions,<br /><em>answered quietly.</em></h2><p>Still wondering something?</p><a href="mailto:hello@stillwave.audio">hello@stillwave.audio</a></div>
            <div className="faq__list">
              {faqs.map(([question, answer], index) => (
                <details key={question} open={index === 0}>
                  <summary><span>{String(index + 1).padStart(2, '0')}</span>{question}<ChevronDown /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
