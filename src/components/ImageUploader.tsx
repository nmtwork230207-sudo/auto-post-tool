import React from 'react';
import { Upload, X, Images } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
}

export default function ImageUploader({ images, onChange, multiple = true }: ImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    let processedCount = 0;
    const newBase64Images: string[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 2048px (Facebook max width)
          const MAX_DIMENSION = 2048;
          if (width > height && width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.9 quality (high quality but smaller size)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
          newBase64Images.push(compressedBase64);
          processedCount++;
          
          if (processedCount === files.length) {
            if (multiple) {
              onChange([...images, ...newBase64Images]);
            } else {
              onChange([newBase64Images[0]]);
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {(images || []).map((img, idx) => (
          <div key={idx} className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
            <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {(multiple || (images || []).length === 0) && (
          <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors group">
            <Images className="w-7 h-7 text-blue-400 mb-2 group-hover:text-blue-600 transition-colors" />
            <span className="text-xs text-blue-600 font-medium text-center px-2">
              {multiple ? 'Chọn nhiều ảnh' : 'Tải ảnh lên'}
            </span>
            {multiple && <span className="text-[10px] text-gray-400 mt-1">(Ctrl/Cmd + Click)</span>}
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>
    </div>
  );
}
