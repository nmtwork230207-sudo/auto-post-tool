import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Clock, Facebook, Instagram, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Save, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

function QueueItem({ item, now, updateQueueItem, removeFromQueue }: any) {
  const [expanded, setExpanded] = useState(false);
  const [editedContent, setEditedContent] = useState(item.content || '');
  const [editedGeneratedPosts, setEditedGeneratedPosts] = useState(item.generatedPosts || []);

  const formatCountdown = (targetTime: number) => {
    const diff = targetTime - now;
    if (diff <= 0) return '00:00:00';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (d > 0) {
      return `${d} ngày ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
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
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col transition-all hover:shadow-md hover:border-slate-300">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex -space-x-3">
          {(item.images || []).slice(0, 3).map((img: string, idx: number) => (
            <img key={idx} src={img} alt="Preview" className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm" />
          ))}
          {(item.images || []).length > 3 && (
            <div className="w-16 h-16 rounded-lg bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-sm font-medium text-slate-600 z-10">
              +{(item.images || []).length - 3}
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider rounded-md">
              {item.type === 'create' ? 'Bài đăng đơn' : 'Chiến dịch tự động'}
            </span>
            <div className="flex gap-1.5">
              {item.platforms?.fb && <Facebook className="w-4 h-4 text-blue-600" />}
              {item.platforms?.ig && <Instagram className="w-4 h-4 text-pink-600" />}
            </div>
          </div>
          
          {item.type === 'create' ? (
            <p className="text-sm text-slate-600 line-clamp-2 mt-2 leading-relaxed">{item.content}</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <p className="text-sm text-slate-800 font-medium">
                Chiến dịch gồm {item.generatedPosts?.length || 0} bài đăng
                {item.postMode === 'single' && item.intervalTime && <span className="text-slate-500 font-normal"> (Cách nhau {item.intervalTime} phút)</span>}
              </p>
              {item.generatedPosts && (item.generatedPosts || []).length > 0 && (
                <p className="text-xs text-slate-500 line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                  "{item.generatedPosts[0].content}"
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto min-w-[120px]">
          {item.status === 'pending' && (
            <>
              <div className="text-2xl font-mono font-bold text-blue-600 tracking-tight">
                {formatCountdown(item.scheduleTime)}
              </div>
              <div className="flex gap-2">
                {!item.sentToN8n && (
                  <button 
                    onClick={() => updateQueueItem(item.id, { status: 'cancelled' })}
                    className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-3 py-1.5 rounded-lg transition-all hover:bg-amber-100"
                  >
                    <XCircle className="w-4 h-4" /> Hủy đăng
                  </button>
                )}
                <button 
                  onClick={() => {
                    removeFromQueue(item.id);
                    toast.success('Đã xóa bài đăng!');
                  }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg transition-all hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </div>
              {item.sentToN8n && (
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" /> Đã đồng bộ n8n
                </div>
              )}
            </>
          )}
          {item.status === 'processing' && (
            <div className="flex items-center gap-2 text-amber-500 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...
            </div>
          )}
          {item.status === 'published' && (
            <div className="flex flex-col items-end gap-2">
              <div className="text-sm font-medium text-slate-500">
                Lịch: {new Date(item.scheduleTime).toLocaleString('vi-VN')}
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" /> Đã chuyển n8n
                </div>
                <button 
                  onClick={() => {
                    removeFromQueue(item.id);
                    toast.success('Đã xóa bài đăng!');
                  }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg transition-all hover:bg-red-100"
                  title="Xóa khỏi lịch sử"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {item.status === 'cancelled' && (
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <XCircle className="w-5 h-5" /> Đã hủy
              </div>
              <button 
                onClick={() => {
                  updateQueueItem(item.id, { status: 'pending', scheduleTime: Date.now() });
                  toast.success('Đã xếp hàng lại!');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-all hover:bg-blue-100"
                title="Thử lại"
              >
                <RefreshCw className="w-4 h-4" /> Thử lại
              </button>
              <button 
                onClick={() => {
                  removeFromQueue(item.id);
                  toast.success('Đã xóa bài đăng!');
                }}
                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg transition-all hover:bg-red-100"
                title="Xóa khỏi lịch sử"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium mt-1 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-4 h-4" /> Thu gọn</> : <><ChevronDown className="w-4 h-4" /> Xem thêm</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-slate-800">Nội dung chi tiết</h4>
            {!item.sentToN8n && (
              <button 
                onClick={handleSave}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/20 font-medium"
              >
                <Save className="w-4 h-4" /> Lưu thay đổi
              </button>
            )}
          </div>
          
          {item.type === 'create' ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              disabled={item.sentToN8n}
              className={`w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none text-[15px] leading-relaxed text-slate-700 transition-all custom-scrollbar ${item.sentToN8n ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder="Nội dung bài đăng..."
            />
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {editedGeneratedPosts.map((post: any, idx: number) => (
                <div key={post.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex gap-4 transition-all hover:border-slate-300">
                  <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                    <img src={post.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Bài {idx + 1}</div>
                    <textarea
                      value={post.content}
                      onChange={(e) => {
                        const newPosts = [...editedGeneratedPosts];
                        newPosts[idx].content = e.target.value;
                        setEditedGeneratedPosts(newPosts);
                      }}
                      disabled={item.sentToN8n}
                      className={`w-full h-28 text-[13px] leading-relaxed bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none custom-scrollbar text-slate-700 ${item.sentToN8n ? 'opacity-70 cursor-not-allowed' : ''}`}
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
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Đang chờ & Lịch sử</h2>
        <p className="text-slate-500 mt-2 text-sm">Quản lý các bài đăng đã lên lịch và xem trạng thái countdown.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3.5 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Đang chờ ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3.5 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Lịch sử ({historyItems.length})
        </button>
      </div>

      <div className="space-y-4">
        {displayItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
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
