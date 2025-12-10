import React, { useState, useRef, useEffect } from 'react';
import { Column as ColumnType, Task, User } from '../types';
import TaskCard from './TaskCard';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  users: User[];
  onTaskDrop: (taskId: string, targetColumnId: string, newIndex: number) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

const Column: React.FC<ColumnProps> = ({ column, tasks, users, onTaskDrop, onTaskClick, onAddTask, onDeleteTask, onUpdateColumn, onDeleteColumn }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Editing Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(column.title);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
  }

  const handleDropOnColumn = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    // If dropped on column background, append to end
    if (taskId) {
        onTaskDrop(taskId, column.id, tasks.length);
    }
  };

  const handleTaskDrop = (e: React.DragEvent, targetTaskId: string | null, targetIndex: number) => {
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId) {
          onTaskDrop(taskId, column.id, targetIndex);
      }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleAddSubmit = () => {
    if (!newCardTitle.trim()) {
      setIsAdding(false);
      return;
    }
    onAddTask(column.id, newCardTitle);
    setNewCardTitle('');
    setIsAdding(false);
  };

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput !== column.title) {
        onUpdateColumn(column.id, titleInput);
    } else {
        setTitleInput(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleDeleteColumnClick = () => {
      onDeleteColumn(column.id);
      setIsMenuOpen(false);
  };

  // Dynamic Styles based on Column Title
  const getColumnStyle = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('todo') || t.includes('to do') || t.includes('backlog')) return { 
        accent: 'bg-indigo-500', 
        bgHeader: 'bg-indigo-50/50',
        text: 'text-indigo-800', 
        badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: 'fa-clipboard-list' 
    };
    if (t.includes('progress') || t.includes('doing')) return { 
        accent: 'bg-amber-500', 
        bgHeader: 'bg-amber-50/50',
        text: 'text-amber-800', 
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: 'fa-spinner fa-spin-pulse' 
    };
    if (t.includes('done') || t.includes('complete') || t.includes('finished')) return { 
        accent: 'bg-emerald-500', 
        bgHeader: 'bg-emerald-50/50',
        text: 'text-emerald-800', 
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: 'fa-check-circle' 
    };
    if (t.includes('review') || t.includes('test')) return { 
        accent: 'bg-violet-500', 
        bgHeader: 'bg-violet-50/50',
        text: 'text-violet-800', 
        badge: 'bg-violet-100 text-violet-700 border-violet-200',
        icon: 'fa-glasses' 
    };
    
    // Default
    return { 
        accent: 'bg-gray-400', 
        bgHeader: 'bg-gray-50/50',
        text: 'text-gray-700', 
        badge: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: 'fa-circle' 
    };
  };

  const style = getColumnStyle(column.title);

  return (
    <div 
      className="flex-shrink-0 w-80 flex flex-col max-h-full animate-fadeIn"
      style={{ animationDelay: `${column.order * 100}ms` }}
    >
      <div className={`bg-[#ebecf0]/90 backdrop-blur-xl rounded-2xl flex flex-col max-h-full shadow-lg border overflow-hidden transition-all duration-200 ${isDragOver ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/80' : 'border-white/40'}`}>
        
        {/* Column Header */}
        <div className={`p-4 flex justify-between items-center cursor-move group relative border-b border-gray-100 ${style.bgHeader}`}>
          
          {/* Top Colored Accent */}
          <div className={`absolute top-0 left-0 w-full h-1 ${style.accent}`}></div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
             {isEditingTitle ? (
                 <input 
                    autoFocus
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter') handleTitleSubmit();
                        if(e.key === 'Escape') {
                            setTitleInput(column.title);
                            setIsEditingTitle(false);
                        }
                    }}
                    className="text-sm font-bold text-gray-700 bg-white border border-blue-500 rounded px-2 py-1 w-full outline-none focus:ring-2 focus:ring-blue-200"
                 />
             ) : (
                <div 
                    onClick={() => setIsEditingTitle(true)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 -ml-1 rounded-lg transition-colors flex-1 min-w-0"
                >
                    {/* Icon Badge */}
                    <div className={`w-7 h-7 rounded-lg ${style.badge} border flex items-center justify-center text-[10px] shadow-sm flex-shrink-0`}>
                        <i className={`fas ${style.icon}`}></i>
                    </div>
                    
                    {/* Title */}
                    <h3 className={`text-xs font-black uppercase tracking-widest truncate ${style.text}`}>
                        {column.title}
                    </h3>
                </div>
             )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Task Counter */}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.badge}`}>
               {tasks.length}
            </span>

            {/* Menu */}
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-white/50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                    <i className="fas fa-ellipsis-h"></i>
                </button>
                
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-scaleIn origin-top-right overflow-hidden">
                        <div className="py-1">
                            <button 
                                onClick={() => {
                                    setIsEditingTitle(true);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-3"
                            >
                                <i className="fas fa-pencil-alt w-4 text-center text-gray-400"></i> Edit Name
                            </button>
                            <button 
                                onClick={handleDeleteColumnClick}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-3 border-t border-gray-50"
                            >
                                <i className="fas fa-trash-alt w-4 text-center text-red-400"></i> Delete List
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Task List (Droppable Area) */}
        <div 
          className="flex-1 overflow-y-auto px-2 pb-2 min-h-[100px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pt-3"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnColumn}
        >
          <div className="flex flex-col">
            {tasks.map((task, index) => (
                <TaskCard 
                key={task.id} 
                index={index}
                task={task}
                users={users}
                onDragStart={handleDragStart}
                onDrop={handleTaskDrop}
                onClick={() => onTaskClick(task)}
                onDelete={onDeleteTask}
                />
            ))}
          </div>
          
          {/* Inline Add Card Input */}
          {isAdding && (
            <div className="bg-white p-3 rounded-xl shadow-md border border-blue-200 animate-scaleIn mb-2">
              <textarea
                autoFocus
                placeholder="Enter a title for this card..."
                className="w-full text-sm text-gray-800 placeholder-gray-400 border-none resize-none focus:ring-0 p-0 bg-transparent min-h-[60px]"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddSubmit();
                  }
                  if(e.key === 'Escape') {
                    setIsAdding(false);
                    setNewCardTitle('');
                  }
                }}
              />
            </div>
          )}

          {!isAdding && tasks.length === 0 && (
             <div className="h-32 border-2 border-dashed border-gray-300/50 rounded-xl flex flex-col items-center justify-center text-gray-400 text-sm gap-2 m-2 pointer-events-none">
               <i className="fas fa-clipboard-check text-2xl opacity-20"></i>
               <span className="opacity-50">No tasks yet</span>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50/50 border-t border-gray-100/50">
          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-white text-gray-500 hover:text-blue-600 text-sm transition-all flex items-center gap-3 group font-bold shadow-sm border border-transparent hover:border-blue-100 hover:shadow-md"
            >
              <div className="w-6 h-6 rounded-lg bg-gray-200 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <i className="fas fa-plus text-xs"></i>
              </div>
              Add a card
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleAddSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-md shadow-blue-500/30"
              >
                Add Card
              </button>
              <button 
                onClick={() => { setIsAdding(false); setNewCardTitle(''); }}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Column;