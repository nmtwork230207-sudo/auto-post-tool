import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { LayoutDashboard, PenSquare, Settings as SettingsIcon, Zap, Clock, RefreshCw } from 'lucide-react';
import CreatePost from './components/CreatePost';
import AutoPost from './components/AutoPost';
import Settings from './components/Settings';
import Queue from './components/Queue';
import { useStore } from './store';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const { queue, updateQueueItem, n8nWebhookUrl, fbPageId, fbToken, igAccountId, logout } = useStore();

  // Global Queue Processor
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentQueue = useStore.getState().queue;
      
      (currentQueue || []).forEach(async (item) => {
        if (item.status === 'pending') {
          // Mark as processing
          updateQueueItem(item.id, { status: 'processing' });
          
          try {
            if (!n8nWebhookUrl) {
              console.error('Webhook URL is not configured.');
              updateQueueItem(item.id, { status: 'cancelled' });
              return;
            }

            const isGroupMode = item.type === 'auto' && item.postMode === 'group';
            const finalContent = isGroupMode && item.generatedPosts ? item.generatedPosts[0].content : item.content;

            const payload = {
              action: 'create_post',
              images: item.images,
              content: finalContent,
              platforms: item.platforms,
              scheduleTime: new Date(item.scheduleTime).toISOString(), // Send exact time to n8n
              fbPageId,
              fbToken,
              igAccountId
            };
            
            const response = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
              throw new Error(`Webhook failed with status ${response.status} ${response.statusText}`);
            }
            
            updateQueueItem(item.id, { status: 'published' });
          } catch (error) {
            console.error('Webhook error:', error);
            toast.error('Lỗi kết nối Webhook trong Hàng đợi. Vui lòng bật "Respond to CORS" trong n8n.');
            updateQueueItem(item.id, { status: 'cancelled' }); // Mark failed as cancelled
          }
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
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Zap className="w-6 h-6 text-indigo-400 fill-indigo-400" />
            NMT TOOL PRO
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <PenSquare className="w-5 h-5" />
            Tạo bài đăng
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'auto'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Đăng bài tự động
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'queue'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              Đang chờ
            </div>
            {pendingCount > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'queue' ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Cài đặt (Settings)
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => {
              logout();
              toast.success('Đã đăng xuất!');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 font-medium border border-slate-700/50"
          >
            <RefreshCw className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="max-w-6xl mx-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
