import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import CadastroPublico from "@/pages/CadastroPublico";
import CadastroTurmaPage from "@/pages/CadastroTurmaPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import CursosPage from "@/pages/CursosPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import LessonPlayerPage from "@/pages/LessonPlayerPage";
import AlunosPage from "@/pages/AlunosPage";
import TurmasPage from "@/pages/TurmasPage";
import PresencaPage from "@/pages/PresencaPage";
import RelatoriosProvasPage from "@/pages/RelatoriosProvasPage";
import ContaPage from "@/pages/ContaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/cadastro" element={<CadastroPublico />} />
            <Route path="/cadastro/turma/:code" element={<CadastroTurmaPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cursos" element={<CursosPage />} />
              <Route path="/cursos/:id" element={<CourseDetailPage />} />
              <Route path="/cursos/:courseId/aula/:lessonId" element={<LessonPlayerPage />} />
              <Route path="/alunos" element={<AlunosPage />} />
              <Route path="/turmas" element={<TurmasPage />} />
              <Route path="/presenca" element={<PresencaPage />} />
              <Route path="/professores" element={<DashboardPage />} />
              <Route path="/importar" element={<DashboardPage />} />
              <Route path="/notificacoes" element={<DashboardPage />} />
              <Route path="/relatorios" element={<RelatoriosProvasPage />} />
              <Route path="/configuracoes" element={<DashboardPage />} />
              <Route path="/comentarios" element={<DashboardPage />} />
              <Route path="/desempenho" element={<DashboardPage />} />
              <Route path="/meus-cursos" element={<CursosPage />} />
              <Route path="/certificados" element={<DashboardPage />} />
              <Route path="/conta" element={<ContaPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
