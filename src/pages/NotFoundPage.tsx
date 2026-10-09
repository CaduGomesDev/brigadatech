import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="text-center">
        <Logo size="md" variant="full" />
        <div className="mt-12">
          <div className="text-8xl font-black text-brand-red opacity-20 mb-4">404</div>
          <AlertCircle size={48} className="text-brand-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Página não encontrada</h1>
          <p className="text-gray-500 mb-8">A página que você está procurando não existe.</p>
          <Button
            variant="primary"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/dashboard')}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
