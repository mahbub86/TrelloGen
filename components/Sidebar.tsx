import React, { useState } from 'react';
import { Board } from '../types';

interface SidebarProps {
  boards: Board[];
  currentBoardId: string | null;
  onSelectBoard: (board: Board) => void;
  onCreateBoard: (title: string, background: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const backgroundOptions = [
  { name: 'Ocean', value: 'bg-gradient-to-br from-blue-600 to-cyan-500' },
  { name: 'Sunset', value: 'bg-gradient-to-br from-orange-400 to-rose-500' },
  { name: 'Forest', value: 'bg-gradient-to-br from-emerald-500 to-teal-700' },
  { name: 'Night', value: 'bg-gradient-to-br from-slate-800 to-gray-900' },
  { name: 'Berry', value: 'bg-gradient-to-br from-fuchsia-600 to-purple-700' },
  { name: 'Midnight', value: 'bg-gradient-to-br from-indigo-900 to-slate-900' },
];

const Sidebar: React.FC<SidebarProps> = ({ boards, currentBoardId, onSelectBoard, onCreateBoard, isOpen, onToggle }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedBg, setSelectedBg] = useState(backgroundOptions[0].value);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateBoard(newTitle, selectedBg);
    setNewTitle('');
    setIsCreating(false);
  };

  return (
    <div 
      className={`
        flex flex-col glass-sidebar text-gray-200 h-full transition-all duration-300 ease-in-out relative z-20 overflow-hidden
        ${isOpen ? 'w-72' : 'w-16'}
      `}
    >
      {/* Top to Bottom Flow Animation Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none animate-flowVertical opacity-50"></div>

      {/* Wave decoration at bottom of sidebar - Left to Right */}
       {isOpen && (
        <div className="absolute bottom-0 left-0 w-full h-32 overflow-hidden pointer-events-none z-0 opacity-20">
             <div className="wave wave-lr"></div>
             <div className="wave wave-lr"></div>
        </div>
       )}

      {/* Header / Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0 relative z-10">
        {isOpen && (
           <div className="animate-fadeIn">
              <span className="font-bold text-white tracking-tight text-sm uppercase drop-shadow-md">Workspace</span>
           </div>
        )}
        <button 
            onClick={onToggle}
            className={`
                w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all text-white/70 hover:text-white
                ${!isOpen && 'mx-auto'}
            `}
        >
          <i className={`fas ${isOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto py-6 space-y-2 px-2 scrollbar-thin scrollbar-thumb-white/10 relative z-10">
        {boards.map(board => (
          <button
            key={board.id}
            onClick={() => onSelectBoard(board)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group border
              ${currentBoardId === board.id ? 'bg-white/10 border-white/20 text-white shadow-lg' : 'border-transparent hover:bg-white/5 hover:text-white text-white/70'}
              ${!isOpen && 'justify-center px-0'}
            `}
            title={!isOpen ? board.title : ''}
          >
             <div className={`w-8 h-8 rounded-lg shrink-0 ${board.background} shadow-inner flex items-center justify-center text-[10px] text-white font-bold border border-white/20`}>
                {board.title.substring(0, 2).toUpperCase()}
             </div>
             
             {isOpen && (
                <span className="truncate text-sm font-medium animate-fadeIn drop-shadow-sm">{board.title}</span>
             )}
             
             {/* Active Indicator */}
             {currentBoardId === board.id && (
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-r shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
             )}
          </button>
        ))}
      </div>

      {/* Create New Project Section */}
      <div className="p-4 border-t border-white/10 shrink-0 relative z-10 bg-black/20">
        {!isCreating ? (
           <button 
             onClick={() => {
                if(!isOpen) onToggle();
                setIsCreating(true);
             }}
             className={`
               w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-blue-500/20 text-blue-200 hover:text-blue-100 transition-all border border-dashed border-white/20 hover:border-blue-400/50
               ${!isOpen ? 'justify-center' : ''}
             `}
           >
             <i className="fas fa-plus-circle text-lg drop-shadow-md"></i>
             {isOpen && <span>Create Board</span>}
           </button>
        ) : (
           <div className="glass-dark p-4 rounded-xl animate-scaleIn shadow-2xl">
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">New Board</h4>
              <input 
                 autoFocus
                 type="text"
                 className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white mb-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500 transition-all backdrop-blur-sm"
                 placeholder="Project name..."
                 value={newTitle}
                 onChange={e => setNewTitle(e.target.value)}
              />
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                 {backgroundOptions.map(bg => (
                    <button
                       key={bg.value}
                       type="button"
                       onClick={() => setSelectedBg(bg.value)}
                       className={`w-8 h-8 rounded-full shrink-0 ${bg.value} ${selectedBg === bg.value ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'} transition-all`}
                       title={bg.name}
                    ></button>
                 ))}
              </div>
              <div className="flex gap-2">
                 <button 
                    onClick={handleCreate}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-600/30"
                 >
                    Create
                 </button>
                 <button 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-gray-200 py-1.5 rounded-lg text-xs font-bold transition"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;