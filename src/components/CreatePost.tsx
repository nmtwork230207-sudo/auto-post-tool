import React, { useState } from 'react';
import { useStore } from '../store';
import ImageUploader from './ImageUploader';
import { Sparkles, Send, Clock, Facebook, Instagram, RefreshCw, Eye, EyeOff, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleGenAI } from '@google/genai';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function CreatePost() {
    const { createPostDraft, updateCreatePost, shopInfo, n8nWebhookUrl, fbPageId, fbToken, igAccountId, geminiApiKey, geminiModel, addToQueue, resetDrafts } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const allPlatformsSelected = createPostDraft.platforms?.fb && createPostDraft.platforms?.ig;

  const handleToggleAllPlatforms = () => {
    const val = !allPlatformsSelected;
    updateCreatePost({ platforms: { fb: val, ig: val } });
  };

  const handleGenerateContent = async () => {
    if (!createPostDraft.images || createPostDraft.images.length === 0) {
      toast.error('Vui lòng tải lên ít nhất 1 ảnh sản phẩm.');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY });
      
      const imageParts = createPostDraft.images.map(imgBase64 => {
        const matches = imgBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid image format');
        }
        return {
          inlineData: {
            mimeType: matches[1],
            data: matches[2],
          }
        };
      });

      const prompt = `
        Bạn là một chuyên gia viết nội dung quảng cáo (copywriter) chuyên nghiệp trên mạng xã hội.
        Hãy viết một bài đăng bán hàng hấp dẫn dựa trên hình ảnh sản phẩm được cung cấp.
        
        Phong cách viết: ${createPostDraft.style}
        
        Thông tin cửa hàng (hãy chèn vào cuối bài đăng như một Call-to-action):
        - Tên Shop: ${shopInfo.name || 'Chưa cập nhật'}
        - SĐT/Zalo: ${shopInfo.phone || 'Chưa cập nhật'}
        - Địa chỉ: ${shopInfo.address || 'Chưa cập nhật'}
        - Hashtags: ${shopInfo.hashtags || '#sanpham'}
        
        Yêu cầu:
        - Tiêu đề thu hút (in hoa hoặc dùng emoji).
        - Nêu bật lợi ích và đặc điểm sản phẩm từ hình ảnh.
        - Có lời kêu gọi hành động (Call to action) rõ ràng.
        - Trình bày bố cục dễ đọc, dùng emoji phù hợp.
      `;

      const response = await ai.models.generateContent({
        model: geminiModel || 'gemini-2.5-flash',
        contents: {
          parts: [...imageParts, { text: prompt }]
        }
      });

      updateCreatePost({ generatedContent: response.text });
      toast.success('Đã tạo nội dung thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tạo nội dung bằng AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIEnhanceManual = async () => {
    if (!createPostDraft.manualDesc) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY });
      const prompt = `Dựa vào mô tả sau: "${createPostDraft.manualDesc}" và giá "${createPostDraft.manualPrice}". Hãy viết lại thành một bài đăng bán hàng hấp dẫn, chuyên nghiệp, có sử dụng emoji phù hợp. Không cần chèn thông tin liên hệ vì tôi sẽ tự chèn sau.`;
      const response = await ai.models.generateContent({
        model: geminiModel || 'gemini-2.5-flash',
        contents: prompt
      });
      updateCreatePost({ manualDesc: response.text });
      toast.success('Đã tối ưu nội dung!');
    } catch (error) {
      toast.error('Lỗi khi tối ưu nội dung.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    const finalContent = createPostDraft.mode === 'auto' 
      ? createPostDraft.generatedContent 
      : `${createPostDraft.manualDesc}\n\nGiá: ${createPostDraft.manualPrice}\n\n${shopInfo.name} - ${shopInfo.phone}\n${shopInfo.address}\n${shopInfo.hashtags}`;

    if (createPostDraft.scheduleMode === 'once') {
      if (!createPostDraft.scheduleTime) {
        toast.error('Vui lòng chọn thời gian hẹn giờ.');
        return;
      }
      addToQueue({
        id: Date.now().toString(),
        type: 'create',
        images: createPostDraft.images,
        content: finalContent,
        platforms: createPostDraft.platforms,
        scheduleTime: new Date(createPostDraft.scheduleTime).getTime(),
        status: 'pending'
      });
      toast.success('Đã đưa vào danh sách chờ!');
      return;
    }

    if (createPostDraft.scheduleMode === 'auto') {
      if (!createPostDraft.timeSlots || createPostDraft.timeSlots.length === 0) {
        toast.error('Vui lòng thêm ít nhất 1 khung giờ đăng.');
        return;
      }
      
      const timeSlots = [...createPostDraft.timeSlots].sort();
      const timeString = timeSlots[0]; // just pick the first slot for a single post
      const [hours, minutes] = timeString.split(':').map(Number);
      
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);

      if (scheduleDate.getTime() < Date.now()) {
          scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      addToQueue({
        id: Date.now().toString(),
        type: 'create',
        images: createPostDraft.images,
        content: finalContent,
        platforms: createPostDraft.platforms,
        scheduleTime: scheduleDate.getTime(),
        status: 'pending'
      });
      toast.success('Đã đưa vào danh sách chờ!');
      return;
    }

    if (!n8nWebhookUrl) {
      toast.error('Vui lòng cấu hình Webhook URL trong phần Cài đặt.');
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        action: 'create_post',
        images: createPostDraft.images,
        content: finalContent,
        platforms: createPostDraft.platforms,
        scheduleTime: new Date().toISOString(),
        fbPageId,
        fbToken,
        igAccountId
      };

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Đã đăng bài thành công!');
      } else {
        toast.error(`Lỗi từ Webhook: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook fetch error:', error);
      toast.error('Không thể kết nối đến Webhook. Vui lòng kiểm tra lại URL hoặc bật "Respond to CORS" trong n8n Webhook Node.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Tạo bài đăng mới</h2>
          <p className="text-slate-500 mt-2">Tạo và tùy chỉnh bài đăng cho các nền tảng mạng xã hội.</p>
        </div>
        <button
          onClick={() => {
            resetDrafts();
            toast.success('Đã làm mới biểu mẫu!');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium shadow-sm hover:shadow"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới trang
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">1. Ảnh sản phẩm</h3>
            <ImageUploader 
              images={createPostDraft.images} 
              onChange={(imgs) => updateCreatePost({ images: imgs })} 
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">2. Nội dung bài đăng</h3>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => updateCreatePost({ mode: 'manual' })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    createPostDraft.mode === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Thủ công
                </button>
                <button
                  onClick={() => updateCreatePost({ mode: 'auto' })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                    createPostDraft.mode === 'auto' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> AI Viết
                </button>
              </div>
            </div>

            {createPostDraft.mode === 'manual' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giá sản phẩm</label>
                  <input
                    type="text"
                    value={createPostDraft.manualPrice}
                    onChange={(e) => updateCreatePost({ manualPrice: e.target.value })}
                    placeholder="VD: 299.000đ"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Mô tả ngắn</label>
                    {(createPostDraft.manualDesc || '').trim().length > 0 && (
                      <button
                        onClick={handleAIEnhanceManual}
                        disabled={isGenerating}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        AI viết lại cho hay hơn
                      </button>
                    )}
                  </div>
                  <textarea
                    value={createPostDraft.manualDesc}
                    onChange={(e) => updateCreatePost({ manualDesc: e.target.value })}
                    rows={6}
                    placeholder="Nhập mô tả sản phẩm của bạn..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phong cách viết (Style)</label>
                  <select
                    value={createPostDraft.style}
                    onChange={(e) => updateCreatePost({ style: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                  >
                    <option value="professional">Chuyên nghiệp, lịch sự</option>
                    <option value="humorous">Hài hước, bắt trend</option>
                    <option value="storytelling">Kể chuyện, cảm xúc</option>
                    <option value="urgent">Thúc giục, khan hiếm (Flash sale)</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-violet-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-500/20"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGenerating ? 'AI Đang viết...' : 'Tạo nội dung tự động'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">3. Nền tảng & Lên lịch</h3>
              <button 
                onClick={handleToggleAllPlatforms}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <CheckSquare className="w-4 h-4" /> {allPlatformsSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  createPostDraft.platforms?.fb ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={createPostDraft.platforms?.fb ?? true}
                    onChange={(e) => updateCreatePost({ platforms: { ...(createPostDraft.platforms || {}), fb: e.target.checked } as any })}
                  />
                  <Facebook className="w-4 h-4" /> FB Page
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  createPostDraft.platforms?.ig ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={createPostDraft.platforms?.ig ?? false}
                    onChange={(e) => updateCreatePost({ platforms: { ...(createPostDraft.platforms || {}), ig: e.target.checked } as any })}
                  />
                  <Instagram className="w-4 h-4" /> Instagram
                </label>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700">Chế độ đăng</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={createPostDraft.scheduleMode === 'now'}
                      onChange={() => updateCreatePost({ scheduleMode: 'now' })}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-slate-700 text-sm font-medium">Đăng ngay</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={createPostDraft.scheduleMode === 'once'}
                      onChange={() => updateCreatePost({ scheduleMode: 'once' })}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-slate-700 text-sm font-medium">Hẹn giờ 1 lần</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={createPostDraft.scheduleMode === 'auto'}
                      onChange={() => updateCreatePost({ scheduleMode: 'auto' })}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-slate-700 text-sm font-medium">Lên lịch tự động (Rải đều các ngày)</span>
                  </label>
                </div>
                
                {createPostDraft.scheduleMode === 'once' && (
                  <div className="relative mt-2">
                    <DatePicker
                      selected={createPostDraft.scheduleTime ? new Date(createPostDraft.scheduleTime) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const tzOffset = date.getTimezoneOffset() * 60000;
                          const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
                          updateCreatePost({ scheduleTime: localISOTime });
                        } else {
                          updateCreatePost({ scheduleTime: '' });
                        }
                      }}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy h:mm aa"
                      placeholderText="Chọn ngày và giờ"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                )}

                {createPostDraft.scheduleMode === 'auto' && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Số bài / ngày</label>
                      <input
                        type="number"
                        min="1"
                        value={createPostDraft.postsPerDay}
                        onChange={(e) => updateCreatePost({ postsPerDay: parseInt(e.target.value) || 1 })}
                        className="w-full max-w-[120px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Các khung giờ đăng trong ngày</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {(createPostDraft.timeSlots || []).map((time, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm">
                            <input 
                              type="time" 
                              value={time}
                              onChange={(e) => {
                                const newSlots = [...createPostDraft.timeSlots];
                                newSlots[idx] = e.target.value;
                                updateCreatePost({ timeSlots: newSlots });
                              }}
                              className="outline-none bg-transparent"
                            />
                            <button 
                              onClick={() => {
                                const newSlots = createPostDraft.timeSlots.filter((_, i) => i !== idx);
                                updateCreatePost({ timeSlots: newSlots });
                              }}
                              className="text-slate-400 hover:text-red-500 ml-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            updateCreatePost({ timeSlots: [...(createPostDraft.timeSlots || []), '12:00'] });
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
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                Xem trước bài đăng
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">Preview</span>
              </h3>
              <button
                onClick={() => updateCreatePost({ showPreviewImage: !createPostDraft.showPreviewImage })}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg transition-all hover:bg-slate-100 font-medium"
              >
                {createPostDraft.showPreviewImage ? <><EyeOff className="w-4 h-4" /> Ẩn ảnh</> : <><Eye className="w-4 h-4" /> Hiện ảnh</>}
              </button>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[70vh]">
              {/* FB Header Mock */}
              <div className="p-4 flex items-center gap-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
                <div>
                  <div className="font-semibold text-sm text-slate-900">{shopInfo.name || 'Tên Page của bạn'}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    Vừa xong • 🌎
                  </div>
                </div>
              </div>
              
              {/* Content - Scrollable */}
              <div className="p-4 flex-1 flex flex-col">
                <textarea
                  value={createPostDraft.mode === 'auto' 
                    ? createPostDraft.generatedContent 
                    : `${createPostDraft.manualDesc}${createPostDraft.manualPrice ? `\n\nGiá: ${createPostDraft.manualPrice}` : ''}${shopInfo.name ? `\n\n${shopInfo.name} - ${shopInfo.phone}\n${shopInfo.address}\n${shopInfo.hashtags}` : ''}`}
                  onChange={(e) => {
                    updateCreatePost({ 
                      mode: 'auto', 
                      generatedContent: e.target.value 
                    });
                  }}
                  className="w-full h-full min-h-[300px] text-[15px] leading-relaxed text-slate-800 outline-none resize-none custom-scrollbar"
                  placeholder="Nội dung bài đăng sẽ hiển thị ở đây..."
                />
              </div>
              
              {/* Images */}
              {createPostDraft.showPreviewImage && (createPostDraft.images || []).length > 0 && (
                <div className="flex overflow-x-auto gap-2 p-2 bg-slate-100 custom-scrollbar shrink-0">
                  {(createPostDraft.images || []).map((img, idx) => (
                    <div key={idx} className="relative h-48 min-w-[150px] shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                      <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-70"
            >
              {isPublishing ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : createPostDraft.scheduleMode !== 'now' ? (
                <Clock className="w-6 h-6" />
              ) : (
                <Send className="w-6 h-6" />
              )}
              {isPublishing ? 'Đang xử lý...' : createPostDraft.scheduleMode !== 'now' ? 'Lên lịch bài đăng' : 'Đăng bài ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
