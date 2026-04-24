/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Library,
  Book as BookIcon, 
  Users, 
  Settings, 
  Plus, 
  Bell, 
  Search, 
  ScanBarcode, 
  UserPlus,
  BookOpen,
  TrendingUp,
  Clock,
  Mail,
  ArrowLeft,
  MoreVertical,
  History,
  AlertCircle,
  CheckCircle2,
  LogOut,
  LogIn,
  Camera,
  ShieldCheck,
  X,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  Bot,
  Wand2,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Upload
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { MOCK_BOOKS, MOCK_MEMBERS, MOCK_ACTIVITIES, LOAN_DATA, PREDEFINED_AVATARS, LIBRARY_CONFIG, COMMON_GENRES } from './constants';
import { User, UserRole, AuthUser, Book, Member, Activity, LibraryConfig } from './types';
import { getLibraryRecommendations } from './services/geminiService';

type View = 'dash' | 'library' | 'users' | 'config' | 'profile' | 'catalog';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dash');
  const [registeredUsers, setRegisteredUsers] = useState<AuthUser[]>(() => {
    const saved = localStorage.getItem('atglib_users_v2');
    const users = saved ? JSON.parse(saved) : [];
    // Ensure at least one admin exists for initial setup if empty
    if (users.length === 0) {
      return [{
        id: 'ADMIN-001',
        name: 'Administrador',
        avatar: PREDEFINED_AVATARS[0],
        role: 'management',
        password: 'admin'
      }];
    }
    return users;
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('atglib_books_v2');
    return saved ? JSON.parse(saved) : MOCK_BOOKS;
  });
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('atglib_members_v2');
    const loadedMembers = saved ? JSON.parse(saved) : MOCK_MEMBERS;
    // Ensure the admin is also in the members list if we just added it
    if (loadedMembers.length === 0 && registeredUsers.length > 0) {
      return registeredUsers.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        grade: u.grade,
        avatar: u.avatar,
        activeLoans: 0,
        points: 0,
        status: 'active'
      }));
    }
    return loadedMembers;
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('atglib_activities_v2');
    return saved ? JSON.parse(saved) : MOCK_ACTIVITIES;
  });
  const [libraryConfig, setLibraryConfig] = useState<LibraryConfig>(() => {
    const saved = localStorage.getItem('atglib_config_v2');
    return saved ? JSON.parse(saved) : LIBRARY_CONFIG;
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('atglib_users_v2', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('atglib_books_v2', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('atglib_members_v2', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('atglib_activities_v2', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('atglib_config_v2', JSON.stringify(libraryConfig));
  }, [libraryConfig]);

  // Automatic Backup System
  useEffect(() => {
    const checkBackup = () => {
      const lastBackupStr = localStorage.getItem('atglib_last_backup');
      const now = Date.now();
      let shouldBackup = false;

      if (!lastBackupStr) {
        shouldBackup = true;
      } else {
        const lastBackup = parseInt(lastBackupStr);
        const dayInMs = 24 * 60 * 60 * 1000;
        
        switch (libraryConfig.backupFrequency) {
          case 'Diário':
            if (now - lastBackup > dayInMs) shouldBackup = true;
            break;
          case 'Semanal':
            if (now - lastBackup > dayInMs * 7) shouldBackup = true;
            break;
          case 'Mensal':
            if (now - lastBackup > dayInMs * 30) shouldBackup = true;
            break;
          default:
            if (now - lastBackup > dayInMs) shouldBackup = true;
        }
      }

      if (shouldBackup) {
        const backupData = {
          timestamp: now,
          users: registeredUsers,
          books,
          members,
          activities,
          config: libraryConfig
        };
        localStorage.setItem('atglib_backup_v2', JSON.stringify(backupData));
        localStorage.setItem('atglib_last_backup', now.toString());
        
        // Log activity if we are logged in as admin or just to system
        setActivities(prev => [{
          id: `SYS-${now}`,
          user: 'Sistema',
          action: 'Backup automático concluído',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'alert'
        }, ...prev]);
        
        console.log('Backup automático realizado com sucesso.');
      }
    };

    // Run check on mount and then every hour
    checkBackup();
    const interval = setInterval(checkBackup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [libraryConfig, registeredUsers, books, members, activities]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentView('dash');
  };

  const handleRegister = (newUser: AuthUser) => {
    setRegisteredUsers([...registeredUsers, newUser]);
    
    // Add as member for management to see
    const newMember: Member = {
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      grade: newUser.grade,
      activeLoans: 0,
      points: 0,
      avatar: newUser.avatar,
      status: 'active'
    };
    setMembers(prev => [...prev, newMember]);
    
    handleLogin(newUser);
  };

  const handleUpdateUser = (updatedData: Partial<User>, targetId?: string) => {
    const idToUpdate = targetId || selectedMemberId || currentUser?.id;
    if (!idToUpdate) return;

    // Update state for currentUser if they are the one being edited
    if (currentUser?.id === idToUpdate) {
      setCurrentUser(prev => prev ? { ...prev, ...updatedData } : null);
    }

    // Update persistent registeredUsers list
    setRegisteredUsers(prev => prev.map(u => u.id === idToUpdate ? { ...u, ...updatedData } : u));

    // Update members list
    setMembers(prev => prev.map(m => m.id === idToUpdate ? { ...m, ...updatedData } : m));
    
    // Log activity
    if (updatedData.name || updatedData.grade) {
      const userName = members.find(m => m.id === idToUpdate)?.name || currentUser?.name || 'Usuário';
      setActivities(prev => [{
        id: `ACT-${Date.now()}`,
        user: 'Sistema',
        action: `Perfil de ${userName} atualizado`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'alert'
      }, ...prev]);
    }
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // Loan Logic
  const handleBorrow = (bookId: string, memberId: string) => {
    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);

    if (book && member && book.status === 'available') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      const dueDateStr = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

      setBooks(prev => prev.map(b => b.id === bookId ? {
        ...b,
        status: 'borrowed',
        borrowerId: member.id,
        borrowerName: member.name,
        dueDate: dueDateStr
      } : b));

      setMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        activeLoans: m.activeLoans + 1
      } : m));

      const newActivity: Activity = {
        id: `ACT-${Date.now()}`,
        user: member.name,
        action: `Emprestou "${book.title}"`,
        time: 'Agora',
        type: 'borrow'
      };
      setActivities(prev => [newActivity, ...prev]);
    }
  };

  const handleReturn = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book && book.status === 'borrowed' && book.borrowerId) {
      const borrowerId = book.borrowerId;
      const borrowerName = book.borrowerName || 'Membro';

      setBooks(prev => prev.map(b => b.id === bookId ? {
        ...b,
        status: 'available',
        borrowerId: undefined,
        borrowerName: undefined,
        dueDate: undefined
      } : b));

      setMembers(prev => prev.map(m => m.id === borrowerId ? {
        ...m,
        activeLoans: Math.max(0, m.activeLoans - 1)
      } : m));

      const newActivity: Activity = {
        id: `ACT-${Date.now()}`,
        user: borrowerName,
        action: `Devolveu "${book.title}"`,
        time: 'Agora',
        type: 'return'
      };
      setActivities(prev => [newActivity, ...prev]);
    }
  };

  const handleToggleReservation = (bookId: string) => {
    if (!currentUser) return;
    
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        if (b.isReserved && b.reservedById === currentUser.id) {
          return { ...b, isReserved: false, reservedById: undefined };
        } else if (!b.isReserved && b.status === 'available') {
          return { ...b, isReserved: true, reservedById: currentUser.id };
        }
      }
      return b;
    }));
  };

  const handleDeleteMember = (memberId: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== memberId));
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setActivities(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      user: 'Sistema',
      action: `Usuário ${memberId} removido`,
      time: 'Agora',
      type: 'alert'
    }, ...prev]);
  };

  const handleAddMember = (member: Member) => {
    // Check if ID already exists
    if (members.find(m => m.id === member.id)) {
      alert('Este ID já está em uso.');
      return;
    }

    setMembers(prev => [...prev, member]);
    
    // Also create matching AuthUser for login
    setRegisteredUsers(prev => [...prev, {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      role: member.role,
      password: '123' // Default password for manually added members
    }]);

    setActivities(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      user: 'Sistema',
      action: `Membro ${member.name} adicionado manualmente`,
      time: 'Agora',
      type: 'alert'
    }, ...prev]);
  };

  const handleGetAiHelp = async () => {
    if (!currentUser) return;
    setIsAiLoading(true);
    setShowAiModal(true);
    setAiRecommendations(null);
    const result = await getLibraryRecommendations(currentUser, books);
    setAiRecommendations(result);
    setIsAiLoading(false);
  };

  const renderView = () => {
    if (!isLoggedIn) return <LoginView onLogin={handleLogin} onRegister={handleRegister} registeredUsers={registeredUsers} />;

    if (currentUser?.role === 'management') {
      switch (currentView) {
        case 'dash': return <DashboardView books={books} members={members} activities={activities} libraryConfig={libraryConfig} onSeeCatalog={() => setCurrentView('catalog')} />;
        case 'library': return (
          <PortalView 
            books={books}
            members={members}
            registeredUsers={registeredUsers}
            onAddBook={(book) => setBooks([book, ...books])}
            onBorrow={handleBorrow}
            onReturn={handleReturn}
            onSeeCatalog={() => setCurrentView('catalog')} 
            onSeeUsers={() => setCurrentView('users')} 
          />
        );
        case 'users': return (
          <DirectoryView 
            members={members} 
            onSelectUser={(id) => {
              setSelectedMemberId(id);
              setCurrentView('profile');
            }} 
            onDeleteMember={handleDeleteMember} 
            onAddMember={handleAddMember} 
          />
        );
        case 'profile': {
          const targetUser = members.find(m => m.id === selectedMemberId) || currentUser;
          return (
            <ProfileView 
              onBack={() => {
                const wasSelecting = !!selectedMemberId;
                setSelectedMemberId(null);
                setCurrentView(wasSelecting ? 'users' : 'dash');
              }} 
              isManagement={currentUser?.role === 'management' && selectedMemberId !== null && selectedMemberId !== currentUser.id} 
              user={targetUser as User} 
              onUpdateUser={(data) => handleUpdateUser(data, targetUser?.id)} 
              books={books} 
              onLogout={handleLogout}
              onInstall={handleInstallClick}
              showInstall={!!deferredPrompt}
            />
          );
        }
        case 'config': return <ConfigView onLogout={handleLogout} config={libraryConfig} onUpdateConfig={setLibraryConfig} />;
        case 'catalog': return <CatalogView books={books} onToggleReservation={handleToggleReservation} currentUser={currentUser} />;
        default: return <DashboardView books={books} members={members} activities={activities} libraryConfig={libraryConfig} onSeeCatalog={() => setCurrentView('catalog')} />;
      }
    } else {
      // Student Role
      switch (currentView) {
        case 'dash': return (
          <StudentDashboardView 
            user={currentUser!} 
            onSeeCatalog={() => setCurrentView('catalog')} 
            books={books} 
            onAiHelp={handleGetAiHelp}
          />
        );
        case 'catalog': return <CatalogView books={books} onToggleReservation={handleToggleReservation} currentUser={currentUser} />;
        case 'profile': return <ProfileView onBack={() => setCurrentView('dash')} isManagement={false} user={currentUser!} onUpdateUser={handleUpdateUser} books={books} onLogout={handleLogout} onInstall={handleInstallClick} showInstall={!!deferredPrompt} />;
        default: return <StudentDashboardView user={currentUser!} onSeeCatalog={() => setCurrentView('catalog')} books={books} onAiHelp={handleGetAiHelp} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-sky-500/30">
      <main className={`max-w-md mx-auto relative min-h-screen border-x border-slate-800/50 shadow-2xl ${isLoggedIn ? 'pb-24' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={isLoggedIn ? `${currentUser?.role}-${currentView}` : 'login'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Navigation */}
        {isLoggedIn && (
          <nav className="fixed bottom-0 left-0 right-0 bg-[#020617]/95 backdrop-blur-xl border-t border-slate-800 px-6 pb-8 pt-3 flex items-center justify-between z-50 max-w-md mx-auto">
            <NavItem 
              active={currentView === 'dash'} 
              onClick={() => setCurrentView('dash')} 
              icon={<LayoutDashboard size={24} />} 
              label="Painel" 
            />
            
            {currentUser?.role === 'management' ? (
              <NavItem 
                active={currentView === 'library'} 
                onClick={() => setCurrentView('library')} 
                icon={<Library size={24} />} 
                label="Biblioteca" 
              />
            ) : (
              <NavItem 
                active={currentView === 'catalog'} 
                onClick={() => setCurrentView('catalog')} 
                icon={<BookOpen size={24} />} 
                label="Catálogo" 
              />
            )}
            

            {currentUser?.role === 'management' ? (
              <NavItem 
                active={currentView === 'users' || currentView === 'profile'} 
                onClick={() => setCurrentView('users')} 
                icon={<Users size={24} />} 
                label="Usuários" 
              />
            ) : (
              <NavItem 
                active={currentView === 'profile'} 
                onClick={() => setCurrentView('profile')} 
                icon={<Users size={24} />} 
                label="Perfil" 
              />
            )}

            {currentUser?.role === 'management' && (
              <NavItem 
                active={currentView === 'config'} 
                onClick={() => setCurrentView('config')} 
                icon={<Settings size={24} />} 
                label="Config" 
              />
            )}
          </nav>
        )}

        <AnimatePresence>
          {showAiModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
              >
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-sky-500/5">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <Sparkles size={20} className="text-[#020617]" />
                    </div>
                    <div>
                      <h3 className="text-white font-black uppercase text-lg leading-none">AtgLib AI</h3>
                      <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mt-1">Biblioteca Inteligente</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAiModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-sky-500 blur-xl opacity-20 animate-pulse"></div>
                        <Bot size={48} className="text-sky-400 animate-bounce" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium animate-pulse text-center">
                        Analisando seu perfil e o acervo...
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm">
                      <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {aiRecommendations}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-800">
                  <button 
                    onClick={() => setShowAiModal(false)}
                    className="w-full h-12 bg-white/5 text-white rounded-xl font-bold border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-colors ${active ? 'text-sky-400' : 'text-slate-500'}`}
    >
      <div className={active ? 'scale-110 transition-transform' : ''}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      {active && <motion.div layoutId="nav-indicator" className="w-8 h-0.5 bg-sky-400 rounded-full mt-0.5" />}
    </button>
  );
}

// --- VIEWS ---

function DashboardView({ books, members, activities, libraryConfig, onSeeCatalog }: { books: Book[], members: Member[], activities: Activity[], libraryConfig: LibraryConfig, onSeeCatalog: () => void }) {
  const [timeRange, setTimeRange] = useState('W');
  const [showNotification, setShowNotification] = useState(false);
  
  const activeLoans = books.filter(b => b.status === 'borrowed').length;
  const overdueBooks = books.filter(b => b.isOverdue);

  useEffect(() => {
    if (overdueBooks.length > 0) {
      const timer = setTimeout(() => setShowNotification(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [overdueBooks.length]);

  return (
    <div className="p-4 space-y-8">
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-rose-500 text-white p-4 rounded-2xl shadow-2xl shadow-rose-500/40 flex items-center gap-4 border border-rose-400"
          >
            <div className="bg-white/20 p-2 rounded-xl">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Alerta de Atraso</p>
              <p className="text-sm font-bold leading-tight">Existem {overdueBooks.length} livros com devolução pendente!</p>
            </div>
            <button onClick={() => setShowNotification(false)} className="bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/10 p-2 rounded-lg border border-sky-500/20">
            <LayoutDashboard className="text-sky-400" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">AtgLib Analytics</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{libraryConfig.name}</p>
          </div>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700">
          <Users size={20} className="text-slate-300" />
        </button>
      </header>

      <section className="bg-[#0f172a] rounded-2xl p-5 shadow-2xl border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell className="text-sky-400" size={20} />
            <h2 className="text-xl font-bold tracking-tight text-white">Atividades</h2>
          </div>
        </div>
        
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.slice(0, 3).map(act => (
              <div key={act.id} className="flex items-center gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center ${
                  act.type === 'borrow' ? 'bg-emerald-500/20 text-emerald-400' : 
                  act.type === 'return' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {act.type === 'borrow' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white font-bold">{act.user}</p>
                  <p className="text-[10px] text-slate-500">{act.action}</p>
                </div>
                <span className="text-[9px] font-black text-slate-600 uppercase">{act.time}</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">Nenhuma atividade recente.</p>
          )}
        </div>
      </section>


      <section className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="h-10 w-10 bg-sky-500/10 rounded-lg flex items-center justify-center mb-4">
            <BookOpen className="text-sky-400" size={20} />
          </div>
          <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Empréstimos Ativos</p>
          <h4 className="text-2xl font-black text-white">{activeLoans}</h4>
        </div>
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="h-10 w-10 bg-sky-500/10 rounded-lg flex items-center justify-center mb-4">
            <Users className="text-sky-400" size={20} />
          </div>
          <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Membros</p>
          <h4 className="text-2xl font-black text-white">{members.length}</h4>
        </div>
      </section>

      <section>
        <button 
          onClick={onSeeCatalog}
          className="w-full h-14 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Library size={20} />
          <span>Ver Catálogo Completo</span>
        </button>
      </section>
    </div>
  );
}

function PortalView({ 
  books, 
  members, 
  registeredUsers,
  onAddBook, 
  onBorrow, 
  onReturn, 
  onSeeCatalog, 
  onSeeUsers 
}: { 
  books: Book[], 
  members: Member[], 
  registeredUsers: AuthUser[],
  onAddBook: (book: Book) => void,
  onBorrow: (bookId: string, memberId: string) => void,
  onReturn: (bookId: string) => void,
  onSeeCatalog: () => void, 
  onSeeUsers: () => void 
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const handleAddBook = (newBook: any) => {
    onAddBook(newBook);
    setIsRegistering(false);
    setMessage('Livro cadastrado com sucesso!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleBorrowSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedBookId && selectedMemberId) {
      onBorrow(selectedBookId, selectedMemberId);
      setIsBorrowing(false);
      setSelectedBookId(null);
      setSelectedMemberId('');
      setMessage('Empréstimo realizado com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const activeLoans = books.filter(b => b.status === 'borrowed').length;
  const overdueCount = books.filter(b => b.isOverdue).length;

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center bg-[#1e293b] p-4 pb-8 pt-6 justify-between rounded-b-[2.5rem] shadow-2xl -mx-4 border-b border-white/5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-sm">
          <ShieldCheck size={24} strokeWidth={2.5} />
        </div>
        <div className="flex-1 px-4">
          <h1 className="text-white text-lg font-bold leading-tight tracking-tight">Portal AtgLib</h1>
        </div>
        <button className="flex items-center justify-center rounded-full h-10 w-10 bg-white/5 text-sky-400 border border-white/10">
          <Bell size={20} />
        </button>
      </header>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-emerald-500 text-[#020617] p-3 rounded-xl text-center font-bold text-xs shadow-lg"
        >
          {message}
        </motion.div>
      )}

      <div className="flex flex-wrap gap-3">
        <StatCard icon={<Library size={20} />} label="Total de Livros" value={books.length.toString()} trend="0%" />
        <StatCard icon={<Clock size={20} />} label="Empréstimos Ativos" value={activeLoans.toString()} trend="0%" />
        <StatCard icon={<AlertCircle size={20} />} label="Atrasados" value={overdueCount.toString()} trend="0%" color="text-rose-400" />
      </div>

      <div>
        <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60">Ações Rápidas</h3>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsRegistering(true)}
            className="flex items-center justify-center gap-2 rounded-xl h-14 bg-sky-500 text-[#020617] font-bold text-sm shadow-xl shadow-sky-500/10 active:scale-95 transition-transform"
          >
            <Plus size={20} />
            <span>Cadastrar Novo Livro</span>
          </button>
          <button 
            onClick={onSeeCatalog}
            className="flex items-center justify-center gap-2 rounded-xl h-14 bg-[#1e293b] text-white border border-white/5 font-bold text-sm shadow-xl active:scale-95 transition-transform"
          >
            <Library size={20} className="text-sky-400" />
            <span>Visualizar Catálogo Completo</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] opacity-60">Gestão de Acervo</h3>
        <div className="space-y-3">
          {books.length > 0 ? (
            books.map(book => (
              <div key={book.id} className="bg-[#1e293b] p-4 rounded-2xl border border-white/5 flex gap-4">
                <img src={book.cover} className="w-16 h-22 rounded-lg object-cover" alt={book.title} />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white font-bold text-sm">{book.title}</h4>
                    <p className="text-slate-500 text-[10px]">{book.author}</p>
                    <div className="mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        book.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {book.status === 'available' ? 'Disponível' : `Emprestado para ${book.borrowerName}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {book.status === 'available' ? (
                      <button 
                        onClick={() => { setSelectedBookId(book.id); setIsBorrowing(true); }}
                        className="flex-1 bg-sky-500 text-[#020617] py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                      >
                        Emprestar
                      </button>
                    ) : (
                      <button 
                        onClick={() => onReturn(book.id)}
                        className="flex-1 bg-slate-700 text-white py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                      >
                        Devolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 italic text-sm">
              Nenhum livro no sistema.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isRegistering && (
          <BookRegistration onAddBook={handleAddBook} onCancel={() => setIsRegistering(false)} />
        )}
        
        {isBorrowing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm bg-[#0f172a] rounded-3xl p-6 border border-slate-800"
            >
              <h2 className="text-xl font-bold text-white mb-6">Realizar Empréstimo</h2>
              <form onSubmit={handleBorrowSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selecionar Membro</label>
                  <select 
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full h-14 bg-[#1e293b] border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 outline-none"
                    required
                  >
                    <option value="">Selecione um aluno/professor</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role === 'student' ? 'Aluno' : 'Gestão'})</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsBorrowing(false)}
                    className="flex-1 h-12 bg-slate-800 text-white rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 h-12 bg-sky-500 text-[#020617] rounded-xl font-bold"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color = "text-sky-400" }: { icon: ReactNode, label: string, value: string, trend: string, color?: string }) {
  return (
    <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-2xl p-4 bg-[#1e293b] border border-white/5 shadow-2xl">
      <div className="flex items-center justify-between mb-1">
        <div className={color}>{icon}</div>
        <span className={`${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'} text-[10px] font-bold`}>{trend}</span>
      </div>
      <p className="text-slate-400 text-xs font-medium">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  );
}

function BookRegistration({ onAddBook, onCancel }: { onAddBook: (book: any) => void, onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/png'));
        stopCamera();
      }
    }
  };

  const handleSave = () => {
    setError(null);
    if (!title) {
      setError("Ops! Todo livro precisa de um título para ser identificado.");
      return;
    }
    if (!author) {
      setError("Não esqueça de informar quem escreveu o livro.");
      return;
    }
    if (!photo) {
      setError("Uma imagem da capa ajuda os alunos a encontrarem o livro mais rápido.");
      return;
    }

    onAddBook({
      id: `BOOK-${Date.now()}`,
      title,
      author,
      genre,
      cover: photo,
      status: 'available'
    });
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#0f172a] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Novo Livro</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-2 text-rose-500 text-[11px] font-bold"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-4">
            <div 
              onClick={!photo && !isCameraActive ? startCamera : undefined}
              className={`aspect-[3/4] bg-[#1e293b] rounded-2xl overflow-hidden relative border border-slate-700 shadow-inner flex items-center justify-center ${!photo && !isCameraActive ? 'cursor-pointer hover:bg-slate-800 transition-colors group' : ''}`}
            >
              {photo ? (
                <img src={photo} className="w-full h-full object-cover" alt="Capa do livro" />
              ) : isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="text-center space-y-2">
                  <Camera className="mx-auto text-slate-600 group-hover:text-sky-500 transition-colors" size={48} />
                  <p className="text-slate-500 text-sm font-medium group-hover:text-slate-400 transition-colors">Tocar para abrir Câmera</p>
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                {!photo && !isCameraActive && (
                  <button onClick={startCamera} className="bg-sky-500 text-[#020617] px-6 py-2.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                    <Camera size={18} />
                    Ativar Câmera
                  </button>
                )}
                {isCameraActive && (
                  <button onClick={takePhoto} className="bg-emerald-500 text-white size-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform border-4 border-white/20">
                    <div className="size-6 bg-white rounded-full" />
                  </button>
                )}
                {photo && (
                  <button onClick={() => { setPhoto(null); startCamera(); }} className="bg-slate-800/80 backdrop-blur-md text-white px-6 py-2.5 rounded-full font-bold text-sm border border-white/10 shadow-lg active:scale-95 transition-transform">
                    Tirar Outra
                  </button>
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Livro</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Dom Casmurro"
                className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Autor</label>
              <input 
                type="text" 
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Machado de Assis"
                className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gênero</label>
              <select 
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
              >
                <option value="">Selecione um gênero</option>
                {COMMON_GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-[#0f172a]">
          <button 
            onClick={handleSave}
            className="w-full h-14 bg-sky-500 text-[#020617] rounded-2xl font-bold shadow-xl shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} />
            <span>Salvar no Catálogo</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DirectoryView({ members, onSelectUser, onDeleteMember, onAddMember }: { members: Member[], onSelectUser: (id: string) => void, onDeleteMember: (id: string) => void, onAddMember: (member: Member) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Série');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(search.toLowerCase()) ||
    member.id.toLowerCase().includes(search.toLowerCase()) ||
    member.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newId) return;
    
    onAddMember({
      id: newId,
      name: newName,
      role: newRole,
      avatar: PREDEFINED_AVATARS[Math.floor(Math.random() * PREDEFINED_AVATARS.length)],
      activeLoans: 0,
      points: 0,
      status: 'active'
    });
    
    setShowAddModal(false);
    setNewName('');
    setNewId('');
    setNewRole('student');
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center py-4 justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-20 border-b border-slate-800/50 -mx-4 px-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#1e293b] text-white border border-slate-700">
          <Users size={20} />
        </div>
        <h2 className="text-base font-bold uppercase tracking-widest flex-1 text-center text-white">Diretório de Membros</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex size-10 items-center justify-center rounded-lg bg-sky-500 text-[#020617] shadow-lg active:scale-95 transition-transform"
        >
          <UserPlus size={20} />
        </button>
      </header>


      <div className="py-2">
        <div className="flex w-full items-center rounded-lg bg-[#1e293b]/50 border border-slate-800 px-4 h-12 shadow-inner">
          <Search className="text-slate-500" size={20} />
          <input 
            className="flex w-full border-none bg-transparent focus:ring-0 text-sm font-medium placeholder:text-slate-600 text-white ml-2" 
            placeholder="Buscar por nome, ID ou cargo..." 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <FilterBadge label="Série" active={filter === 'Série'} onClick={() => setFilter('Série')} />
        <FilterBadge label="Status" active={filter === 'Status'} onClick={() => setFilter('Status')} />
        <FilterBadge label="Cargo" active={filter === 'Cargo'} onClick={() => setFilter('Cargo')} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Base de Dados Ativa</h3>
        </div>

        {filteredMembers.length > 0 ? (
          filteredMembers.map(member => (
            <div 
              key={member.id} 
              className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group relative ${
                member.id === 'LIB-2024-002' 
                  ? 'bg-sky-500/10 border-sky-500/30 shadow-lg' 
                  : 'bg-[#1e293b]/40 border-slate-800/30 hover:bg-[#1e293b]'
              }`}
            >
              <div className="relative" onClick={() => onSelectUser(member.id)}>
                <img src={member.avatar} className={`size-12 rounded-lg object-cover border ${member.id === 'LIB-2024-002' ? 'border-sky-500/30' : 'border-slate-700'}`} alt={member.name} />
                {member.status === 'active' && <div className="absolute -top-1 -left-1 size-3 bg-emerald-400 rounded-full border-2 border-[#020617]"></div>}
                {member.status === 'blocked' && <div className="absolute -top-1 -left-1 size-3 bg-orange-400 rounded-full border-2 border-[#020617]"></div>}
                {member.status === 'banned' && <div className="absolute -top-1 -left-1 size-3 bg-rose-400 rounded-full border-2 border-[#020617]"></div>}
              </div>
              <div className="ml-4 flex-1" onClick={() => onSelectUser(member.id)}>
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold text-sm tracking-tight ${member.id === 'LIB-2024-002' ? 'text-white' : 'text-slate-200'}`}>{member.name.toUpperCase()}</h4>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {member.status === 'blocked' && <span className="px-1.5 py-0.5 rounded-sm bg-orange-500/20 text-orange-400 text-[8px] font-black border border-orange-500/30">BLOQUEADO</span>}
                    {member.status === 'banned' && <span className="px-1.5 py-0.5 rounded-sm bg-rose-500/20 text-rose-400 text-[8px] font-black border border-rose-500/30">BANIDO</span>}
                    <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black border ${
                      member.role === 'Professor' 
                        ? 'bg-sky-500 text-[#020617] border-sky-500' 
                        : 'bg-[#1e293b] text-slate-400 border-slate-700'
                    }`}>
                      {member.grade || 'FACULTY'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] mt-0.5 flex items-center gap-1 font-medium ${member.id === 'LIB-2024-002' ? 'text-sky-400' : 'text-slate-500'}`}>
                    <BookOpen size={12} />
                    {member.activeLoans} empréstimos • {member.points} pts
                  </p>
                  {member.role !== 'management' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMember(member.id);
                      }}
                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
            <Users className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400 font-bold tracking-tight">Nenhum membro encontrado</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-800 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-1">
                <h3 className="text-white font-black uppercase text-xl leading-none">Novo Membro</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Cadastro Manual</p>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 outline-none"
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID da Biblioteca</label>
                  <input 
                    type="text" 
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 outline-none uppercase"
                    placeholder="Ex: ALN-2024-XXX"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cargo / Função</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 outline-none"
                  >
                    <option value="student">Aluno</option>
                    <option value="management">Gestão</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-14 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 h-14 bg-sky-500 text-[#020617] rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sky-500/20"
                  >
                    Cadastrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterBadge({ label, active = false, onClick }: { label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-md px-5 shadow-sm border transition-colors ${
        active ? 'bg-sky-500 text-[#020617] border-sky-500' : 'bg-[#1e293b] text-white border-slate-700'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-tight">{label}</p>
      <Plus size={14} className={active ? 'text-[#020617]' : 'text-slate-500'} />
    </button>
  );
}

function ProfileView({ onBack, isManagement, user, onUpdateUser, books, onLogout, onInstall, showInstall }: { onBack: () => void, isManagement: boolean, user: User, onUpdateUser: (data: Partial<User>) => void, books: Book[], onLogout?: () => void, onInstall?: () => void, showInstall?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editGrade, setEditGrade] = useState(user.grade || '');
  const [activeTab, setActiveTab] = useState('Ativos');

  // Logic for allowing editing
  // Admin can edit anyone, Students can only edit themselves (controlled by isManagement prop passed from app)
  const canEdit = true; // Component itself allows toggling, permissions are handled by parent logic passing isManagement correctly

  const userLoans = books.filter(b => b.borrowerId === user.id);
  const points = userLoans.length * 5;

  const handleSave = () => {
    onUpdateUser({ name: editName, grade: editGrade });
    setIsEditing(false);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="pb-12">
      <header className="sticky top-0 z-30 flex items-center bg-[#020817]/80 backdrop-blur-xl p-4 justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center justify-center size-10 rounded-full hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} className="text-slate-300" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-white">{isManagement ? 'Gestão de Membro' : 'Meu Perfil'}</h1>
        </div>
        
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-400/10 px-4 py-2 rounded-full border border-sky-400/20"
        >
          {isEditing ? 'Salvar' : 'Editar'}
        </button>
      </header>

      <section className="flex flex-col items-center p-8 bg-[#0f172a] mx-4 mt-6 rounded-3xl shadow-2xl border border-slate-800">
        <div className="relative group">
          <img 
            src={user.avatar} 
            className="rounded-full size-32 ring-4 ring-slate-800 shadow-xl object-cover" 
            alt={user.name} 
          />
          <div className="absolute bottom-2 right-2 bg-emerald-500 size-6 rounded-full border-4 border-[#0f172a] shadow-md"></div>
          
          {isEditing && (
            <div className="absolute inset-x-0 -bottom-2 flex flex-col items-center gap-2">
              <label className="flex items-center justify-center bg-sky-500 text-[#020617] size-10 rounded-full cursor-pointer shadow-lg active:scale-95 transition-transform border-4 border-[#1e293b]">
                <Plus size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </label>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-8 w-full border-t border-slate-800/50 pt-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-4">Escolha um Avatar AtgLib</h4>
            <div className="grid grid-cols-4 gap-3 place-items-center">
              {PREDEFINED_AVATARS.map((avatarUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => onUpdateUser({ avatar: avatarUrl })}
                  className={`size-12 rounded-full overflow-hidden border-2 transition-all active:scale-90 ${user.avatar === avatarUrl ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                >
                  <img src={avatarUrl} className="w-full h-full object-cover" alt={`Avatar ${idx}`} />
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center w-full max-w-[240px]">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-center text-white font-bold outline-none focus:border-sky-500"
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Série / Classe</label>
                <input 
                  type="text" 
                  value={editGrade} 
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-center text-white font-bold outline-none focus:border-sky-500"
                  placeholder="Série"
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">{user.name}</h2>
              <p className="text-sky-400 font-black uppercase text-[10px] tracking-[0.2em] mt-1">
                {user.role === 'management' ? 'Gestão de Sistema' : (user.grade || 'Membro Ativo')}
              </p>
            </>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-600 text-xs font-black uppercase tracking-widest bg-slate-800/30 py-1.5 px-3 rounded-md border border-white/5">
            <ScanBarcode size={14} className="text-sky-500" />
            <span>{user.id}</span>
          </div>
        </div>
        
        {isManagement ? (
          <div className="grid grid-cols-2 gap-3 mt-8 w-full">
            <button className="flex items-center justify-center gap-2 h-14 bg-orange-500/10 text-orange-500 rounded-2xl font-bold border border-orange-500/20 active:scale-95 transition-transform">
              <AlertCircle size={18} />
              <span>Bloquear</span>
            </button>
            <button className="flex items-center justify-center gap-2 h-14 bg-rose-500/10 text-rose-500 rounded-2xl font-bold border border-rose-500/20 active:scale-95 transition-transform">
              <LogOut size={18} />
              <span>Banir</span>
            </button>
            <button className="col-span-2 flex items-center justify-center gap-2 h-14 bg-sky-500 text-[#020617] rounded-2xl font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition-transform">
              <Bell size={18} />
              <span>Enviar Notificação</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-8 w-full">
            <div className="flex gap-4 w-full">
              <button className="flex-[2] flex items-center justify-center gap-2 h-14 px-6 bg-sky-500 text-[#020617] rounded-2xl font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition-transform">
                <Bell size={18} />
                <span>Lembretes</span>
              </button>
              <button className="flex items-center justify-center size-14 bg-slate-800 text-white rounded-2xl active:scale-95 transition-transform border border-white/5">
                <Settings size={20} />
              </button>
            </div>
            
            {showInstall && onInstall && (
              <button 
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 h-14 bg-sky-500/10 text-sky-400 rounded-2xl font-bold border border-sky-500/20 active:scale-95 transition-transform mb-2"
              >
                <Download size={18} />
                <span>Instalar Aplicativo (PWA)</span>
              </button>
            )}
            
            {onLogout && (
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 h-14 bg-rose-500/10 text-rose-500 rounded-2xl font-bold border border-rose-500/20 active:scale-95 transition-transform"
              >
                <LogOut size={18} />
                <span>Sair da Conta</span>
              </button>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3 px-4 py-8">
        <ProfileStat icon={<BookOpen size={18} />} value="0" label="Lidos" color="text-sky-400" />
        <ProfileStat icon={<Library size={18} />} value={userLoans.length.toString()} label="Ativos" color="text-orange-400" />
        <ProfileStat icon={<TrendingUp size={18} />} value={points.toString()} label="Pontos" color="text-rose-400" />
      </section>

      <nav className="flex border-b border-slate-800 px-4 sticky top-[73px] bg-[#020617]/90 backdrop-blur-md z-20">
        <button 
          onClick={() => setActiveTab('Ativos')}
          className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-colors ${activeTab === 'Ativos' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500'}`}
        >
          Ativos
        </button>
        <button 
          onClick={() => setActiveTab('Histórico')}
          className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-colors ${activeTab === 'Histórico' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500'}`}
        >
          Histórico
        </button>
        <button 
          onClick={() => setActiveTab('Registros')}
          className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-colors ${activeTab === 'Registros' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500'}`}
        >
          Registros
        </button>
      </nav>

      <section className="p-4 space-y-6 mt-4">
        {activeTab === 'Ativos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg tracking-tight px-1">Empréstimos Atuais</h3>
              <span className="text-xs text-sky-400 font-bold uppercase tracking-widest bg-sky-400/10 px-3 py-1.5 rounded-full">Ver Política</span>
            </div>
            <div className="space-y-4">
              {userLoans.length > 0 ? (
                userLoans.map(book => (
                  <div key={book.id} className="flex gap-4 p-5 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl">
                    <img src={book.cover} className="w-20 h-28 flex-shrink-0 rounded-xl object-cover shadow-lg border border-white/5" alt={book.title} />
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="font-bold text-white text-base leading-snug">{book.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{book.author}</p>
                      </div>
                      <div className="mt-4 flex items-end justify-between">
                        <div className="flex flex-col">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Data Limite</p>
                          <p className="text-sm font-bold mt-0.5 text-sky-400">
                            {book.dueDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">Nenhum empréstimo ativo.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Histórico' && (
          <div className="pt-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg tracking-tight px-1 uppercase">Histórico de Leitura</h3>
              <button className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-1">
                Arquivo Completo <TrendingUp size={14} />
              </button>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 text-slate-500 text-sm italic">
              Nenhum livro no histórico.
            </div>
          </div>
        )}

        {activeTab === 'Registros' && (
          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg tracking-tight px-1 uppercase">Atividades</h3>
            <p className="text-slate-500 text-sm text-center py-4">Nenhuma atividade registrada.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileStat({ icon, value, label, color }: { icon: ReactNode, value: string, label: string, color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-[#0f172a] border border-slate-800 p-4 items-center text-center shadow-lg">
      <div className={color}>{icon}</div>
      <p className="text-white text-xl font-bold">{value}</p>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

function ConfigView({ onLogout, config, onUpdateConfig }: { onLogout: () => void, config: LibraryConfig, onUpdateConfig: (config: LibraryConfig) => void }) {
  const [editingKey, setEditingKey] = useState<keyof LibraryConfig | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEdit = (key: keyof LibraryConfig, currentValue: any) => {
    setEditingKey(key);
    setEditValue(currentValue.toString());
  };

  const handleSaveEdit = () => {
    if (editingKey) {
      const newValue = editingKey === 'loanLimit' || editingKey === 'loanDuration' || editingKey === 'pointsPerOverdueDay'
        ? parseInt(editValue) || 0
        : editingKey === 'notificationsEnabled'
          ? editValue === 'true'
          : editValue;
      
      onUpdateConfig({ ...config, [editingKey]: newValue });
      setEditingKey(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center py-4 justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-20 border-b border-slate-800/50 -mx-4 px-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#1e293b] text-white border border-slate-700">
          <Settings size={20} />
        </div>
        <h2 className="text-base font-bold uppercase tracking-widest flex-1 text-center text-white">Configurações</h2>
        <div className="w-10" />
      </header>

      <div className="space-y-4">
        <ConfigSection title="Geral">
          <ConfigItem 
            icon={<Library size={18} />} 
            label="Nome da Biblioteca" 
            value={config.name} 
            onClick={() => handleEdit('name', config.name)}
          />
          <ConfigItem 
            icon={<Clock size={18} />} 
            label="Horário de Funcionamento" 
            value={config.openingHours} 
            onClick={() => handleEdit('openingHours', config.openingHours)}
          />
        </ConfigSection>

        <ConfigSection title="Empréstimos">
          <ConfigItem 
            icon={<BookOpen size={18} />} 
            label="Limite de Livros" 
            value={`${config.loanLimit} por aluno`} 
            onClick={() => handleEdit('loanLimit', config.loanLimit)}
          />
          <ConfigItem 
            icon={<History size={18} />} 
            label="Duração Padrão" 
            value={`${config.loanDuration} dias`} 
            onClick={() => handleEdit('loanDuration', config.loanDuration)}
          />
          <ConfigItem 
            icon={<TrendingUp size={18} />} 
            label="Pontos por Atraso" 
            value={`${config.pointsPerOverdueDay} pontos / dia`} 
            onClick={() => handleEdit('pointsPerOverdueDay', config.pointsPerOverdueDay)}
          />
        </ConfigSection>

        <ConfigSection title="Sistema">
          <ConfigItem 
            icon={<Bell size={18} />} 
            label="Notificações Push" 
            value={config.notificationsEnabled ? "Ativado" : "Desativado"} 
            onClick={() => onUpdateConfig({ ...config, notificationsEnabled: !config.notificationsEnabled })}
          />
          <ConfigItem 
            icon={<Settings size={18} />} 
            label="Backup de Dados" 
            value={config.backupFrequency} 
            onClick={() => handleEdit('backupFrequency', config.backupFrequency)}
          />
        </ConfigSection>

        <div className="pt-4">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 h-14 bg-rose-500/10 text-rose-500 rounded-2xl font-bold border border-rose-500/20 active:scale-95 transition-transform"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {editingKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#0f172a] rounded-3xl p-6 border border-slate-800 shadow-2xl"
            >
              <h3 className="text-white font-bold text-lg mb-4">Editar Configuração</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{editingKey === 'name' ? 'Nome' : 'Valor'}</label>
                  {editingKey === 'backupFrequency' ? (
                    <select 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full h-14 bg-[#1e293b] border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 outline-none mt-1"
                      autoFocus
                    >
                      <option value="Diário">Diário</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full h-14 bg-[#1e293b] border border-slate-800 rounded-2xl px-4 text-sm text-white focus:border-sky-500 outline-none mt-1"
                      autoFocus
                    />
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingKey(null)} className="flex-1 h-12 bg-slate-800 text-white rounded-xl font-bold">Cancelar</button>
                  <button onClick={handleSaveEdit} className="flex-1 h-12 bg-sky-500 text-[#020617] rounded-xl font-bold shadow-lg shadow-sky-500/20">Salvar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfigSection({ title, children }: { title: string, children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">{title}</h3>
      <div className="bg-[#1e293b]/40 rounded-2xl border border-slate-800/50 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ConfigItem({ icon, label, value, onClick }: { icon: ReactNode, label: string, value?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-slate-800/30 last:border-none group"
    >
      <div className="flex items-center gap-3">
        <div className="text-sky-400 group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-sm font-medium text-slate-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-bold text-slate-500">{value}</span>}
        <ChevronRight size={14} className="text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

function LoginView({ onLogin, onRegister, registeredUsers }: { onLogin: (user: User) => void, onRegister: (user: AuthUser) => void, registeredUsers: AuthUser[] }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Ops! Precisamos do seu e-mail para encontrar sua conta.');
      return;
    }
    
    if (!password) {
      setError('Você esqueceu de digitar sua senha.');
      return;
    }

    if (isSignUp) {
      // Registration Logic
      if (password.length < 6) {
        setError('Para sua segurança, escolha uma senha com pelo menos 6 caracteres.');
        return;
      }

      const userExists = registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        setError('Parece que este e-mail já tem uma conta. Tente fazer login ou use outro e-mail.');
        return;
      }

      const role: UserRole = accessKey === 'sougestao152' ? 'management' : 'student';
      
      if (accessKey && accessKey !== 'sougestao152') {
        setError('Essa chave de gestão não é válida. Verifique se digitou corretamente ou peça ao tutor.');
        return;
      }

      if (role === 'student' && !grade) {
        setError('Por favor, informe sua turma para que possamos organizar seus empréstimos.');
        return;
      }

      const newUser: AuthUser = {
        id: role === 'management' ? `M-${Date.now()}` : `S-${Date.now()}`,
        name: email.split('@')[0],
        email: email.toLowerCase(),
        password,
        role,
        grade: role === 'student' ? grade : undefined,
        avatar: role === 'management' 
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAx7ccP7nRzIF7HkOmEtHqf6O1NLCLxLhD2wxhyQMQnMt2QlpI7fGe8WfNS3OxChDgeHj5__l85eOpn_Ornnw7fmDFhmKUyfagdAzapqKeQ2IFfMjozLrIQvT516-d9ntuc4gX8ab4DRaOTf-pLrth3BGyc_at4sfsAT2I100xq5_CupolHZw2UYhRPKYVYjVtQKrZSCgRCE80Dsom6VHwYg38X1dIwrUC7psulkeX_KXpSjz8_U_XJ2NoyEtk1BszTdjWbGtnJ3eJ6'
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDhioBa5ReTOCFru9PGC7JuEKa6FIF3-njqMR3DcytRFwudgD6zNTjWNRL7WtPLhHIu9jeLdV_A6w-Runpm9-pF_5amGE09Pzmtz9J3XTpH3B2ct2YW4mI29YqDGQeMKJJriqZN5f_M6LfESi3fHAshzzc_-oFoW_TmxlhV3Bq7aNP67Gc-Vn2OSXHg38taPDzVMTUI3nsfk-Y9OVG8vc5yF-gbSu5oTcBTj73M56B1O3IEd4AC6Ly0x2hPN8cUllRdYBilQ6bQ8VN'
      };

      onRegister(newUser);
    } else {
      // Login Logic
      const userByEmail = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!userByEmail) {
        setError('Não encontramos nenhuma conta com este e-mail. Verifique a digitação ou crie uma nova conta.');
        return;
      }

      if (userByEmail.password !== password) {
        setError('Senha incorreta. Se você esqueceu, tente criar uma nova conta ou peça ajuda na biblioteca.');
        return;
      }
      
      onLogin(userByEmail);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#020617]">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">ATGLIB</h1>
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <div className="absolute inset-0 bg-sky-500 blur-2xl opacity-20 animate-pulse"></div>
                <BookIcon size={80} className="text-sky-400 relative z-10" strokeWidth={1.5} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sky-400 font-bold text-xs uppercase tracking-[0.2em] opacity-90">Biblioteca Digital</p>
              <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest leading-tight max-w-[200px] mx-auto">Escola Antonio Teixeira Gueiros</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl pl-12 pr-12 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave de Gestão (Opcional)</label>
                <div className="relative">
                  <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type={showAccessKey ? "text" : "password"}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Chave administrativa"
                    className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl pl-12 pr-12 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowAccessKey(!showAccessKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors"
                  >
                    {showAccessKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!accessKey && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Turma</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="Ex: 10º Ano B"
                      className="w-full h-14 bg-[#1e293b]/50 border border-slate-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[11px] font-bold"
              >
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            className="w-full h-14 bg-sky-500 text-[#020617] rounded-2xl font-bold shadow-xl shadow-sky-500/20 active:scale-[0.98] transition-all mt-4"
          >
            {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-xs text-slate-500 font-bold hover:text-sky-400 transition-colors"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
          </button>
        </div>


      </div>
    </div>
  );
}

function StudentDashboardView({ user, onSeeCatalog, books, onAiHelp }: { user: User, onSeeCatalog: () => void, books: Book[], onAiHelp: () => void }) {
  const userLoans = books.filter(b => b.borrowerId === user.id);
  const points = userLoans.length * 5;

  return (
    <div className="p-4 space-y-8">
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <img src={user.avatar} className="size-12 rounded-full border-2 border-sky-500/30 object-cover" alt={user.name} />
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">Olá, {user.name.split(' ')[0]}</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{user.grade || '10º Ano - Seção B'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onAiHelp}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/5 active:scale-90 transition-transform"
          >
            <Sparkles size={18} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700">
            <Bell size={20} className="text-slate-300" />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <ProfileStat icon={<BookOpen size={18} />} value="0" label="Lidos" color="text-sky-400" />
        <ProfileStat icon={<Library size={18} />} value={userLoans.length.toString()} label="Ativos" color="text-orange-400" />
        <ProfileStat icon={<TrendingUp size={18} />} value={points.toString()} label="Pontos" color="text-rose-400" />
      </section>

      <button 
        onClick={onSeeCatalog}
        className="w-full h-16 bg-[#1e293b] rounded-2xl border border-white/5 shadow-xl flex items-center justify-between px-6 group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-sky-500/10 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-[#020617] transition-colors">
            <BookIcon size={20} className="text-sky-400 group-hover:text-inherit" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">Explorar Catálogo</p>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Ver todos os livros</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
      </button>

      <section className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-[2rem] p-6 shadow-2xl shadow-sky-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Library size={120} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1">Seu Progresso</p>
          <h3 className="text-white text-3xl font-black tracking-tight">{points >= 50 ? 'Leitor Elite' : points >= 20 ? 'Leitor Frequente' : 'Leitor Iniciante'}</h3>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                style={{ width: `${Math.min(100, (points / 100) * 100)}%` }}
              ></div>
            </div>
            <span className="text-white text-xs font-black">{Math.min(100, (points / 100) * 100)}%</span>
          </div>
          <p className="text-sky-100 text-[10px] font-bold mt-3 opacity-80">
            {points >= 100 ? 'Nível máximo atingido!' : `Faltam ${20 - (userLoans.length % 20)} livros para o próximo marco`}
          </p>
        </div>
      </section>

      <section className="bg-[#0f172a] rounded-2xl p-5 shadow-2xl border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-lg tracking-tight">Meus Empréstimos</h3>
          <button onClick={onSeeCatalog} className="text-xs text-sky-400 font-bold uppercase tracking-widest bg-sky-400/10 px-3 py-1.5 rounded-full">Catálogo</button>
        </div>
        <div className="space-y-4">
          {userLoans.length > 0 ? (
            userLoans.map(book => (
              <div key={book.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <img src={book.cover} className="w-16 h-24 flex-shrink-0 rounded-lg object-cover shadow-lg" alt={book.title} />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-bold text-white text-sm leading-snug">{book.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{book.author}</p>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="flex flex-col">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Vence em</p>
                      <p className="text-xs font-bold mt-0.5 text-sky-400">
                        {book.dueDate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">Você não possui empréstimos ativos.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] opacity-60">Recomendados</h3>
          <button onClick={onSeeCatalog} className="text-sky-400 text-xs font-bold">Ver Tudo</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {books.length > 0 ? (
            books.slice(0, 3).map(book => (
              <div key={book.id} className="flex flex-col min-w-[120px] gap-2">
                <div className="aspect-[3/4] rounded-xl bg-[#020617] overflow-hidden shadow-xl border border-white/10">
                  <img src={book.cover} className="w-full h-full object-cover opacity-80" alt={book.title} />
                </div>
                <p className="text-white text-[10px] font-bold mt-1 truncate">{book.title}</p>
              </div>
            ))
          ) : (
            <div className="flex-1 py-10 text-center bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Inicie sua próxima aventura</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CatalogView({ books, onToggleReservation, currentUser }: { books: Book[], onToggleReservation: (id: string) => void, currentUser: User | null }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'borrowed'>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const genres = ['all', ...COMMON_GENRES];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) ||
                         book.author.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
    const matchesGenre = genreFilter === 'all' || book.genre === genreFilter;
    
    return matchesSearch && matchesStatus && matchesGenre;
  });

  const handleReserve = (id: string) => {
    const book = books.find(b => b.id === id);
    if (!book) return;

    if (book.isReserved) {
      if (book.reservedById === currentUser?.id) {
        onToggleReservation(id);
        setMessage('A reserva foi cancelada. O livro está disponível para outros leitores.');
      } else {
        setMessage('Ops! Outro leitor foi mais rápido e já reservou este exemplar.');
      }
    } else {
      if (book.status === 'borrowed') {
        setMessage('Este livro está em uma jornada com outro leitor. Tente novamente quando ele for devolvido.');
        return;
      }
      onToggleReservation(id);
      setMessage('Parabéns! Sua próxima aventura está garantida. Retire seu livro em até 24h.');
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setGenreFilter('all');
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center py-4 justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-10 border-b border-slate-800/50 -mx-4 px-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#1e293b] text-white border border-slate-700">
          <Search size={20} />
        </div>
        <h2 className="text-base font-bold uppercase tracking-widest flex-1 text-center text-white">Catálogo Digital</h2>
        <button 
          onClick={handleClearFilters}
          className="text-[10px] font-black text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest"
        >
          Limpar
        </button>
      </header>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-sky-500 text-[#020617] p-3 rounded-xl text-center font-bold text-xs shadow-lg"
        >
          {message}
        </motion.div>
      )}

      <div className="space-y-4">
        <div className="flex w-full items-center rounded-lg bg-[#1e293b]/50 border border-slate-800 px-4 h-12 shadow-inner">
          <Search className="text-slate-500" size={20} />
          <input 
            className="flex w-full border-none bg-transparent focus:ring-0 text-sm font-medium placeholder:text-slate-600 text-white ml-2" 
            placeholder="Pesquisar livros ou autores..." 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full h-10 bg-[#1e293b]/50 border border-slate-800 rounded-lg px-3 text-[11px] font-bold text-white outline-none focus:border-sky-500 transition-colors"
            >
              <option value="all">TODOS</option>
              <option value="available">DISPONÍVEL</option>
              <option value="borrowed">EMPRESTADO</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gênero</label>
            <select 
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="w-full h-10 bg-[#1e293b]/50 border border-slate-800 rounded-lg px-3 text-[11px] font-bold text-white outline-none focus:border-sky-500 transition-colors"
            >
              {genres.map(g => (
                <option key={g} value={g}>{g.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredBooks.map(book => (
          <div 
            key={book.id} 
            className="flex flex-col gap-2 bg-[#1e293b]/40 p-3 rounded-2xl border border-white/5 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setSelectedBook(book)}
          >
            <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg relative">
              <img src={book.cover} className="w-full h-full object-cover" alt={book.title} />
              {book.isReserved && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-[#020617] text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-lg">
                  Reservado
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-xs font-bold truncate">{book.title}</p>
              <p className="text-slate-500 text-[10px] truncate">{book.author}</p>
              {book.genre && (
                <p className="text-sky-400/60 text-[9px] font-bold uppercase tracking-wider mt-0.5">{book.genre}</p>
              )}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); handleReserve(book.id); }}
              className={`mt-2 w-full py-2 text-[10px] font-bold rounded-lg border transition-colors ${
                book.isReserved && book.reservedById === currentUser?.id
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black'
                  : (book.isReserved || book.status === 'borrowed')
                  ? 'bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed'
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20 active:bg-sky-500 active:text-[#020617]'
              }`}
              disabled={(book.isReserved && book.reservedById !== currentUser?.id) || book.status === 'borrowed'}
            >
              {book.isReserved && book.reservedById === currentUser?.id 
                ? 'CANCELAR RESERVA' 
                : book.isReserved 
                ? 'INDISPONÍVEL' 
                : book.status === 'borrowed'
                ? 'EMPRESTADO'
                : 'RESERVAR'}
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedBook && (
          <BookDetailModal 
            book={selectedBook} 
            onClose={() => setSelectedBook(null)} 
            onReserve={handleReserve}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BookDetailModal({ book, onClose, onReserve, currentUser }: { book: Book, onClose: () => void, onReserve: (id: string) => void, currentUser: User | null }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-[#0f172a] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="relative aspect-[3/4] w-full">
          <img src={book.cover} className="w-full h-full object-cover" alt={book.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 size-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/70 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 -mt-12 relative z-10 space-y-6 overflow-y-auto">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-white leading-tight tracking-tight">{book.title}</h2>
            <p className="text-slate-400 font-medium">{book.author}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e293b] p-3 rounded-2xl border border-white/5 space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gênero</p>
              <p className="text-sky-400 text-xs font-bold truncate">{book.genre || 'Nível Geral'}</p>
            </div>
            <div className="bg-[#1e293b] p-3 rounded-2xl border border-white/5 space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</p>
              <p className={`text-xs font-bold truncate ${book.status === 'available' ? 'text-emerald-400' : 'text-orange-400'}`}>
                {book.status === 'available' ? 'DISPONÍVEL' : 'EMPRESTADO'}
              </p>
            </div>
          </div>

          {book.status === 'borrowed' && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-orange-500/20 p-2 rounded-xl text-orange-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Atualmente com</p>
                <p className="text-white text-sm font-bold">{book.borrowerName || 'Leitor Misterioso'}</p>
                <p className="text-[10px] text-orange-300 font-medium">Devolução prevista em {book.dueDate}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button 
              onClick={() => { onReserve(book.id); onClose(); }}
              className={`w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl ${
                book.isReserved && book.reservedById === currentUser?.id
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : (book.isReserved || book.status === 'borrowed')
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  : 'bg-sky-500 text-[#020617] shadow-sky-500/20'
              }`}
              disabled={(book.isReserved && book.reservedById !== currentUser?.id) || book.status === 'borrowed'}
            >
              <BookIcon size={20} />
              <span>
                {book.isReserved && book.reservedById === currentUser?.id 
                  ? 'CANCELAR MINHA RESERVA' 
                  : book.isReserved 
                  ? 'JÁ RESERVADO' 
                  : book.status === 'borrowed'
                  ? 'EM USO ATUALMENTE'
                  : 'RESERVAR AGORA'}
              </span>
            </button>
            <button 
              onClick={onClose}
              className="w-full h-14 bg-transparent text-slate-500 font-bold text-sm tracking-wide"
            >
              FECHAR DETALHES
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
