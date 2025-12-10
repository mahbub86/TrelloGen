
import React, { useState, useEffect } from 'react';
// Switch to API service for MySQL connection
import { api as mockDB } from './services/api';
import { Board, Column, Task, User } from './types';
import ColumnComponent from './components/Column';
import TaskModal from './components/TaskModal';
import ProfileModal from './components/ProfileModal';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App Data State
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
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
          setCurrentBoard(boardsData[0]);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Fetch Board Details (Columns/Tasks) when currentBoard changes
  useEffect(() => {
    if (!currentBoard) return;
    setBoardTitleInput(currentBoard.title);
    setSearchQuery(''); // Clear search when switching boards

    const fetchBoardDetails = async () => {
      try {
        const cols = await mockDB.getColumns(currentBoard.id);
        setColumns(cols);
        const tasksData = await mockDB.getTasks(currentBoard.id);
        setTasks(tasksData);
      } catch (e) {
        console.error("Failed to load board details", e);
      }
    };
    fetchBoardDetails();
  }, [currentBoard]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateBoard = async (title: string, background: string) => {
    try {
        const newBoard = await mockDB.createBoard(title, background);
        setBoards(prev => [...prev, newBoard]);
        setCurrentBoard(newBoard);
        showToast("Project created successfully!");
    } catch (e) {
        console.error("Failed to create board", e);
        showToast("Failed to create project", "error");
    }
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

  const handleDeleteTask = async (taskId: string) => {
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

      if (!window.confirm("Are you sure you want to delete this list?")) return;

      setColumns(prev => prev.filter(c => c.id !== columnId));
      try {
          await mockDB.deleteColumn(columnId);
          showToast("List deleted successfully");
      } catch (e) {
          console.error("Failed to delete column", e);
          showToast("Failed to delete list", "error");
      }
  };

  // 1. Auth Guard
  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-white/80">
        <div className="flex flex-col items-center gap-4">
           <i className="fas fa-circle-notch fa-spin text-4xl animate-pulse"></i>
           <span className="text-sm font-medium tracking-widest uppercase">Loading Workspace...</span>
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

      {/* Sidebar */}
      <Sidebar 
        boards={boards}
        currentBoardId={currentBoard?.id || null}
        onSelectBoard={setCurrentBoard}
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
        <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent z-10">
          <div className="h-full flex items-start gap-6 p-4 sm:p-6 min-w-max">
            
            {columns.map(col => (
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
                onDeleteTask={handleDeleteTask}
                onUpdateColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}

            {/* Add Column Section - Always Visible at End */}
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
            onDelete={handleDeleteTask}
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
