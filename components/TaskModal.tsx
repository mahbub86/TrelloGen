


import React, { useState, useEffect, useRef } from 'react';
import { Task, Subtask, User, Attachment } from '../types';
import { geminiService } from '../services/geminiService';
import { api } from '../services/api'; // Use Real API for file uploads

interface TaskModalProps {
  task: Task;
  allUsers: User[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, allUsers, isOpen, onClose, onSave, onDelete }) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSub, setIsGeneratingSub] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // Attachment State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref for the assignee dropdown to detect clicks outside
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens or task changes
  useEffect(() => {
    if (isOpen) {
      setEditedTask(task);
      setNewSubtaskTitle('');
      setIsAssigneeOpen(false);
      setIsGeneratingDesc(false);
      setIsGeneratingSub(false);
    }
  }, [task, isOpen]);

  // Handle click outside assignee dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setIsAssigneeOpen(false);
      }
    };

    if (isAssigneeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssigneeOpen]);

  if (!isOpen) return null;

  const handleSubtaskToggle = (subId: string) => {
    const newSubtasks = editedTask.subtasks.map(s => 
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    setEditedTask({ ...editedTask, subtasks: newSubtasks });
  };

  const handleUpdateSubtaskTitle = (subId: string, title: string) => {
    const newSubtasks = editedTask.subtasks.map(s => 
      s.id === subId ? { ...s, title } : s
    );
    setEditedTask({ ...editedTask, subtasks: newSubtasks });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle,
      completed: false
    };
    setEditedTask(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, newSub]
    }));
    setNewSubtaskTitle('');
  };

  const handleToggleAssignee = (userId: string) => {
    let newIds = editedTask.assigneeIds || [];
    if (newIds.includes(userId)) {
      newIds = newIds.filter(id => id !== userId);
    } else {
      newIds = [...newIds, userId];
    }
    setEditedTask({ ...editedTask, assigneeIds: newIds });
  };

  const handleDateChange = (field: 'startDate' | 'dueDate', value: string) => {
    const timestamp = value ? new Date(value).getTime() : undefined;
    setEditedTask({ ...editedTask, [field]: timestamp });
  };

  const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().split('T')[0];
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingDesc(true);
    try {
      const desc = await geminiService.generateDescription(editedTask.title, editedTask.description);
      setEditedTask(prev => ({ ...prev, description: desc }));
    } catch (e) {
      alert("Failed to generate description. Please check API Key.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGenerateSubtasks = async () => {
    setIsGeneratingSub(true);
    try {
      const newSubtasksData = await geminiService.generateSubtasks(editedTask.title);
      const newSubtasks: Subtask[] = newSubtasksData.map((s, i) => ({
        id: `gen-${Date.now()}-${i}`,
        title: s.title,
        completed: false
      }));
      setEditedTask(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, ...newSubtasks]
      }));
    } catch (e) {
      alert("Failed to generate subtasks.");
    } finally {
      setIsGeneratingSub(false);
    }
  };

  // --- Attachment Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      try {
          const newAttachment = await api.uploadAttachment(editedTask.id, file);
          const currentAttachments = editedTask.attachments || [];
          setEditedTask(prev => ({
              ...prev,
              attachments: [...currentAttachments, newAttachment]
          }));
      } catch (e) {
          console.error("Upload failed", e);
          alert("Failed to upload file.");
      } finally {
          setIsUploading(false);
          // Clear input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
      if(!confirm("Are you sure you want to delete this attachment?")) return;
      
      try {
          await api.deleteAttachment(editedTask.id, attachmentId);
          setEditedTask(prev => ({
              ...prev,
              attachments: prev.attachments?.filter(a => a.id !== attachmentId)
          }));
      } catch (e) {
          console.error("Failed to delete attachment", e);
          alert("Failed to delete attachment.");
      }
  };

  const getFileIcon = (fileType: string) => {
      if (fileType.includes('image')) return 'fa-file-image text-purple-500';
      if (fileType.includes('pdf')) return 'fa-file-pdf text-red-500';
      if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word text-blue-500';
      if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('spreadsheet')) return 'fa-file-excel text-green-500';
      return 'fa-file text-gray-500';
  };

  const priorityOptions: { value: 'low' | 'medium' | 'high'; label: string; colorClass: string; icon: string }[] = [
    { value: 'low', label: 'Low', colorClass: 'bg-green-100 text-green-800 border-green-200 ring-green-500', icon: 'fa-arrow-down' },
    { value: 'medium', label: 'Medium', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 ring-yellow-500', icon: 'fa-minus' },
    { value: 'high', label: 'High', colorClass: 'bg-red-100 text-red-800 border-red-200 ring-red-500', icon: 'fa-arrow-up' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden m-4 animate-scaleIn">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div className="w-full mr-8">
             <input 
               className="text-2xl font-bold text-gray-800 bg-transparent border-none focus:ring-0 w-full p-0 placeholder-gray-400"
               value={editedTask.title}
               onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
               placeholder="Task Title"
             />
             <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
               <span className="bg-gray-200 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">In list</span> 
               <span className="text-gray-700">Task List</span>
             </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Priority Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  <i className="fas fa-flag mr-2 text-gray-400"></i> Priority
                </h3>
                <div className="flex gap-2">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEditedTask({ ...editedTask, priority: option.value })}
                      className={`
                        flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-bold transition-all
                        ${editedTask.priority === option.value 
                          ? `${option.colorClass} ring-2 ring-offset-1 shadow-sm scale-105` 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      <i className={`fas ${option.icon}`}></i>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignees Section */}
              <div className="relative" ref={assigneeDropdownRef}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  <i className="fas fa-users mr-2 text-gray-400"></i> Members
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {allUsers.filter(u => editedTask.assigneeIds?.includes(u.id)).map(u => (
                      u.avatarUrl ? (
                         <img 
                          key={u.id} 
                          src={u.avatarUrl} 
                          alt={u.name}
                          title={u.name} 
                          className="w-9 h-9 rounded-full border-2 border-white shadow-md object-cover flex-shrink-0" 
                        />
                      ) : (
                         <div key={u.id} className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-md flex-shrink-0" title={u.name}>
                          {u.initials}
                        </div>
                      )
                    ))}
                    <button 
                      onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                      className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 border-2 border-white flex items-center justify-center transition-colors shadow-sm flex-shrink-0"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
                
                {/* Assignee Dropdown */}
                {isAssigneeOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-20 animate-scaleIn origin-top-left">
                     <div className="p-1 max-h-48 overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b border-gray-100 mb-1">Assign Members</div>
                        {allUsers.length === 0 && <p className="text-xs text-gray-400 p-2">No users found.</p>}
                        {allUsers.map(user => {
                          const isAssigned = editedTask.assigneeIds?.includes(user.id);
                          return (
                            <button
                                key={user.id}
                                onClick={() => handleToggleAssignee(user.id)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between group transition-colors ${isAssigned ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                  {user.avatarUrl ? (
                                     <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isAssigned ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                                      {user.initials}
                                    </div>
                                  )}
                                  <span className="font-medium truncate">{user.name}</span>
                                </div>
                                {isAssigned && <i className="fas fa-check text-blue-600 flex-shrink-0 ml-2"></i>}
                            </button>
                          )
                        })}
                     </div>
                  </div>
                )}
              </div>
          </div>

          {/* Dates Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              <i className="far fa-clock mr-2 text-gray-400"></i> Dates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium ml-1">Start Date</label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  value={formatDateForInput(editedTask.startDate)}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium ml-1">Due Date</label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  value={formatDateForInput(editedTask.dueDate)}
                  onChange={(e) => handleDateChange('dueDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                <i className="fas fa-align-left mr-2"></i> Description
              </h3>
              <button 
                onClick={handleGenerateDescription}
                disabled={isGeneratingDesc}
                className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all shadow-sm flex items-center gap-2 font-medium"
              >
                {isGeneratingDesc ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                AI Rewrite
              </button>
            </div>
            <textarea
              className="w-full bg-transparent border-0 rounded-md p-0 text-gray-700 focus:ring-0 min-h-[100px] resize-none placeholder-gray-400"
              value={editedTask.description}
              onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
              placeholder="Add a more detailed description..."
            />
          </div>
          
          {/* Attachments Section */}
          <div>
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                   <i className="fas fa-paperclip mr-2"></i> Attachments
                 </h3>
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-2"
                 >
                    {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                    Upload
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                 />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editedTask.attachments && editedTask.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-colors group relative">
                          {/* Preview/Icon */}
                          <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 text-xl overflow-hidden">
                              {att.fileType.includes('image') ? (
                                  <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                              ) : (
                                  <i className={`fas ${getFileIcon(att.fileType)}`}></i>
                              )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-700 truncate" title={att.fileName}>{att.fileName}</p>
                              <p className="text-xs text-gray-400">{new Date(att.uploadedAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="flex gap-2">
                              <a 
                                  href={att.fileUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                  title="Download / View"
                              >
                                  <i className="fas fa-external-link-alt text-xs"></i>
                              </a>
                              <button 
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                                  title="Delete Attachment"
                              >
                                  <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                          </div>
                      </div>
                  ))}
                  
                  {(!editedTask.attachments || editedTask.attachments.length === 0) && (
                      <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/10 transition-colors" onClick={() => fileInputRef.current?.click()}>
                          <i className="fas fa-cloud-upload-alt text-2xl opacity-50"></i>
                          <span className="text-sm">Click to upload files</span>
                      </div>
                  )}
              </div>
          </div>

          {/* Subtasks Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                 <i className="fas fa-check-square mr-2"></i> Checklist
               </h3>
               <button 
                onClick={handleGenerateSubtasks}
                disabled={isGeneratingSub}
                className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 font-medium"
              >
                {isGeneratingSub ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-robot"></i>}
                AI Breakdown
              </button>
            </div>
            
             {/* Progress Bar */}
             {editedTask.subtasks.length > 0 && (
               <div className="mb-4 flex items-center gap-3">
                 <span className="text-xs text-gray-500 font-medium w-8">
                     {Math.round((editedTask.subtasks.filter(s => s.completed).length / editedTask.subtasks.length) * 100)}%
                 </span>
                 <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                   <div 
                     className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                     style={{ width: `${(editedTask.subtasks.filter(s => s.completed).length / editedTask.subtasks.length) * 100}%` }}
                   ></div>
                 </div>
               </div>
             )}

            <div className="space-y-2">
              {editedTask.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div 
                    onClick={() => handleSubtaskToggle(sub.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${sub.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}
                  >
                      {sub.completed && <i className="fas fa-check text-white text-xs"></i>}
                  </div>
                  
                  {/* Editable Title */}
                  <input 
                    type="text"
                    value={sub.title}
                    onChange={(e) => handleUpdateSubtaskTitle(sub.id, e.target.value)}
                    className={`ml-3 flex-1 text-sm bg-transparent border-none focus:ring-0 p-0 ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}
                  />
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditedTask({...editedTask, subtasks: editedTask.subtasks.filter(s => s.id !== sub.id)}); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 px-2 transition-opacity"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}

              {/* Add New Subtask Input */}
              <div className="flex items-center gap-2 mt-2 p-2 group">
                 <div className="w-5 flex justify-center flex-shrink-0">
                    <i className="fas fa-plus text-gray-400 text-xs"></i>
                 </div>
                 <input
                    type="text"
                    placeholder="Add an item"
                    className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder-gray-400 p-0 ml-3"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddSubtask(); }}
                 />
                 {newSubtaskTitle && (
                    <button onClick={handleAddSubtask} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold text-gray-600">Add</button>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button 
                 onClick={() => {
                   onDelete(task.id);
                   onClose();
                 }}
                 className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
          >
            <i className="fas fa-trash-alt mr-2"></i> Delete
          </button>
          
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
            >
                Cancel
            </button>
            <button 
                onClick={() => { onSave(editedTask); onClose(); }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:scale-105 font-medium text-sm"
            >
                Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
