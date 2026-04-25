import { useState, useRef } from 'react';
import { Upload, FileMinus, ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

export const Dropzone = ({ onFileSelect, className }: DropzoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={cn(
        "relative border-2 border-dashed rounded-[32px] p-12 transition-all cursor-pointer group flex flex-col items-center justify-center text-center",
        isDragActive 
          ? "border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-600/5" 
          : "border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerInput}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleChange}
        className="hidden" 
        accept="image/*,.pdf"
      />
      
      <div className="w-20 h-20 rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center text-indigo-600 mb-8 transition-transform group-hover:scale-110 duration-500">
        <Upload size={32} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-1.5 shadow-sm">
          <Sparkles size={12} />
          AI-Powered OCR
        </div>
      </div>

      <h3 className="text-xl font-black text-slate-900 mb-2">Drop your invoice here</h3>
      <p className="text-sm text-slate-500 font-medium max-w-xs mb-8">
        Drag and drop your receipts or <span className="text-indigo-600 font-bold border-b-2 border-indigo-100">browse files</span>. Professional-grade extraction in seconds.
      </p>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-xs font-bold text-slate-400">
          <ImageIcon size={14} /> JPG/PNG
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-xs font-bold text-slate-400">
          <FileMinus size={14} /> PDF
        </div>
      </div>

      {isDragActive && (
        <div className="absolute inset-0 bg-indigo-600/5 rounded-[30px] flex items-center justify-center pointer-events-none">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl border border-indigo-100 font-bold text-indigo-600 animate-bounce">
            Drop it now!
          </div>
        </div>
      )}
    </div>
  );
};
