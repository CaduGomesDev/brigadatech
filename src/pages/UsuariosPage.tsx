import { useEffect, useState } from 'react'
import { Users, Search, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Profile, Cargo, CARGOS } from '../types'
import { Layout } from '../components/layout/Layout'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDate } from '../utils/formatters'
import { logAuditoria } from '../lib/audit'
import { SkeletonTable } from '../components/ui/Skeleton'
import { CriarUsuarioModal } from '../components/usuarios/CriarUsuarioModal'

export function UsuariosPage() {
  const { profile: currentProfile } = useAuth()
  const { success, error: toastError } = useToast()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [criarModalOpen, setCriarModalOpen] = useState(false)

  const fetchProfiles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setProfiles(data as Profile[])
    setLoading(false)
  }

  useEffect(() => { fetchProfiles() }, [])

  const updateCargo = async (p: Profile, newCargo: Cargo) => {
    if (p.id === currentProfile?.id) return
    // Atualiza estado local imediatamente para evitar flickering enquanto a
    // Edge Function (que roda com service_role no servidor) processa o update
    setProfiles(prev => prev.map(u => u.id === p.id ? { ...u, cargo: newCargo } : u))
    const { error } = await supabase.functions.invoke('update-user-cargo', {
      body: { targetUserId: p.id, newCargo },
    })
    if (error) {
      toastError('Erro ao atualizar cargo', error.message)
      // Reverte estado local se o update falhou
      setProfiles(prev => prev.map(u => u.id === p.id ? { ...u, cargo: p.cargo } : u))
    } else {
      if (currentProfile) logAuditoria(currentProfile.id, 'update_cargo', { target_user_id: p.id, new_cargo: newCargo })
      success('Cargo atualizado', `${p.nome} agora é ${newCargo}.`)
    }
  }

  const filtered = profiles.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.cargo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Gerenciar Usuários">
      <div className="space-y-5 animate-fade-in">
        <Card padding="md">
          <CardHeader
            title="Usuários do Sistema"
            subtitle={`${profiles.length} contas cadastradas`}
            icon={<Users size={18} />}
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus size={14} />}
                onClick={() => setCriarModalOpen(true)}
              >
                Criar Usuário
              </Button>
            }
          />

          <div className="mb-5">
            <Input
              placeholder="Buscar por nome, email ou cargo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>

          {loading ? <SkeletonTable rows={5} /> : (
            <div className="overflow-x-auto rounded-xl border border-brand-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-gray-800 border-b border-brand-gray-700">
                    {['Usuário', 'Email', 'Cargo', 'Cadastro'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className={`border-b border-brand-gray-700 hover:bg-brand-gray-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-brand-gray-900/50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-red">{p.nome.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{p.nome}</p>
                            {p.id === currentProfile?.id && (
                              <span className="text-[10px] text-brand-red">(você)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.email}</td>
                      <td className="px-4 py-3">
                        {p.id === currentProfile?.id ? (
                          <span className="text-gray-400 text-xs">{p.cargo}</span>
                        ) : (
                          <select
                            value={p.cargo}
                            onChange={e => updateCargo(p, e.target.value as Cargo)}
                            className="bg-brand-gray-800 border border-brand-gray-600 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-brand-red"
                          >
                            {CARGOS.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-600">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <CriarUsuarioModal
        open={criarModalOpen}
        onClose={() => setCriarModalOpen(false)}
        onSuccess={fetchProfiles}
      />
    </Layout>
  )
}
