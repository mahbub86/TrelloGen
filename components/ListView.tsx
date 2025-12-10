
import React, { useState } from 'react';
import { Task, Column, User } from '../types';

interface ListViewProps {
  tasks: Task[];
  columns: Column[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ tasks, columns, users, onTaskClick, onUpdateTask, onMoveTask }) => {
  
  // Helper to get column details
  const getColumn = (colId: string) => columns.find(c => c.id === colId);

  // Helper to format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Sort tasks by column order then task order (approximated by index in array)
  const sortedTasks = [...tasks].sort((a, b) => {
    const colA = getColumn(a.columnId)?.order || 0;
    const colB = getColumn(b.columnId)?.order || 0;
    if (colA !== colB) return colA - colB;
    return 0; // In a real app, we'd use task order index
  });

  const priorityConfig = {
    high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', icon: 'fa-angle-double-up' },
    medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'fa-grip-lines' },
    low: { label: 'Low', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'fa-angle-down' }
  };

  const getStatusColor = (title: string = '') => {
      const t = title.toLowerCase();
      if (t.includes('todo')) return 'bg-indigo-100 text-indigo-700';
      if (t.includes('progress')) return 'bg-amber-100 text-amber-700';
      if (t.includes('done') || t.includes('complete')) return 'bg-emerald-100 text-emerald-700';
      return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex-1 overflow-auto p-6 animate-fadeIn">
      <div className="glass-card rounded-2xl overflow-hidden border border-white/40 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/20 border-b border-white/10 text-xs uppercase tracking-wider text-gray-500 font-bold">
              <th className="p-4 pl-6">Task Name</th>
              <th className="p-4 w-40">Status</th>
              <th className="p-4 w-32">Priority</th>
              <th className="p-4 w-40">Assignees</th>
              <th className="p-4 w-32">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedTasks.map(task => {
               const assignedUsers = users.filter(u => task.assigneeIds?.includes(u.id));
               const pConfig = priorityConfig[task.priority];
               
               return (
                <tr key={task.id} className="hover:bg-blue-50/50 transition-colors group">
                  {/* Title */}
                  <td className="py-2.5 px-4">
                    <div 
                        onClick={() => onTaskClick(task)}
                        className="font-bold text-gray-800 text-sm cursor-pointer hover:text-blue-600 flex items-center gap-3"
                    >
                        <div className="w-2 h-8 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {task.title}
                    </div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-2.5 px-4">
                    <div className="relative">
                        <select 
                            value={task.columnId}
                            onChange={(e) => onMoveTask(task.id, e.target.value)}
                            className={`
                                appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-400/50 transition-all w-full
                                ${getStatusColor(getColumn(task.columnId)?.title)}
                            `}
                        >
                            {columns.map(col => (
                                <option key={col.id} value={col.id} className="bg-white text-gray-800">
                                    {col.title}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                           <i className="fas fa-chevron-down text-[10px]"></i>
                        </div>
                    </div>
                  </td>

                  {/* Priority Dropdown */}
                  <td className="py-2.5 px-4">
                    <div className="relative w-28">
                         <select 
                            value={task.priority}
                            onChange={(e) => onUpdateTask({ ...task, priority: e.target.value as any })}
                            className={`
                                appearance-none cursor-pointer pl-2 pr-6 py-1.5 rounded-lg text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-400/50 transition-all w-full
                                ${pConfig.color}
                            `}
                        >
                            <option value="low" className="bg-white text-gray-800">Low</option>
                            <option value="medium" className="bg-white text-gray-800">Medium</option>
                            <option value="high" className="bg-white text-gray-800">High</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-50">
                           <i className={`fas ${pConfig.icon} text-[10px]`}></i>
                        </div>
                    </div>
                  </td>

                  {/* Assignees */}
                  <td className="py-2.5 px-4">
                    <div className="flex -space-x-2">
                        {assignedUsers.length > 0 ? assignedUsers.map(user => (
                            user.avatarUrl ? (
                                <img 
                                    key={user.id} 
                                    src={user.avatarUrl} 
                                    title={user.name}
                                    className="w-7 h-7 rounded-full border-2 border-white shadow-sm object-cover" 
                                />
                            ) : (
                                <div key={user.id} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold" title={user.name}>
                                    {user.initials}
                                </div>
                            )
                        )) : (
                            <span className="text-gray-400 text-xs italic ml-2">Unassigned</span>
                        )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-2.5 px-4">
                      <div className={`text-xs font-medium ${task.dueDate && Date.now() > task.dueDate ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                          {formatDate(task.dueDate)}
                      </div>
                  </td>
                </tr>
               );
            })}
            
            {tasks.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                        <i className="fas fa-clipboard-list text-3xl mb-2 opacity-30"></i>
                        <p>No tasks found on this board.</p>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
