import React, { useState } from 'react';
import { useStore } from '../store';
import ImageUploader from './ImageUploader';
import { Layers, Image as ImageIcon, Clock, Play, RefreshCw, Sparkles, Facebook, Instagram, CheckSquare, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleGenAI } from '@google/genai';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function AutoPost() {
  const { autoPostDraft, updateAutoPost, addToQueue, shopInfo, geminiApiKey, geminiModel, resetDrafts } = useStore();
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const allPlatformsSelected = autoPostDraft.platforms?.fb && autoPostDraft.platforms?.ig;

  const handleToggleAllPlatforms = () => {
    const val = !allPlatformsSelected;
    updateAutoPost({ platforms: { fb: val, ig: val } });
  };

  const handleAIGenerateStructure = async () => {
    setIsGeneratingStructure(true);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY });
      const prompt = `Bạn là chuyên gia tạo Prompt. Hãy viết một "Answer Structure" (Cấu trúc trả lời) ngắn gọn để hướng dẫn một AI khác tự động nhìn ảnh sản phẩm và viết bài đăng bán hàng. 
      Ví dụ cấu trúc tốt: 
      1. Câu hook thu hút sự chú ý.
      2. Mô tả 3 đặc điểm nổi bật của sản phẩm trong ảnh.
      3. Lời kêu gọi hành động (Call to action).
      Hãy tạo ra một cấu trúc chuyên nghiệp, tối ưu cho bán hàng trên Facebook/Instagram với phong cách viết: ${autoPostDraft.style || 'Chuyên nghiệp'}. Chỉ trả về nội dung cấu trúc, không giải thích thêm.`;
      const response = await ai.models.generateContent({
        model: geminiModel || 'gemini-2.5-flash',
        contents: prompt
      });
      updateAutoPost({ answerStructure: response.text });
      toast.success('Đã tạo cấu trúc tự động!');
    } catch (error) {
      toast.error('Lỗi khi tạo cấu trúc.');
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const handleGenerateBatchContent = async () => {
    if (!autoPostDraft.images || autoPostDraft.images.length === 0) {
      toast.error('Vui lòng tải lên ảnh trước.');
      return;
    }
    if (!autoPostDraft.answerStructure.trim()) {
      toast.error('Vui lòng nhập cấu trúc (Answer Structure).');
      return;
    }

    setIsGeneratingBatch(true);
    setGenerationProgress(0);
    const generated = [];

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY });
      
      if (autoPostDraft.postMode === 'single') {
        for (let i = 0; i < (autoPostDraft.images || []).length; i++) {
          const imgBase64 = autoPostDraft.images[i];
          const matches = imgBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches) continue;

          const prompt = `Hãy viết một bài đăng bán hàng cho hình ảnh này dựa trên cấu trúc sau:\n\n${autoPostDraft.answerStructure}\n\nPhong cách viết: ${autoPostDraft.style || 'Chuyên nghiệp'}`;
          const response = await ai.models.generateContent({
            model: geminiModel || 'gemini-2.5-flash',
            contents: {
              parts: [
                { inlineData: { mimeType: matches[1], data: matches[2] } },
                { text: prompt }
              ]
            }
          });
          
          const finalContent = `${response.text || ''}${shopInfo.name ? `\n\n${shopInfo.name} - ${shopInfo.phone}\n${shopInfo.address}\n${shopInfo.hashtags}` : ''}`;
          
          generated.push({
            id: Date.now().toString() + i,
            image: imgBase64,
            content: finalContent
          });
          setGenerationProgress(Math.round(((i + 1) / (autoPostDraft.images || []).length) * 100));
        }
      } else {
        // Group mode
        const imageParts = autoPostDraft.images.slice(0, 10).map(imgBase64 => {
          const matches = imgBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          return matches ? { inlineData: { mimeType: matches[1], data: matches[2] } } : null;
        }).filter(Boolean) as any[];

        const prompt = `Hãy viết một bài đăng bán hàng chung cho TẤT CẢ các hình ảnh này dựa trên cấu trúc sau:\n\n${autoPostDraft.answerStructure}\n\nPhong cách viết: ${autoPostDraft.style || 'Chuyên nghiệp'}`;
        const response = await ai.models.generateContent({
          model: geminiModel || 'gemini-2.5-flash',
          contents: {
            parts: [...imageParts, { text: prompt }]
          }
        });

        const finalContent = `${response.text || ''}${shopInfo.name ? `\n\n${shopInfo.name} - ${shopInfo.phone}\n${shopInfo.address}\n${shopInfo.hashtags}` : ''}`;

        generated.push({
          id: Date.now().toString(),
          image: autoPostDraft.images[0], // Represent with first image
          content: finalContent
        });
        setGenerationProgress(100);
      }

      updateAutoPost({ generatedPosts: generated });
      toast.success('Đã tạo nội dung hàng loạt thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tạo nội dung hàng loạt.');
    } finally {
      setIsGeneratingBatch(false);
      setGenerationProgress(0);
    }
  };

  const handleStartAutoPost = async () => {
    if (!autoPostDraft.images || autoPostDraft.images.length === 0) {
      toast.error('Vui lòng tải lên ảnh để đăng tự động.');
      return;
    }
    if (!autoPostDraft.generatedPosts || autoPostDraft.generatedPosts.length === 0) {
      toast.error('Vui lòng tạo nội dung (AI) trước khi đưa vào hàng đợi.');
      return;
    }

    if (autoPostDraft.scheduleMode === 'once' && !autoPostDraft.scheduleTime) {
      toast.error('Vui lòng chọn thời gian hẹn giờ.');
      return;
    }

    if (autoPostDraft.scheduleMode === 'auto' && (!autoPostDraft.timeSlots || autoPostDraft.timeSlots.length === 0)) {
      toast.error('Vui lòng thêm ít nhất 1 khung giờ đăng.');
      return;
    }

    const posts = autoPostDraft.generatedPosts;

    if (autoPostDraft.postMode === 'single') {
      // Single mode: each image is a separate post
      if (autoPostDraft.scheduleMode === 'now') {
        posts.forEach((post, index) => {
          addToQueue({
            id: Date.now().toString() + '-' + index,
            type: 'create',
            images: [post.image],
            content: post.content,
            platforms: autoPostDraft.platforms,
            scheduleTime: Date.now(),
            status: 'pending'
          });
        });
      } else if (autoPostDraft.scheduleMode === 'once') {
        const baseTime = new Date(autoPostDraft.scheduleTime).getTime();
        posts.forEach((post, index) => {
          addToQueue({
            id: Date.now().toString() + '-' + index,
            type: 'create',
            images: [post.image],
            content: post.content,
            platforms: autoPostDraft.platforms,
            scheduleTime: baseTime,
            status: 'pending'
          });
        });
      } else if (autoPostDraft.scheduleMode === 'auto') {
        // Spread across days
        const postsPerDay = autoPostDraft.postsPerDay || 1;
        const timeSlots = [...autoPostDraft.timeSlots].sort(); // sort times
        
        let currentDay = new Date();
        currentDay.setHours(0, 0, 0, 0); // start at beginning of today
        
        let slotIndex = 0;
        let postsToday = 0;

        posts.forEach((post, index) => {
          if (postsToday >= postsPerDay) {
            // Move to next day
            currentDay.setDate(currentDay.getDate() + 1);
            postsToday = 0;
            slotIndex = 0;
          }

          const timeString = timeSlots[slotIndex % timeSlots.length];
          const [hours, minutes] = timeString.split(':').map(Number);
          
          const scheduleDate = new Date(currentDay);
          scheduleDate.setHours(hours, minutes, 0, 0);

          // If the scheduled time is in the past (e.g. today's earlier slot), move to tomorrow for this slot
          if (scheduleDate.getTime() < Date.now()) {
              scheduleDate.setDate(scheduleDate.getDate() + 1);
          }

          addToQueue({
            id: Date.now().toString() + '-' + index,
            type: 'create',
            images: [post.image],
            content: post.content,
            platforms: autoPostDraft.platforms,
            scheduleTime: scheduleDate.getTime(),
            status: 'pending'
          });

          slotIndex++;
          postsToday++;
        });
      }
    } else {
      // Group mode: all images in one post
      let scheduleTime = Date.now();
      if (autoPostDraft.scheduleMode === 'once') {
        scheduleTime = new Date(autoPostDraft.scheduleTime).getTime();
      } else if (autoPostDraft.scheduleMode === 'auto') {
        // Just pick the first available slot
        const timeSlots = [...autoPostDraft.timeSlots].sort();
        const timeString = timeSlots[0];
        const [hours, minutes] = timeString.split(':').map(Number);
        const scheduleDate = new Date();
        scheduleDate.setHours(hours, minutes, 0, 0);
        if (scheduleDate.getTime() < Date.now()) {
            scheduleDate.setDate(scheduleDate.getDate() + 1);
        }
        scheduleTime = scheduleDate.getTime();
      }

      addToQueue({
        id: Date.now().toString(),
        type: 'auto',
        images: autoPostDraft.images,
        generatedPosts: autoPostDraft.generatedPosts,
        postMode: autoPostDraft.postMode,
        platforms: autoPostDraft.platforms,
        scheduleTime: scheduleTime,
        status: 'pending'
      });
    }
    
    // Reset generated posts after queuing
    updateAutoPost({ generatedPosts: [], images: [] });
    toast.success('Đã đưa chiến dịch vào danh sách chờ!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Đăng bài tự động (Batch)</h2>
          <p className="text-slate-500 mt-2 text-sm">Tải lên nhiều ảnh, AI sẽ tự động tạo content và lên lịch đăng dần.</p>
        </div>
        <button
          onClick={() => {
            resetDrafts();
            toast.success('Đã làm mới biểu mẫu!');
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all font-medium shadow-sm text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới trang
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <h3 className="text-lg font-semibold mb-2 text-slate-800">1. Kho ảnh tự động</h3>
            <p className="text-sm text-slate-500 mb-6">Tải lên tất cả các ảnh bạn muốn dùng cho chiến dịch này.</p>
            <ImageUploader 
              images={autoPostDraft.images} 
              onChange={(imgs) => updateAutoPost({ images: imgs })} 
              multiple={true}
            />
            <div className="mt-4 text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-lg">
              Đã tải lên: {(autoPostDraft.images || []).length} ảnh
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-800">2. Cấu trúc Prompt (Answer Structure)</h3>
              <button
                onClick={handleAIGenerateStructure}
                disabled={isGeneratingStructure}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
              >
                {isGeneratingStructure ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI viết giúp
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Hướng dẫn cho AI cách viết bài cho từng ảnh (hoặc nhóm ảnh). AI sẽ tự động nhìn ảnh và viết theo cấu trúc này.
            </p>
            
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phong cách viết (Style)</label>
              <select
                value={autoPostDraft.style || 'professional'}
                onChange={(e) => updateAutoPost({ style: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
              >
                <option value="professional">Chuyên nghiệp, lịch sự</option>
                <option value="funny">Hài hước, dí dỏm</option>
                <option value="storytelling">Kể chuyện (Storytelling)</option>
                <option value="short">Ngắn gọn, súc tích</option>
                <option value="emotional">Cảm xúc, chạm đến trái tim</option>
                <option value="trendy">Bắt trend, gen Z</option>
              </select>
            </div>

            <textarea
              value={autoPostDraft.answerStructure}
              onChange={(e) => updateAutoPost({ answerStructure: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none font-mono text-sm text-slate-700"
              placeholder="VD: Viết một bài đăng bán hàng ngắn gọn. Bắt đầu bằng 1 câu hỏi thu hút. Nêu 3 ưu điểm của sản phẩm trong ảnh. Kết thúc bằng lời kêu gọi mua hàng."
            />
            
            <button
              onClick={handleGenerateBatchContent}
              disabled={isGeneratingBatch || !autoPostDraft.images || autoPostDraft.images.length === 0}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-violet-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden shadow-md shadow-indigo-500/20"
            >
              {isGeneratingBatch && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {isGeneratingBatch ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGeneratingBatch ? `Đang tạo nội dung... ${generationProgress}%` : 'Tạo nội dung hàng loạt (AI)'}
              </span>
            </button>
          </div>

          {(autoPostDraft.generatedPosts || []).length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Nội dung đã tạo ({(autoPostDraft.generatedPosts || []).length})</h3>
                <button
                  onClick={() => updateAutoPost({ showPreviewImage: !autoPostDraft.showPreviewImage })}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg transition-all hover:bg-slate-100 font-medium"
                >
                  {autoPostDraft.showPreviewImage ? <><EyeOff className="w-4 h-4" /> Ẩn ảnh</> : <><Eye className="w-4 h-4" /> Hiện ảnh</>}
                </button>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {(autoPostDraft.generatedPosts || []).map((post, idx) => (
                  <div key={post.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex gap-4 transition-all hover:border-slate-300">
                    {autoPostDraft.showPreviewImage && (
                      <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                        <img src={post.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bài {idx + 1}</div>
                        <button
                          onClick={async () => {
                            try {
                              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                              const prompt = `Viết lại nội dung sau cho hấp dẫn hơn, giữ nguyên thông tin liên hệ ở cuối:\n\n${post.content}`;
                              const response = await ai.models.generateContent({
                                model: 'gemini-3-flash-preview',
                                contents: prompt
                              });
                              const newPosts = [...autoPostDraft.generatedPosts];
                              newPosts[idx].content = response.text || '';
                              updateAutoPost({ generatedPosts: newPosts });
                              toast.success(`Đã viết lại bài ${idx + 1}`);
                            } catch (e) {
                              toast.error('Lỗi khi viết lại bài.');
                            }
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                        >
                          <Sparkles className="w-3 h-3" /> Viết lại
                        </button>
                      </div>
                      <textarea
                        value={post.content}
                        onChange={(e) => {
                          const newPosts = [...autoPostDraft.generatedPosts];
                          newPosts[idx].content = e.target.value;
                          updateAutoPost({ generatedPosts: newPosts });
                        }}
                        className="w-full h-28 text-[13px] leading-relaxed bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none custom-scrollbar text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">3. Cấu hình đăng</h3>
              <button 
                onClick={handleToggleAllPlatforms}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" /> {allPlatformsSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  autoPostDraft.platforms?.fb ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={autoPostDraft.platforms?.fb ?? true}
                    onChange={(e) => updateAutoPost({ platforms: { ...(autoPostDraft.platforms || {}), fb: e.target.checked } as any })}
                  />
                  <Facebook className="w-4 h-4" /> FB Page
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  autoPostDraft.platforms?.ig ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={autoPostDraft.platforms?.ig ?? false}
                    onChange={(e) => updateAutoPost({ platforms: { ...(autoPostDraft.platforms || {}), ig: e.target.checked } as any })}
                  />
                  <Instagram className="w-4 h-4" /> Instagram
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Chế độ đăng</label>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    autoPostDraft.postMode === 'single' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="postMode"
                      checked={autoPostDraft.postMode === 'single'}
                      onChange={() => updateAutoPost({ postMode: 'single' })}
                      className="hidden"
                    />
                    <div className={`p-2 rounded-lg ${autoPostDraft.postMode === 'single' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Đăng lẻ</div>
                      <div className="text-xs text-slate-500">Mỗi ảnh = 1 bài đăng riêng biệt</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    autoPostDraft.postMode === 'group' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="postMode"
                      checked={autoPostDraft.postMode === 'group'}
                      onChange={() => updateAutoPost({ postMode: 'group' })}
                      className="hidden"
                    />
                    <div className={`p-2 rounded-lg ${autoPostDraft.postMode === 'group' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Đăng chung</div>
                      <div className="text-xs text-slate-500">Gộp tất cả ảnh vào 1 bài đăng</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Chế độ đăng</label>
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="scheduleMode" checked={autoPostDraft.scheduleMode === 'now'} onChange={() => updateAutoPost({ scheduleMode: 'now' })} />
                    <span className="text-sm text-slate-700">Đăng ngay</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="scheduleMode" checked={autoPostDraft.scheduleMode === 'once'} onChange={() => updateAutoPost({ scheduleMode: 'once' })} />
                    <span className="text-sm text-slate-700">Hẹn giờ 1 lần</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="scheduleMode" checked={autoPostDraft.scheduleMode === 'auto'} onChange={() => updateAutoPost({ scheduleMode: 'auto' })} />
                    <span className="text-sm text-slate-700">Lên lịch tự động (Rải đều các ngày)</span>
                  </label>
                </div>

                {autoPostDraft.scheduleMode === 'once' && (
                  <div className="flex items-center gap-2 relative mt-4">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <DatePicker
                      selected={autoPostDraft.scheduleTime ? new Date(autoPostDraft.scheduleTime) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const tzOffset = date.getTimezoneOffset() * 60000;
                          const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
                          updateAutoPost({ scheduleTime: localISOTime });
                        } else {
                          updateAutoPost({ scheduleTime: '' });
                        }
                      }}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy h:mm aa"
                      placeholderText="Chọn ngày và giờ"
                      className="flex-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                )}

                {autoPostDraft.scheduleMode === 'auto' && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Số bài / ngày</label>
                      <input
                        type="number"
                        min="1"
                        value={autoPostDraft.postsPerDay}
                        onChange={(e) => updateAutoPost({ postsPerDay: parseInt(e.target.value) || 1 })}
                        className="w-full max-w-[120px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Các khung giờ đăng trong ngày</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {(autoPostDraft.timeSlots || []).map((time, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm">
                            <input 
                              type="time" 
                              value={time}
                              onChange={(e) => {
                                const newSlots = [...autoPostDraft.timeSlots];
                                newSlots[idx] = e.target.value;
                                updateAutoPost({ timeSlots: newSlots });
                              }}
                              className="outline-none bg-transparent"
                            />
                            <button 
                              onClick={() => {
                                const newSlots = autoPostDraft.timeSlots.filter((_, i) => i !== idx);
                                updateAutoPost({ timeSlots: newSlots });
                              }}
                              className="text-slate-400 hover:text-red-500 ml-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            updateAutoPost({ timeSlots: [...(autoPostDraft.timeSlots || []), '12:00'] });
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-2 rounded-xl transition-all"
                        >
                          + Thêm giờ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleStartAutoPost}
              disabled={isRunning || !autoPostDraft.generatedPosts || autoPostDraft.generatedPosts.length === 0}
              className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-70"
            >
              {isRunning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
              {isRunning ? 'Đang khởi chạy...' : 'Đưa vào hàng đợi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
