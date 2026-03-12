import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Clock, Facebook, Instagram, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

function QueueItem({ item, now, updateQueueItem, removeFromQueue }: any) {
  const [expanded, setExpanded] = useState(false);
  const [editedContent, setEditedContent] = useState(item.content || '');
  const [editedGeneratedPosts, setEditedGeneratedPosts] = useState(item.generatedPosts || []);

  const formatCountdown = (targetTime: number) => {
    const diff = targetTime - now;
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (item.type === 'create') {
      updateQueueItem(item.id, { content: editedContent });
    } else {
      updateQueueItem(item.id, { generatedPosts: editedGeneratedPosts });
    }
    toast.success('Đã lưu thay đổi!');
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col transition-all">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex -space-x-3">
          {(item.images || []).slice(0, 3).map((img: string, idx: number) => (
            <img key={idx} src={img} alt="Preview" className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm" />
          ))}
          {(item.images || []).length > 3 && (
            <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-sm font-medium text-gray-600 z-10">
              +{(item.images || []).length - 3}
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md">
              {item.type === 'create' ? 'Bài đăng đơn' : 'Chiến dịch tự động'}
            </span>
            <div className="flex gap-1">
              {item.platforms?.fb && <Facebook className="w-4 h-4 text-blue-600" />}
              {item.platforms?.ig && <Instagram className="w-4 h-4 text-pink-600" />}
            </div>
          </div>
          
          {item.type === 'create' ? (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">{item.content}</p>
          ) : (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-800 font-medium">
                Chiến dịch gồm {item.generatedPosts?.length || 0} bài đăng
                {item.postMode === 'single' && item.intervalTime && ` (Cách nhau ${item.intervalTime} phút)`}
              </p>
              {item.generatedPosts && (item.generatedPosts || []).length > 0 && (
                <p className="text-xs text-gray-500 line-clamp-1 italic">
                  "{item.generatedPosts[0].content}"
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto min-w-[120px]">
          {item.status === 'pending' && (
            <>
              <div className="text-2xl font-mono font-bold text-indigo-600">
                {formatCountdown(item.scheduleTime)}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => updateQueueItem(item.id, { status: 'cancelled' })}
                  className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Hủy đăng
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) {
                      removeFromQueue(item.id);
                      toast.success('Đã xóa bài đăng!');
                    }
                  }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </div>
            </>
          )}
          {item.status === 'processing' && (
            <div className="flex items-center gap-2 text-amber-500 font-medium bg-amber-50 px-3 py-1.5 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...
            </div>
          )}
          {item.status === 'published' && (
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-emerald-500 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-5 h-5" /> Đã đăng
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa lịch sử bài đăng này?')) {
                    removeFromQueue(item.id);
                    toast.success('Đã xóa bài đăng!');
                  }
                }}
                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                title="Xóa khỏi lịch sử"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          {item.status === 'cancelled' && (
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-lg">
                <XCircle className="w-5 h-5" /> Đã hủy
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa lịch sử bài đăng này?')) {
                    removeFromQueue(item.id);
                    toast.success('Đã xóa bài đăng!');
                  }
                }}
                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                title="Xóa khỏi lịch sử"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium mt-1"
          >
            {expanded ? <><ChevronUp className="w-4 h-4" /> Thu gọn</> : <><ChevronDown className="w-4 h-4" /> Xem thêm</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-800">Nội dung chi tiết</h4>
            <button 
              onClick={handleSave}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1 transition-colors"
            >
              <Save className="w-4 h-4" /> Lưu thay đổi
            </button>
          </div>
          
          {item.type === 'create' ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-40 p-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 resize-none text-sm"
              placeholder="Nội dung bài đăng..."
            />
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {editedGeneratedPosts.map((post: any, idx: number) => (
                <div key={post.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex gap-4">
                  <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-gray-200">
                    <img src={post.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-500 mb-1">Bài {idx + 1}</div>
                    <textarea
                      value={post.content}
                      onChange={(e) => {
                        const newPosts = [...editedGeneratedPosts];
                        newPosts[idx].content = e.target.value;
                        setEditedGeneratedPosts(newPosts);
                      }}
                      className="w-full h-24 text-sm bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Queue() {
  const { queue, updateQueueItem, removeFromQueue } = useStore();
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pendingItems = (queue || []).filter(item => item.status === 'pending' || item.status === 'processing');
  const historyItems = (queue || []).filter(item => item.status === 'published' || item.status === 'cancelled');

  const displayItems = activeTab === 'pending' ? pendingItems : historyItems;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Đang chờ & Lịch sử</h2>
        <p className="text-gray-500 mt-2">Quản lý các bài đăng đã lên lịch và xem trạng thái countdown.</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Đang chờ ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Lịch sử ({historyItems.length})
        </button>
      </div>

      <div className="space-y-4">
        {displayItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {activeTab === 'pending' ? 'Chưa có bài đăng nào trong hàng đợi.' : 'Chưa có lịch sử bài đăng.'}
            </p>
          </div>
        ) : (
          displayItems.slice().reverse().map(item => (
            <QueueItem key={item.id} item={item} now={now} updateQueueItem={updateQueueItem} removeFromQueue={removeFromQueue} />
          ))
        )}
      </div>
    </div>
  );
}
