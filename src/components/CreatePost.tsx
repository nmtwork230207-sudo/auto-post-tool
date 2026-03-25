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

      const shopDetails = [
        shopInfo.name ? `- Tên shop: ${shopInfo.name}` : '',
        shopInfo.phone ? `- SĐT/Zalo: ${shopInfo.phone}` : '',
        shopInfo.address ? `- Địa chỉ: ${shopInfo.address}` : '',
        shopInfo.hashtags ? `${shopInfo.hashtags}` : ''
      ].filter(Boolean).join('\n');

      const prompt = `
QUY TẮC BẮT BUỘC:
- TUYỆT ĐỐI không dùng ký tự markdown: **, *, #, ---, __, []
- Dùng emoji thay thế để tạo điểm nhấn (✨, 🔥, 💥, ✅, 👉, 📦...)
- Không được liệt kê đặc điểm kỹ thuật khô khan
- Viết như người bán hàng thật nói chuyện với khách, gần gũi, tự nhiên
- Độ dài: 150–250 từ, KHÔNG được dài hơn
- Luôn có 1 câu kêu gọi hành động (CTA) cuối bài
- Kết thúc bằng 5–8 hashtag ngắn gọn liên quan

CẤU TRÚC BÀI VIẾT:
1. Dòng mở đầu: Câu hook gây chú ý (1 câu, có emoji)
2. Thân bài: 2–3 lợi ích thực tế của sản phẩm (viết như kể chuyện, không liệt kê)
3. CTA: Kêu khách nhắn tin / bình luận / gọi ngay
4. Hashtag

THÔNG TIN SHOP (luôn thêm vào cuối nếu có):
${shopDetails ? shopDetails : 'Bỏ qua phần thông tin shop vì chưa có.'}

Dựa vào hình ảnh sản phẩm được cung cấp, hãy viết bài đăng bán hàng theo đúng quy tắc và cấu trúc trên.
Phong cách viết: ${createPostDraft.style}
      `.trim();

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

    // For 'now' scheduleMode (hardcoded to now)
    addToQueue({
      id: Date.now().toString(),
      type: 'create',
      images: createPostDraft.images,
      content: finalContent,
      platforms: createPostDraft.platforms,
      scheduleTime: Date.now(),
      status: 'pending'
    });
    toast.success('Đã đưa vào danh sách chờ!');
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
                    createPostDraft.mode === 'auto' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Mô tả ngắn</label>
                    {(createPostDraft.manualDesc || '').trim().length > 0 && (
                      <button
                        onClick={handleAIEnhanceManual}
                        disabled={isGenerating}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-sm"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
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
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/20"
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
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
              className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-medium text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-70"
            >
              {isPublishing ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
              {isPublishing ? 'Đang xử lý...' : 'Đăng bài ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
