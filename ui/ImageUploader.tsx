
import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { NodeImage } from '../types';

interface Props {
  onImageAdded: (image: NodeImage) => void;
}

export const ImageUploader: React.FC<Props> = ({ onImageAdded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large (max 5MB)');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onImageAdded({
        dataUrl,
        caption: file.name.split('.')[0],
        isPrimary: false
      });
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${isDragOver ? 'border-endecja-gold bg-endecja-gold/10' : 'border-gray-300 hover:border-endecja-gold'}
      `}
    >
      <label className="cursor-pointer block">
        {isProcessing ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-endecja-gold" />
        ) : (
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
        )}
        <span className="mt-2 block text-xs text-gray-600 font-medium">
          Drag & Drop or Click to Upload
        </span>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />
      </label>
    </div>
  );
};
