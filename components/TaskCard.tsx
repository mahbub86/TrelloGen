
import React, { useState } from 'react';
import { Task, User } from '../types';

interface TaskCardProps {
  task: Task;
  index: number;
  users: User[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetTaskId: string | null, targetIndex: number) => void;
  onClick: () => void;
  onDelete: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, users, onDragStart, onDrop, onClick, onDelete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(e, task.id, index); 
  };

  // Get assigned users details
  const assignedUsers = users.filter(u => task.assigneeIds?.includes(u.id));

  const priorityConfig = {
      high: { color: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-100' },
      medium: { color: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
      low: { color: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-100' }
  };

  // Date formatting helpers
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.dueDate ? Date.now() > task.dueDate : false;
  const hasDates = task.startDate || task.dueDate;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      className={`
        bg-white p-4 rounded-xl shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 group border relative overflow-hidden
        ${isDragOver ? 'border-blue-500 ring-2 ring-blue-100 translate-y-1' : 'border-gray-100 hover:-translate-y-1'}
      `}
    >
      {/* Side Color Bar for Priority */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityConfig[task.priority].color}`}></div>

      {/* Header Row: Labels & Actions */}
      <div className="flex justify-between items-start mb-2 pl-2">
        <div className="flex gap-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${priorityConfig[task.priority].bg}`}>
              {task.priority}
          </span>
          
          {/* Date Badge */}
          {hasDates && (
             <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${isOverdue ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                <i className="far fa-clock"></i>
                <span>
                   {task.startDate ? formatDate(task.startDate) : 'Start'} 
                   {(task.startDate && task.dueDate) && ' - '}
                   {task.dueDate ? formatDate(task.dueDate) : ''}
                </span>
             </div>
          )}
        </div>
        
        {/* Delete Button (Visible on Hover) */}
        <button 
          type="button"
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag initiation
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 rounded-full transition-all -mt-2 -mr-2 z-20 hover:bg-red-50"
          title="Delete Task"
        >
          <i className="fas fa-trash-alt text-xs"></i>
        </button>
      </div>

      <h4 className="text-gray-800 font-semibold text-sm mb-3 leading-snug pl-2 pr-1">
        {task.title}
      </h4>

      <div className="flex items-center justify-between text-gray-400 text-xs mt-3 pl-2">
        <div className="flex items-center gap-3">
           {task.description && <i className="fas fa-align-left hover:text-blue-500 transition-colors" title="Has description"></i>}
           
           {task.comments.length > 0 && (
             <span className="flex items-center gap-1 hover:text-blue-500 transition-colors">
               <i className="far fa-comment"></i> {task.comments.length}
             </span>
           )}
           
           {task.subtasks.length > 0 && (
             <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${completedSubtasks === task.subtasks.length ? 'bg-green-100 text-green-600 font-bold' : 'hover:text-blue-500'}`}>
               <i className={`far ${completedSubtasks === task.subtasks.length ? 'fa-check-circle' : 'fa-check-square'}`}></i> 
               {completedSubtasks}/{task.subtasks.length}
             </span>
           )}
        </div>
        
        {/* Avatars */}
        <div className="flex -space-x-2">
          {assignedUsers.length > 0 ? (
            assignedUsers.map(user => (
               user.avatarUrl ? (
                 <img 
                   key={user.id}
                   src={user.avatarUrl}
                   alt={user.name}
                   title={user.name}
                   className="w-6 h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 object-cover transform hover:scale-110 transition-transform z-0 hover:z-10"
                 />
               ) : (
                 <div 
                   key={user.id} 
                   title={user.name}
                   className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-sm ring-1 ring-black/5 transform hover:scale-110 transition-transform z-0 hover:z-10"
                 >
                   {user.initials}
                 </div>
               )
            ))
          ) : (
            // Empty state placeholder if needed
            null
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
