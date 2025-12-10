
import React, { useState, useEffect } from 'react';

interface BoardDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  boardTitle: string;
}

const BoardDeleteModal: React.FC<BoardDeleteModalProps> = ({ isOpen, onClose, onConfirm, boardTitle }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatch = inputValue.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-scaleIn border border-red-100 relative overflow-hidden m-4">
        
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center shadow-inner border-4 border-red-50">
               <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
            </div>
        </div>

        <div className="text-center mb-6">
           <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Project?</h3>
           <p className="text-sm text-gray-500 leading-relaxed mb-4">
             You are about to delete <span className="font-bold text-gray-800">"{boardTitle}"</span>. 
             This will permanently remove all lists and cards inside it.
           </p>
           <p className="text-xs font-bold text-red-500 uppercase tracking-wide">This action cannot be undone.</p>
        </div>

        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                Type <span className="text-gray-800 select-all">delete</span> to confirm
            </label>
            <input 
                autoFocus
                type="text"
                className="w-full text-center py-2.5 px-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-800 font-bold tracking-widest placeholder-gray-300"
                placeholder="delete"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
        </div>

        <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                disabled={!isMatch}
                className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${isMatch ? 'bg-red-600 hover:bg-red-700 hover:scale-[1.02] shadow-red-500/30 cursor-pointer' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
            >
                <i className="fas fa-trash-alt"></i> Delete Board
            </button>
        </div>
      </div>
    </div>
  );
};

export default BoardDeleteModal;
