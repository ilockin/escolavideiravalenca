import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
  Bell,
  FileText,
  BarChart3,
  MessageSquare,
  Upload,
  UserCog,
  ClipboardCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar } from
'@/components/ui/sidebar';

const editorItems = [
{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
{ title: 'Cursos', url: '/cursos', icon: BookOpen },
{ title: 'Turmas', url: '/turmas', icon: Users },
{ title: 'Alunos', url: '/alunos', icon: Users },
{ title: 'Professores', url: '/professores', icon: GraduationCap },
{ title: 'Importar CSV', url: '/importar', icon: Upload },
{ title: 'Notificações', url: '/notificacoes', icon: Bell },
{ title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
{ title: 'Presença', url: '/presenca', icon: ClipboardCheck },
{ title: 'Gestão de Contas', url: '/conta', icon: UserCog },
{ title: 'Configurações', url: '/configuracoes', icon: Settings }];


const professorItems = [
{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
{ title: 'Cursos', url: '/cursos', icon: BookOpen },
{ title: 'Turmas', url: '/turmas', icon: Users },
{ title: 'Alunos', url: '/alunos', icon: Users },
{ title: 'Importar CSV', url: '/importar', icon: Upload },
{ title: 'Notificações', url: '/notificacoes', icon: Bell },
{ title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
{ title: 'Presença', url: '/presenca', icon: ClipboardCheck },
{ title: 'Comentários', url: '/comentarios', icon: MessageSquare },
{ title: 'Desempenho', url: '/desempenho', icon: BarChart3 },
{ title: 'Gestão de Contas', url: '/conta', icon: UserCog },
{ title: 'Configurações', url: '/configuracoes', icon: Settings }];


const alunoItems = [
{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
{ title: 'Meus Cursos', url: '/meus-cursos', icon: BookOpen },
{ title: 'Certificados', url: '/certificados', icon: FileText },
{ title: 'Minha Conta', url: '/conta', icon: UserCog }];


interface AppSidebarProps {
  role: 'editor' | 'professor' | 'aluno';
}

export function AppSidebar({ role }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const items = role === 'editor' ? editorItems : role === 'professor' ? professorItems : alunoItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed &&
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">Escola Videira</span>
              <span className="text-[11px] text-sidebar-foreground/60">de Ministérios</span>
            </div>
          </div>
        }
        {collapsed &&
        <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          </div>
        }
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-wider">
            {role === 'editor' ? 'Administração' : role === 'professor' ? 'Professor' : 'Aluno'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    end={item.url === '/dashboard'}
                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    
                      <item.icon className="mr-2 h-4 w-4 shrink-0 text-primary-foreground" />
                      {!collapsed && <span className="text-primary-foreground">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed &&
        <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-[11px] text-sidebar-foreground/50">
              {role === 'editor' ? 'Super Admin' : role === 'professor' ? 'Professor' : 'Aluno'}
            </p>
          </div>
        }
      </SidebarFooter>
    </Sidebar>);

}