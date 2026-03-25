import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { LayoutDashboard, PenSquare, Settings as SettingsIcon, Zap, Clock, RefreshCw } from 'lucide-react';
import CreatePost from './components/CreatePost';
import AutoPost from './components/AutoPost';
import Settings from './components/Settings';
import Queue from './components/Queue';
import { useStore } from './store';
import { uploadImagesToImgBB } from './utils/uploadImages';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const { queue, updateQueueItem, n8nWebhookUrl, fbPageId, fbToken, igAccountId, logout } = useStore();

  // Global Queue Processor
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const state = useStore.getState();
      const currentQueue = state.queue;
      
      (currentQueue || []).forEach(async (item) => {
        // 1. Send to n8n immediately if not sent yet
        if (item.status === 'pending' && !item.sentToN8n && !item.isSending) {
          updateQueueItem(item.id, { isSending: true });
          
          try {
            if (!state.n8nWebhookUrl) {
              console.error('Webhook URL is not configured.');
              updateQueueItem(item.id, { status: 'cancelled', isSending: false });
              return;
            }

            // Upload images to ImgBB if they are base64
            let imageUrls = item.images;
            const needsUpload = imageUrls.some(img => !img.startsWith('http'));
            if (needsUpload) {
              try {
                imageUrls = await uploadImagesToImgBB(imageUrls);
                // Update queue item with new URLs so we don't re-upload if n8n fails
                updateQueueItem(item.id, { images: imageUrls });
              } catch (uploadError) {
                console.error('ImgBB upload error:', uploadError);
                toast.error('Lỗi upload ảnh lên ImgBB.');
                updateQueueItem(item.id, { status: 'cancelled', isSending: false });
                return;
              }
            }

            const isGroupMode = item.type === 'auto' && item.postMode === 'group';
            const finalContent = isGroupMode && item.generatedPosts ? item.generatedPosts[0].content : item.content;

            const payload = {
              action: 'create_post',
              images: imageUrls,
              content: finalContent,
              platforms: item.platforms,
              scheduleTime: new Date(item.scheduleTime).toISOString(), // Send exact time to n8n
              fbPageId: state.fbPageId,
              fbToken: state.fbToken,
              igAccountId: state.igAccountId
            };
            
            const response = await fetch(state.n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
              throw new Error(`Webhook failed with status ${response.status} ${response.statusText}`);
            }
            
            updateQueueItem(item.id, { sentToN8n: true, isSending: false });
            // Optional: toast.success('Đã chuyển lịch đăng sang n8n!');
          } catch (error) {
            console.error('Webhook error:', error);
            toast.error('Lỗi kết nối Webhook. Vui lòng kiểm tra lại n8n.');
            updateQueueItem(item.id, { status: 'cancelled', isSending: false });
          }
        }

        // 2. Virtual Countdown: Move to published when time is reached
        if (item.status === 'pending' && item.sentToN8n && now >= item.scheduleTime) {
          updateQueueItem(item.id, { status: 'published' });
          toast.success('Đã đến giờ đăng bài!');
        }
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [n8nWebhookUrl, updateQueueItem]);

  const pendingCount = (queue || []).filter(q => q.status === 'pending').length;

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreatePost />;
      case 'auto':
        return <AutoPost />;
      case 'queue':
        return <Queue />;
      case 'settings':
        return <Settings />;
      default:
        return <CreatePost />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800/50">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
            NMT TOOL PRO
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <PenSquare className="w-5 h-5" />
            Tạo bài đăng
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'auto'
                ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Đăng bài tự động
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              Đang chờ
            </div>
            {pendingCount > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'queue' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Cài đặt (Settings)
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={() => {
              logout();
              toast.success('Đã đăng xuất!');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/30 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-all duration-200 font-medium border border-slate-700/30"
          >
            <RefreshCw className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
