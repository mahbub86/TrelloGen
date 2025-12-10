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

  return (
    <div 
      className="flex-shrink-0 w-80 flex flex-col max-h-full animate-fadeIn"
      style={{ animationDelay: `${column.order * 100}ms` }}
    >
      <div className={`bg-[#ebecf0]/90 backdrop-blur-xl rounded-2xl flex flex-col max-h-full shadow-lg border overflow-hidden transition-all duration-200 ${isDragOver ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/80' : 'border-white/40'}`}>
        {/* Column Header */}
        <div className="p-4 flex justify-between items-center cursor-move group relative">
          <div className="flex items-center gap-2 flex-1">
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
                <>
                    <h3 
                        onClick={() => setIsEditingTitle(true)}
                        className="text-sm font-bold text-gray-700 uppercase tracking-wide cursor-pointer hover:bg-gray-200/50 px-2 py-1 rounded transition-colors truncate"
                    >
                        {column.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs text-gray-600 font-bold min-w-[20px] text-center">{tasks.length}</span>
                </>
             )}
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
                <i className="fas fa-ellipsis-h"></i>
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-scaleIn origin-top-right overflow-hidden">
                    <div className="py-1">
                        <button 
                            onClick={() => {
                                setIsEditingTitle(true);
                                setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-pencil-alt w-4"></i> Edit Name
                        </button>
                        <button 
                            onClick={handleDeleteColumnClick}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-trash-alt w-4"></i> Delete List
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Task List (Droppable Area) */}
        <div 
          className="flex-1 overflow-y-auto px-2 pb-2 min-h-[100px] scrollbar-thin scrollbar-thumb-gray-300"
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
             <div className="h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 text-sm gap-2 m-2 pointer-events-none">
               <i className="fas fa-ghost text-2xl opacity-50"></i>
               <span>Drop tasks here</span>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3">
          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 text-sm transition-all flex items-center gap-2 group font-medium"
            >
              <div className="w-6 h-6 rounded-full bg-transparent group-hover:bg-gray-300 flex items-center justify-center transition-colors">
                  <i className="fas fa-plus"></i>
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