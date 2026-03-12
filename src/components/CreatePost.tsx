import React, { useState } from 'react';
import { useStore } from '../store';
import ImageUploader from './ImageUploader';
import { Sparkles, Send, Clock, Facebook, Instagram, RefreshCw, Eye, EyeOff, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleGenAI } from '@google/genai';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function CreatePost() {
  const { createPostDraft, updateCreatePost, shopInfo, n8nWebhookUrl, addToQueue, logout } = useStore();
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
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
        model: 'gemini-3-flash-preview',
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Dựa vào mô tả sau: "${createPostDraft.manualDesc}" và giá "${createPostDraft.manualPrice}". Hãy viết lại thành một bài đăng bán hàng hấp dẫn, chuyên nghiệp, có sử dụng emoji phù hợp. Không cần chèn thông tin liên hệ vì tôi sẽ tự chèn sau.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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

    if (createPostDraft.scheduleMode === 'schedule') {
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
        schedule: 'now',
      };

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Đã đăng bài thành công!');
      } else {
        toast.error('Lỗi khi gửi dữ liệu đến Webhook.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể kết nối đến Webhook.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Tạo bài đăng mới</h2>
          <p className="text-gray-500 mt-2">Tạo và tùy chỉnh bài đăng cho các nền tảng mạng xã hội.</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Bạn có chắc chắn muốn đăng xuất và xóa tất cả dữ liệu không?')) {
              logout();
              toast.success('Đã đăng xuất!');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">1. Ảnh sản phẩm</h3>
            <ImageUploader 
              images={createPostDraft.images} 
              onChange={(imgs) => updateCreatePost({ images: imgs })} 
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">2. Nội dung bài đăng</h3>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => updateCreatePost({ mode: 'manual' })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    createPostDraft.mode === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Thủ công
                </button>
                <button
                  onClick={() => updateCreatePost({ mode: 'auto' })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    createPostDraft.mode === 'auto' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> AI Viết
                </button>
              </div>
            </div>

            {createPostDraft.mode === 'manual' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá sản phẩm</label>
                  <input
                    type="text"
                    value={createPostDraft.manualPrice}
                    onChange={(e) => updateCreatePost({ manualPrice: e.target.value })}
                    placeholder="VD: 299.000đ"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Mô tả ngắn</label>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phong cách viết (Style)</label>
                  <select
                    value={createPostDraft.style}
                    onChange={(e) => updateCreatePost({ style: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
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
                  className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGenerating ? 'AI Đang viết...' : 'Tạo nội dung tự động'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">3. Nền tảng & Lên lịch</h3>
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
                  createPostDraft.platforms?.fb ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
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
                  createPostDraft.platforms?.ig ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
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

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={createPostDraft.scheduleMode === 'now'}
                      onChange={() => updateCreatePost({ scheduleMode: 'now' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Đăng ngay</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={createPostDraft.scheduleMode === 'schedule'}
                      onChange={() => updateCreatePost({ scheduleMode: 'schedule' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Hẹn giờ</span>
                  </label>
                </div>
                
                {createPostDraft.scheduleMode === 'schedule' && (
                  <div className="relative">
                    <DatePicker
                      selected={createPostDraft.scheduleTime ? new Date(createPostDraft.scheduleTime) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          // Format to YYYY-MM-DDTHH:mm
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Xem trước bài đăng
                <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Preview</span>
              </h3>
              <button
                onClick={() => updateCreatePost({ showPreviewImage: !createPostDraft.showPreviewImage })}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {createPostDraft.showPreviewImage ? <><EyeOff className="w-4 h-4" /> Ẩn ảnh</> : <><Eye className="w-4 h-4" /> Hiện ảnh</>}
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[70vh]">
              {/* FB Header Mock */}
              <div className="p-4 flex items-center gap-3 border-b border-gray-100 shrink-0">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div>
                  <div className="font-semibold text-sm">{shopInfo.name || 'Tên Page của bạn'}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
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
                  className="w-full h-full min-h-[300px] text-base text-gray-800 outline-none resize-none custom-scrollbar"
                  placeholder="Nội dung bài đăng sẽ hiển thị ở đây..."
                />
              </div>
              
              {/* Images */}
              {createPostDraft.showPreviewImage && (createPostDraft.images || []).length > 0 && (
                <div className={`grid gap-1 shrink-0 ${(createPostDraft.images || []).length > 1 ? 'grid-cols-2' : 'grid-cols-1'} max-h-[300px] overflow-hidden`}>
                  {(createPostDraft.images || []).slice(0, 4).map((img, idx) => (
                    <div key={idx} className="relative aspect-video md:aspect-square">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      {idx === 3 && (createPostDraft.images || []).length > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-3xl font-bold">
                          +{(createPostDraft.images || []).length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
            >
              {isPublishing ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : createPostDraft.scheduleMode === 'schedule' ? (
                <Clock className="w-6 h-6" />
              ) : (
                <Send className="w-6 h-6" />
              )}
              {isPublishing ? 'Đang xử lý...' : createPostDraft.scheduleMode === 'schedule' ? 'Lên lịch bài đăng' : 'Đăng bài ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
