import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const shinyStyle: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, #050505 0%, #5C0000 12.5%, #FF8080 32.5%, #FF1744 50%, #5C0000 67.5%, #050505 87.5%, #050505 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter: 'url(#c3-noise)',
}

export function LoginForm() {
  const { signIn } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [form, setForm]        = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [focused, setFocused]   = useState<string | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'Email obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (!form.password) e.password = 'Senha obrigatória'
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    const { error } = await signIn(form.email, form.password)
    setLoading(false)
    if (error) {
      toastError('Falha no login', 'Email ou senha incorretos.')
    } else {
      success('Bem-vindo!', 'Login realizado com sucesso.')
      navigate('/dashboard')
    }
  }

  const fieldBorder = (f: string) => {
    if (errors[f]) return '1px solid rgba(220,38,38,0.80)'
    if (focused === f) return '1px solid rgba(220,38,38,0.60)'
    return '1px solid rgba(255,255,255,0.12)'
  }
  const fieldShadow = (f: string) =>
    focused === f && !errors[f] ? '0 0 0 3px rgba(220,38,38,0.14)' : 'none'

  return (
    <div
      className="relative min-h-screen overflow-hidden font-sans select-none flex items-center justify-end pr-[6%]"
      style={{ background: '#000' }}
    >
      {/* Fundo full-screen */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'url(/logo.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        filter: 'brightness(0.80)',
      }} />

      {/* Vinheta escura nas bordas */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 42%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* Fade esquerdo para legibilidade da marca */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to right, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.28) 45%, transparent 68%)',
      }} />

      {/* Sombra vermelha canto inferior esquerdo */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 55% 45% at 0% 100%, rgba(220,38,38,0.22) 0%, transparent 65%)',
      }} />

      {/* Marca — esquerda */}
      <motion.div
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="absolute z-10 hidden lg:flex flex-col"
        style={{ left: '5%', top: '28%', transform: 'translateY(-50%)', maxWidth: 400 }}
      >
        <p className="font-semibold uppercase mb-8"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.22em' }}>
          Sistema de Gestão de Brigada
        </p>

        <h1 style={{ fontSize: 'clamp(42px, 5.5vw, 72px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', margin: 0 }}>
          <span style={{ color: '#ffffff' }}>Brigada</span>
          <br />
          <span className="animate-shiny" style={shinyStyle}>Tech</span>
        </h1>

        <div style={{
          width: 48, height: 3,
          background: '#DC2626',
          borderRadius: 2,
          margin: '24px 0 0',
        }} />
      </motion.div>

      {/* Card transparente — direita */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="relative z-20 w-full"
        style={{
          maxWidth: 400,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          padding: '44px 40px 38px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.60), 0 0 0 1px rgba(220,38,38,0.08) inset',
        }}
      >

        <motion.h2
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.30 }}
          style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 28, letterSpacing: '-0.01em' }}
        >
          Entrar
        </motion.h2>

        <motion.form
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          onSubmit={handleLogin}
          className="space-y-5"
        >
          {/* E-MAIL */}
          <div className="space-y-2">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: focused === 'email' ? '#DC2626' : 'rgba(255,255,255,0.32)' }} />
              <input
                type="email" placeholder="nome@empresa.com.br"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                autoComplete="email"
                className="w-full text-white text-sm pl-11 pr-4 outline-none transition-all duration-200 placeholder:text-white/25"
                style={{ height: 50, background: 'rgba(0,0,0,0.30)', border: fieldBorder('email'), borderRadius: 10, boxShadow: fieldShadow('email') }}
              />
            </div>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 12, color: '#F87171' }}>{errors.email}</motion.p>
            )}
          </div>

          {/* SENHA */}
          <div className="space-y-2">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>
              Senha
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: focused === 'password' ? '#DC2626' : 'rgba(255,255,255,0.32)' }} />
              <input
                type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                autoComplete="current-password"
                className="w-full text-white text-sm pl-11 pr-12 outline-none transition-all duration-200 placeholder:text-white/25"
                style={{ height: 50, background: 'rgba(0,0,0,0.30)', border: fieldBorder('password'), borderRadius: 10, boxShadow: fieldShadow('password') }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.32)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.72)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.32)')}
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 12, color: '#F87171' }}>{errors.password}</motion.p>
            )}
          </div>

          {/* BOTÃO */}
          <motion.button
            type="submit" disabled={loading} whileTap={{ scale: 0.985 }}
            className="w-full flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed"
            style={{ height: 50, background: '#DC2626', color: '#fff', borderRadius: 10, fontSize: 15, marginTop: 4, boxShadow: '0 4px 24px rgba(220,38,38,0.38)' }}
            onMouseEnter={e => { if (!loading) { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#EF4444'; el.style.boxShadow = '0 6px 32px rgba(220,38,38,0.55)' }}}
            onMouseLeave={e => { if (!loading) { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#DC2626'; el.style.boxShadow = '0 4px 24px rgba(220,38,38,0.38)' }}}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <>Entrar <span style={{ fontSize: 18 }}>→</span></>
            }
          </motion.button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-7"
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}
        >
          Não tem acesso?{' '}
          <span
            style={{ color: '#DC2626', fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.72')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            Solicitar acesso
          </span>
        </motion.p>

        {/* Versão */}
        <p className="text-center mt-4" style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>
          CG <span style={{ marginLeft: 4 }}>✦</span>
        </p>
      </motion.div>

      <style>{`
        @keyframes shiny { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .animate-shiny { animation: shiny 4s linear infinite; }
      `}</style>
    </div>
  )
}
