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
  const { queue, updateQueueItem, n8nWebhookUrl, logout } = useStore();

  // Global Queue Processor
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentQueue = useStore.getState().queue;
      
      (currentQueue || []).forEach(async (item) => {
        if (item.status === 'pending' && item.scheduleTime <= now) {
          // Mark as processing
          updateQueueItem(item.id, { status: 'processing' });
          
          try {
            if (n8nWebhookUrl) {
              const payload = {
                action: item.type === 'create' ? 'create_post' : 'auto_post_batch',
                images: item.images,
                content: item.content,
                generatedPosts: item.generatedPosts,
                postMode: item.postMode,
                platforms: item.platforms,
                schedule: 'now', // Executing now
              };
              
              await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
            }
            updateQueueItem(item.id, { status: 'published' });
          } catch (error) {
            console.error('Webhook error:', error);
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
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <Zap className="w-6 h-6 fill-indigo-600" />
            NMT TOOL PRO
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'create'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PenSquare className="w-5 h-5" />
            Tạo bài đăng
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'auto'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Đăng bài tự động
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'queue'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              Đang chờ
            </div>
            {pendingCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'settings'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Cài đặt (Settings)
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn đăng xuất và xóa tất cả dữ liệu không?')) {
                logout();
                toast.success('Đã đăng xuất!');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
