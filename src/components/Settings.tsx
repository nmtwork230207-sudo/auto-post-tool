import React, { useState } from 'react';
import { useStore } from '../store';
import { Save, Webhook, Store, Key, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { shopInfo, n8nWebhookUrl, fbPageId, fbToken, igAccountId, geminiApiKey, geminiModel, updateSettings } = useStore();
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    toast.success('Đã lưu cài đặt thành công!');
  };

  const handleTestWebhook = async () => {
    if (!n8nWebhookUrl) {
      toast.error('Vui lòng nhập Webhook URL trước.');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', message: 'Hello from SocialPost Pro!' }),
      });

      if (response.ok) {
        toast.success('Kết nối Webhook thành công!');
      } else {
        toast.error(`Lỗi kết nối: ${response.status}`);
      }
    } catch (error) {
      toast.error('Không thể kết nối đến Webhook. Vui lòng kiểm tra lại URL hoặc CORS.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cài đặt hệ thống</h2>
          <p className="text-slate-500 mt-2 text-sm">Cấu hình thông tin cửa hàng và kết nối API.</p>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm shadow-slate-900/10"
        >
          <Save className="w-4 h-4" /> Lưu thay đổi
        </button>
      </div>

      <div className="space-y-6">
        {/* Shop Info */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Store className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-900">Thông tin Cửa hàng (CTA Cuối bài)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên Shop</label>
              <input
                type="text"
                value={shopInfo.name}
                onChange={(e) => updateSettings({ shopInfo: { ...shopInfo, name: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-[15px] text-slate-700"
                placeholder="VD: Thời Trang XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại / Zalo</label>
              <input
                type="text"
                value={shopInfo.phone}
                onChange={(e) => updateSettings({ shopInfo: { ...shopInfo, phone: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-[15px] text-slate-700"
                placeholder="VD: 0987.654.321"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Địa chỉ</label>
              <input
                type="text"
                value={shopInfo.address}
                onChange={(e) => updateSettings({ shopInfo: { ...shopInfo, address: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-[15px] text-slate-700"
                placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hashtags mặc định</label>
              <input
                type="text"
                value={shopInfo.hashtags}
                onChange={(e) => updateSettings({ shopInfo: { ...shopInfo, hashtags: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-[15px] text-slate-700"
                placeholder="VD: #thoitrang #xuhuong #sale"
              />
            </div>
          </div>
        </section>

        {/* API & Integrations */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Webhook className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-900">Tích hợp n8n & API</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">n8n Webhook URL</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={n8nWebhookUrl}
                  onChange={(e) => updateSettings({ n8nWebhookUrl: e.target.value })}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-slate-700"
                  placeholder="https://your-n8n-instance.com/webhook/..."
                />
                <button
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {isTesting ? 'Đang test...' : 'Test Webhook'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Tất cả dữ liệu bài đăng sẽ được gửi đến Webhook này dưới dạng JSON POST.
              </p>
            </div>
          </div>
        </section>

        {/* Cấu hình AI (Gemini) */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="w-5 h-5 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-md font-bold text-xs">AI</div>
            <h3 className="text-lg font-semibold text-slate-900">Cấu hình AI (Gemini)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-slate-700"
                placeholder="Để trống để dùng Key mặc định"
              />
              <p className="text-xs text-slate-500 mt-2">
                Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô hình AI (Model)</label>
              <select
                value={geminiModel}
                onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-[15px] text-slate-700"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Nhanh, Rẻ, Khuyên dùng)</option>
                <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview</option>
                <option value="gemini-3.1-flash-preview">Gemini 3.1 Flash Preview</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Thông minh hơn, Chậm hơn)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Social Accounts */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Key className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-900">Tài khoản Mạng xã hội</h3>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Facebook Page ID</label>
                <input
                  type="text"
                  value={fbPageId}
                  onChange={(e) => updateSettings({ fbPageId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-slate-700"
                  placeholder="VD: 10123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Instagram Account ID</label>
                <input
                  type="text"
                  value={igAccountId}
                  onChange={(e) => updateSettings({ igAccountId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-slate-700"
                  placeholder="VD: 17841400000000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Facebook Access Token</label>
                <input
                  type="password"
                  value={fbToken}
                  onChange={(e) => updateSettings({ fbToken: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-slate-700"
                  placeholder="EAA..."
                />
                <p className="text-xs text-slate-500 mt-2">
                  Token này sẽ được gửi kèm payload đến n8n để n8n thực hiện đăng bài.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
