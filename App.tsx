import React, { useState, useEffect, useRef } from 'react';
// Switch to API service for MySQL connection
import { api as mockDB } from './services/api';
import { Board, Column, Task, User } from './types';
import ColumnComponent from './components/Column';
import TaskModal from './components/TaskModal';
import ProfileModal from './components/ProfileModal';
import ConfirmModal from './components/ConfirmModal';
import BoardDeleteModal from './components/BoardDeleteModal';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';

const LOADING_TIPS = [
  "Preparing your workspace...",
  "Syncing with the cloud...",
  "Optimizing your workflow...",
  "Loading AI models...",
  "Organizing tasks..."
];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App Data State
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Loading States
  const [loading, setLoading] = useState(true); // Initial App Load
  const [isBoardLoading, setIsBoardLoading] = useState(false); // Switching Boards
  const [currentTip, setCurrentTip] = useState(0); // Loading text rotation
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Board Menu State
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const boardMenuRef = useRef<HTMLDivElement>(null);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Board Deletion Modal State
  const [isDeleteBoardModalOpen, setIsDeleteBoardModalOpen] = useState(false);

  // Board Title Editing State
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState('');

  // Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Add List State
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Safe LocalStorage Set
  const saveSession = (userData: User) => {
      try {
          localStorage.setItem('trellogen_user', JSON.stringify(userData));
      } catch (e) {
          console.error("LocalStorage Quota Exceeded. Session might not persist.", e);
          showToast("Warning: Image too large for local session.", "error");
      }
  };

  // Check for existing session
  useEffect(() => {
    const sessionUser = localStorage.getItem('trellogen_user');
    if (sessionUser) {
      try {
        setUser(JSON.parse(sessionUser));
      } catch (e) {
        localStorage.removeItem('trellogen_user');
      }
    }
  }, []);

  // Tip Rotation Effect
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Click Outside Handler for Board Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target as Node)) {
        setIsBoardMenuOpen(false);
      }
    };
    if (isBoardMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBoardMenuOpen]);

  // Fetch Boards and Users when user logs in
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [boardsData, usersData] = await Promise.all([
            mockDB.getBoards(),
            mockDB.getUsers()
        ]);
        setBoards(boardsData);
        setAllUsers(usersData);
        
        if (boardsData.length > 0) {
          // Pre-set loading to avoid flash of empty board on initial load
          setIsBoardLoading(true);
          setCurrentBoard(boardsData[0]);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        // Minimum loading time for aesthetic purposes
        setTimeout(() => setLoading(false), 1500);
      }
    };
    fetchData();
  }, [user]);

  // Fetch Board Details (Columns/Tasks) when currentBoard changes
  useEffect(() => {
    if (!currentBoard) return;
    
    // Setup for this board load
    let isActive = true;
    let timeoutId: NodeJS.Timeout;
    
    setBoardTitleInput(currentBoard.title);
    setSearchQuery(''); // Clear search when switching boards

    const fetchBoardDetails = async () => {
      // Ensure loading is true when we start
      setIsBoardLoading(true);
      
      // Clear previous data immediately to prevent "stacking" or flashing old data
      setColumns([]);
      setTasks([]);
      
      // Artificial delay promise (800ms) to ensure loader is CLEARLY visible
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));

      try {
        // Fetch data and wait for timer in parallel
        const [cols, tasksData] = await Promise.all([
            mockDB.getColumns(currentBoard.id),
            mockDB.getTasks(currentBoard.id),
            minLoadTime
        ]);
        
        if (isActive) {
          setColumns(cols);
          setTasks(tasksData);
        }
      } catch (e) {
        console.error("Failed to load board details", e);
      } finally {
        if (isActive) {
             // Turn off loading only after everything is ready
             setIsBoardLoading(false);
        }
      }
    };
    
    fetchBoardDetails();

    // Cleanup function
    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentBoard]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm
    });
  };

  const handleCreateBoard = async (title: string, background: string) => {
    try {
        const newBoard = await mockDB.createBoard(title, background);
        setBoards(prev => [...prev, newBoard]);
        handleSwitchBoard(newBoard);
        showToast("Project created successfully!");
    } catch (e) {
        console.error("Failed to create board", e);
        showToast("Failed to create project", "error");
    }
  };

  // Immediate switching handler to prevent flash of old content
  const handleSwitchBoard = (board: Board) => {
      if (currentBoard?.id === board.id) return;
      
      // Start loading immediately and clear old data
      setIsBoardLoading(true);
      setColumns([]);
      setTasks([]);
      
      setCurrentBoard(board);
  };

  const handleSaveBoardTitle = async () => {
    if (!currentBoard || !boardTitleInput.trim() || boardTitleInput === currentBoard.title) {
        setIsEditingBoardTitle(false);
        setBoardTitleInput(currentBoard?.title || '');
        return;
    }
    const updatedBoard = { ...currentBoard, title: boardTitleInput };
    
    // Optimistic update
    setCurrentBoard(updatedBoard);
    setBoards(prev => prev.map(b => b.id === updatedBoard.id ? updatedBoard : b));
    setIsEditingBoardTitle(false);

    try {
        await mockDB.updateBoard(updatedBoard);
    } catch (e) {
        console.error("Failed to update board title", e);
        showToast("Failed to rename board", "error");
    }
  };

  const executeDeleteBoard = async () => {
      if (!currentBoard) return;
      const boardIdToDelete = currentBoard.id;
      
      try {
          await mockDB.deleteBoard(boardIdToDelete);
          
          const updatedBoards = boards.filter(b => b.id !== boardIdToDelete);
          setBoards(updatedBoards);
          
          if (updatedBoards.length > 0) {
              handleSwitchBoard(updatedBoards[0]);
          } else {
              setCurrentBoard(null);
          }
          
          showToast("Board deleted successfully");
          setIsDeleteBoardModalOpen(false);
      } catch (e) {
          console.error("Failed to delete board", e);
          showToast("Failed to delete board", "error");
      }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    saveSession(loggedInUser);
    showToast(`Welcome back, ${loggedInUser.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('trellogen_user');
    setBoards([]);
    setCurrentBoard(null);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await mockDB.updateUser(updatedUser);
      setUser(updatedUser);
      setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      saveSession(updatedUser);
      showToast("Profile updated successfully!");
    } catch (e) {
      console.error("Failed to update user", e);
      showToast("Failed to update profile", "error");
    }
  };

  const handleTaskDrop = async (taskId: string, targetColumnId: string, newIndex: number) => {
    // Optimistic Update
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const taskToMove = { ...tasks[taskIndex], columnId: targetColumnId };
    const tasksWithoutMoved = tasks.filter(t => t.id !== taskId);

    const targetColTasks = tasksWithoutMoved.filter(t => t.columnId === targetColumnId);
    
    let newGlobalTasks = [...tasksWithoutMoved];
    
    if (newIndex >= targetColTasks.length) {
        if (targetColTasks.length === 0) {
            newGlobalTasks.push(taskToMove);
        } else {
            const lastTask = targetColTasks[targetColTasks.length - 1];
            const lastTaskIndex = newGlobalTasks.findIndex(t => t.id === lastTask.id);
            newGlobalTasks.splice(lastTaskIndex + 1, 0, taskToMove);
        }
    } else {
        const refTask = targetColTasks[newIndex];
        const refTaskIndex = newGlobalTasks.findIndex(t => t.id === refTask.id);
        newGlobalTasks.splice(refTaskIndex, 0, taskToMove);
    }
    
    setTasks(newGlobalTasks);

    // Sync with DB
    try {
        await mockDB.reorderTask(taskId, targetColumnId, newIndex);
    } catch (e) {
      console.error("Failed to sync move", e);
      showToast("Failed to sync task position", "error");
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    await mockDB.updateTask(updatedTask);
    showToast("Task updated");
  };

  const executeDeleteTask = async (taskId: string) => {
    // Optimistic Delete
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await mockDB.deleteTask(taskId);
      showToast("Task deleted successfully", "success");
    } catch (e) {
      console.error("Failed to delete task", e);
      showToast("Failed to delete task", "error");
    }
  };

  const promptDeleteTask = (taskId: string) => {
      openConfirmModal(
          "Delete Task", 
          "Are you sure you want to delete this card? This action cannot be undone.", 
          () => executeDeleteTask(taskId)
      );
  };

  const handleAddTask = async (columnId: string, title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      columnId,
      title: title,
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      assigneeIds: [],
      createdAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);
    await mockDB.addTask(newTask);
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !currentBoard) return;
    
    const tempId = `col-${Date.now()}`;
    const newCol: Column = {
      id: tempId,
      boardId: currentBoard.id,
      title: newColumnTitle,
      order: columns.length
    };
    setColumns([...columns, newCol]);
    setNewColumnTitle('');
    setIsAddingColumn(false);

    try {
        const createdCol = await mockDB.addColumn(newCol.title, currentBoard.id);
        setColumns(prev => prev.map(c => c.id === tempId ? createdCol : c));
        showToast("List added!");
    } catch (e) {
        console.error("Failed to add column", e);
        showToast("Failed to add list", "error");
    }
  };

  const handleUpdateColumn = async (columnId: string, title: string) => {
      setColumns(prev => prev.map(c => c.id === columnId ? { ...c, title } : c));
      try {
          await mockDB.updateColumn(columnId, title);
      } catch (e) {
          console.error("Failed to update column", e);
          showToast("Failed to update list title", "error");
      }
  };

  const handleDeleteColumn = async (columnId: string) => {
      const columnTasks = tasks.filter(t => t.columnId === columnId);
      if (columnTasks.length > 0) {
          showToast("Please delete all cards in this list first.", "error");
          return;
      }

      openConfirmModal(
          "Delete List",
          "Are you sure you want to delete this list?",
          async () => {
              setColumns(prev => prev.filter(c => c.id !== columnId));
              try {
                  await mockDB.deleteColumn(columnId);
                  showToast("List deleted successfully");
              } catch (e) {
                  console.error("Failed to delete column", e);
                  showToast("Failed to delete list", "error");
              }
          }
      );
  };

  // 1. Auth Guard
  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Initial App Loading State (ClickUp Style)
  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-900 text-white">
        {/* Animated Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 via-gray-800 to-black opacity-90"></div>
        
        {/* Logo Container with Pulse */}
        <div className="relative z-10 mb-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 animate-float">
               <i className="fas fa-columns text-5xl text-white drop-shadow-md"></i>
            </div>
            {/* Ripples */}
            <div className="absolute inset-0 bg-blue-500/30 rounded-3xl animate-ping opacity-20"></div>
        </div>

        {/* Brand Name */}
        <h1 className="relative z-10 text-3xl font-bold tracking-tight mb-2 animate-fadeIn">TrelloGen</h1>
        
        {/* Rotating Loading Tips */}
        <div className="relative z-10 h-6 mb-8 overflow-hidden">
           <p key={currentTip} className="text-gray-400 text-sm font-medium animate-slideUp">
              {LOADING_TIPS[currentTip]}
           </p>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-shimmer w-[200%]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden font-sans text-gray-900 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium animate-slideUp border border-white/20 backdrop-blur-md ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
           <div className={`w-6 h-6 rounded-full bg-white/20 flex items-center justify-center`}>
              <i className={`fas ${toast.type === 'success' ? 'fa-check' : 'fa-exclamation'}`}></i>
           </div>
           {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Board Deletion Modal */}
      <BoardDeleteModal 
        isOpen={isDeleteBoardModalOpen}
        boardTitle={currentBoard?.title || ''}
        onClose={() => setIsDeleteBoardModalOpen(false)}
        onConfirm={executeDeleteBoard}
      />

      {/* Sidebar */}
      <Sidebar 
        boards={boards}
        currentBoardId={currentBoard?.id || null}
        onSelectBoard={handleSwitchBoard}
        onCreateBoard={handleCreateBoard}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col h-full relative transition-all duration-700 ease-in-out z-0 min-w-0"
      >
        {/* Dynamic Board Background (Semi-transparent over global animated bg) */}
        <div 
           className={`absolute inset-0 transition-all duration-1000 ${currentBoard?.background || 'bg-gray-800/30'}`}
           style={{ opacity: 0.85 }} // Allow global animated BG to bleed through slightly
        ></div>
        
        {/* Navbar */}
        <nav className="h-16 glass flex items-center px-3 sm:px-6 justify-between text-white shrink-0 z-20 border-b border-white/10 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Mobile Menu Toggle (if sidebar closed/mobile) */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden text-white/80 hover:text-white p-2"
            >
                <i className="fas fa-bars"></i>
            </button>

            <div className="font-bold text-lg sm:text-xl tracking-tight flex items-center gap-2 text-white drop-shadow-md">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                 <i className="fas fa-columns text-sm text-white"></i>
              </div>
              <span className="hidden sm:inline">TrelloGen</span>
            </div>
            
            {currentBoard && (
                <div className="hidden md:flex items-center gap-3 animate-fadeIn ml-2">
                    <div className="h-6 w-[1px] bg-white/20 rotate-12"></div>
                    
                    {isEditingBoardTitle ? (
                        <input 
                            autoFocus
                            type="text"
                            value={boardTitleInput}
                            onChange={(e) => setBoardTitleInput(e.target.value)}
                            onBlur={handleSaveBoardTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveBoardTitle();
                                if (e.key === 'Escape') {
                                    setBoardTitleInput(currentBoard.title);
                                    setIsEditingBoardTitle(false);
                                }
                            }}
                            className="bg-white/20 border border-white/30 rounded px-2 py-0.5 text-lg font-bold text-white outline-none focus:ring-2 focus:ring-blue-400 w-48 shadow-inner placeholder-white/50"
                        />
                    ) : (
                        <div 
                            onClick={() => setIsEditingBoardTitle(true)}
                            className="group flex items-center gap-2 cursor-pointer hover:bg-white/10 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-white/10"
                            title="Click to rename board"
                        >
                            <h1 className="font-bold text-lg tracking-wide text-white drop-shadow-sm truncate max-w-[200px] select-none">
                                {currentBoard.title}
                            </h1>
                            <i className="fas fa-pencil-alt text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </div>
                    )}
                    
                    <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-medium border border-white/10 uppercase tracking-wider backdrop-blur-sm select-none">Board</span>
                    
                    {/* Board Actions Menu */}
                    <div className="relative ml-2" ref={boardMenuRef}>
                        <button 
                            onClick={() => setIsBoardMenuOpen(!isBoardMenuOpen)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isBoardMenuOpen ? 'bg-white text-gray-800' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                        >
                            <i className="fas fa-ellipsis-h"></i>
                        </button>
                        
                        {isBoardMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 animate-scaleIn origin-top-left z-50 overflow-hidden">
                                <div className="py-1">
                                    <button 
                                        onClick={() => {
                                            setIsEditingBoardTitle(true);
                                            setIsBoardMenuOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                                    >
                                        <i className="fas fa-pencil-alt w-4 text-center"></i> Rename Board
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsDeleteBoardModalOpen(true);
                                            setIsBoardMenuOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-3 border-t border-gray-100 mt-1 pt-2"
                                    >
                                        <i className="fas fa-trash-alt w-4 text-center"></i> Delete Board
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
             {/* Responsive Search */}
             <div className="relative group">
               <input 
                 type="text" 
                 placeholder="Search tasks..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-8 sm:pl-9 pr-4 py-1.5 rounded-full bg-white/10 border border-white/10 focus:bg-white/20 text-sm text-white placeholder-white/60 outline-none w-28 focus:w-48 sm:w-48 sm:focus:w-64 transition-all duration-300 backdrop-blur-md shadow-inner" 
               />
               <i className="fas fa-search absolute left-2.5 sm:left-3 top-2 text-white/60 group-focus-within:text-white transition-colors"></i>
             </div>
             
             <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>

             {/* User Profile */}
             <div className="flex items-center gap-3 group relative cursor-pointer h-full">
               <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-white/70">Online</p>
               </div>
               
               {/* Avatar Container */}
               <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-white/20 to-white/5 backdrop-blur-md text-white font-bold flex items-center justify-center ring-2 ring-white/20 shadow-lg transform group-hover:scale-105 transition-transform flex-shrink-0 overflow-hidden">
                 {user.avatarUrl ? (
                   <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover object-center" />
                 ) : (
                   user.initials
                 )}
               </div>
               
               {/* Dropdown Menu Wrapper - Uses pt-3 to bridge gap between avatar and menu */}
               <div className="absolute right-0 top-full pt-3 w-56 hidden group-hover:block z-50">
                  <div className="glass-card rounded-xl shadow-2xl py-2 text-gray-800 animate-scaleIn origin-top-right">
                    {/* Menu Header */}
                    <div className="px-4 py-3 border-b border-gray-100/50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-white shadow-sm flex-shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover object-center" />
                          ) : user.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-3"
                      >
                        <i className="fas fa-user-circle w-4"></i> My Profile
                      </button>
                      <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-3">
                        <i className="fas fa-cog w-4"></i> Settings
                      </button>
                    </div>

                    <div className="border-t border-gray-100/50 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex items-center gap-3">
                        <i className="fas fa-sign-out-alt w-4"></i> Log Out
                      </button>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </nav>

        {/* Board Columns Area */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent z-10 transition-opacity duration-300"
          key={currentBoard?.id} // Forces reset of scroll and fresh render when board changes
          style={{ opacity: isBoardLoading ? 0.7 : 1 }}
        >
          <div className="h-full flex items-start gap-6 p-4 sm:p-6 min-w-max">
            
            {isBoardLoading ? (
               // Loading Skeleton
               Array.from({ length: 3 }).map((_, i) => (
                 // Removed animate-fadeIn so it's instantly visible
                 <div key={i} className="flex-shrink-0 w-80 flex flex-col h-full">
                    <div className="bg-[#ebecf0]/80 backdrop-blur-md rounded-2xl flex flex-col h-full shadow-lg border border-white/40 p-3">
                        {/* Header Skeleton */}
                        <div className="p-2 mb-2 flex items-center justify-between">
                            <div className="h-5 bg-gray-300/50 rounded w-1/2 animate-pulse"></div>
                            <div className="h-5 w-8 bg-gray-300/50 rounded-full animate-pulse"></div>
                        </div>
                        {/* Cards Skeleton */}
                        <div className="flex-1 space-y-3 p-1">
                            {[1, 2, 3].map(k => (
                                <div key={k} className="h-28 bg-white/60 rounded-xl shadow-sm border border-white/50 relative overflow-hidden group">
                                     {/* Shimmer overlay */}
                                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
               ))
            ) : currentBoard ? (
                // Actual Columns
                columns.map(col => (
                  <ColumnComponent
                    key={col.id}
                    column={col}
                    tasks={tasks.filter(t => 
                      t.columnId === col.id && (
                        !searchQuery || 
                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                    )}
                    users={allUsers}
                    onTaskDrop={handleTaskDrop}
                    onTaskClick={handleTaskClick}
                    onAddTask={handleAddTask}
                    onDeleteTask={promptDeleteTask}
                    onUpdateColumn={handleUpdateColumn}
                    onDeleteColumn={handleDeleteColumn}
                  />
                ))
            ) : (
                <div className="flex-1 flex items-center justify-center text-white/50">
                    <div className="text-center">
                        <i className="fas fa-folder-open text-4xl mb-4 opacity-50"></i>
                        <p className="text-lg">No board selected. Create one to get started.</p>
                    </div>
                </div>
            )}

            {/* Add Column Section - Always Visible at End */}
            {currentBoard && !isBoardLoading && (
                <div className="w-80 flex-shrink-0 pt-1">
                {!isAddingColumn ? (
                    <button 
                    onClick={() => setIsAddingColumn(true)}
                    className="w-full h-12 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium text-left px-4 flex items-center transition-all duration-200 backdrop-blur-md border border-white/10 shadow-sm hover:shadow-md group"
                    >
                    <span className="w-6 h-6 rounded bg-white/20 flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors">
                        <i className="fas fa-plus text-xs"></i>
                    </span>
                    Add another list
                    </button>
                ) : (
                    <div className="glass-card rounded-xl p-3 flex flex-col gap-2 shadow-xl animate-scaleIn">
                    <input 
                        autoFocus
                        type="text"
                        placeholder="Enter list title..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800 bg-white/50 backdrop-blur-sm"
                        value={newColumnTitle}
                        onChange={e => setNewColumnTitle(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') handleAddColumn(); }}
                    />
                    <div className="flex gap-2 items-center mt-1">
                        <button 
                            onClick={handleAddColumn}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-md shadow-blue-500/30"
                        >
                            Add list
                        </button>
                        <button 
                            onClick={() => { setIsAddingColumn(false); setNewColumnTitle(''); }}
                            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    </div>
                )}
                </div>
            )}
            
            {/* Spacer to ensure the last item isn't flush with viewport edge when scrolled */}
            <div className="w-2 flex-shrink-0 h-1"></div>
          </div>
        </div>

        {/* Task Modal */}
        {selectedTask && (
          <TaskModal
            isOpen={isModalOpen}
            task={selectedTask}
            allUsers={allUsers}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTask}
            onDelete={promptDeleteTask}
          />
        )}
        
        {/* Profile Modal */}
        <ProfileModal 
          isOpen={isProfileModalOpen}
          user={user}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleUpdateUser}
        />
        
      </div>
    </div>
  );
};

export default App;