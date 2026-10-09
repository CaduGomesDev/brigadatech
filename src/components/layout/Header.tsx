import { useState } from 'react'
import { LogOut, User, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title?: string
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    success('Sessão encerrada', 'Você saiu com segurança.')
    navigate('/auth')
  }

  return (
    <header className="h-14 md:h-16 flex items-center justify-between gap-3 px-4 md:px-6 bg-transparent border-b border-white/10 flex-shrink-0 relative z-10">
      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-brand-gray-700 transition-all flex-shrink-0"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right: user menu */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* User dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200"
          >
            <div className="relative w-8 h-8 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-red">
                {profile?.nome?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-brand-gray-900" />
            </div>
            <span className="hidden md:block text-sm font-semibold text-white truncate max-w-[140px]">
              {profile?.nome || 'Usuário'}
            </span>
            <ChevronDown
              size={14}
              className={`text-gray-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 bg-brand-gray-800 border border-brand-gray-600 rounded-2xl shadow-card z-20 animate-slide-in overflow-hidden">
                <div className="px-4 py-4 border-b border-brand-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-brand-red">
                        {profile?.nome?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{profile?.nome || 'Usuário'}</p>
                      <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/configuracoes') }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-brand-gray-700 rounded-xl transition-all"
                  >
                    <User size={16} />
                    Meu Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-all mt-1"
                  >
                    <LogOut size={16} />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
