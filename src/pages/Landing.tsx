import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Landing() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const featuresRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true })
  }, [currentUser, navigate])

  // Simple scroll-triggered reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0')
            entry.target.classList.remove('opacity-0', 'translate-y-8')
          }
        })
      },
      { threshold: 0.1 },
    )
    const sections = document.querySelectorAll('.reveal-on-scroll')
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-surface text-text">
      {/* ── Nav ─────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-brand text-primary tracking-tight">CareConsole.ai</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-surface hover:bg-primary-light transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-8">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            Intelligent Health Monitoring
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-brand leading-tight mb-6">
            Your health baseline.{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Your early warning system.
            </span>
          </h2>

          <p className="text-lg text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            CareConsole.ai helps patients and doctors detect flares before they escalate — with intelligent symptom tracking and real-time pattern analysis.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary-dark text-surface hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-200"
            >
              Get Started Free
            </button>
            <button
              onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 rounded-xl font-semibold border border-border text-text-muted hover:text-text hover:border-text-muted/50 transition-all duration-200"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────── */}
      <section ref={featuresRef} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
            <h3 className="text-3xl font-brand mb-4">Built for chronic care</h3>
            <p className="text-text-muted max-w-lg mx-auto">
              Everything you need to understand your health patterns and stay ahead of flares.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                ),
                title: 'Track Your Baseline',
                desc: 'Define your normal. Every insight starts from knowing your usual state.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                ),
                title: 'Detect Flares Early',
                desc: 'Our engine spots sustained symptom changes before they become full flares.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
                title: 'Clinical-Grade Reports',
                desc: 'Generate PDF reports with AI summaries to share with your care team.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 group bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-default"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  {f.icon}
                </div>
                <h4 className="text-lg font-semibold mb-2">{f.title}</h4>
                <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────── */}
      <section ref={stepsRef} className="py-24 px-6 bg-surface-dark">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
            <h3 className="text-3xl font-brand mb-4">How it works</h3>
            <p className="text-text-muted">Three simple steps to proactive health management.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Set your baseline', desc: 'Answer a few questions about your usual symptoms, sleep, and energy levels.' },
              { step: '02', title: 'Log daily symptoms', desc: 'Quick daily check-ins take under 2 minutes. Voice input available.' },
              { step: '03', title: 'Get flare alerts', desc: 'Our engine detects sustained deviations and flags potential flares early.' },
            ].map((s, i) => (
              <div
                key={i}
                className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 text-center"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary font-brand text-xl flex items-center justify-center mb-4">
                  {s.step}
                </div>
                <h4 className="text-lg font-semibold mb-2">{s.title}</h4>
                <p className="text-text-muted text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Doctors ─────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700 bg-card border border-border rounded-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Accent glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
                For Healthcare Professionals
              </div>
              <h3 className="text-3xl font-brand mb-4">Monitor your patients remotely</h3>
              <p className="text-text-muted max-w-xl leading-relaxed mb-8">
                Review symptom trends, flare history, and AI-powered insights for every patient — all from one dashboard. Invite patients by username and track their progress over time.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-accent to-accent-light text-surface hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 transition-all duration-200"
              >
                Start as a Doctor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────── */}
      <section className="py-24 px-6 bg-surface-dark">
        <div className="max-w-2xl mx-auto text-center reveal-on-scroll opacity-0 translate-y-8 transition-all duration-700">
          <h3 className="text-3xl font-brand mb-4">Ready to take control of your health?</h3>
          <p className="text-text-muted mb-8">
            Join CareConsole.ai and start tracking what matters — for free.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary-dark text-surface hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-200"
          >
            Sign Up Free
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">&copy; {new Date().getFullYear()} CareConsole.ai. All rights reserved.</p>
          <p className="text-xs text-text-muted/60">This is a health monitoring tool, not medical advice. Always consult your healthcare provider.</p>
        </div>
      </footer>
    </div>
  )
}
