import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedPost {
  id: string;
  image: string;
  content: string;
}

export interface QueueItem {
  id: string;
  type: 'create' | 'auto';
  images: string[];
  content?: string;
  generatedPosts?: GeneratedPost[];
  postMode?: 'single' | 'group';
  platforms: { fb: boolean; ig: boolean };
  scheduleTime: number;
  intervalTime?: number;
  postsPerInterval?: number;
  status: 'pending' | 'processing' | 'published' | 'cancelled';
}

export interface AppState {
  // Settings
  shopInfo: {
    name: string;
    phone: string;
    address: string;
    hashtags: string;
  };
  n8nWebhookUrl: string;
  fbPageId: string;
  fbToken: string;
  igAccountId: string;
  geminiApiKey: string;
  geminiModel: string;

  // Create Post Draft
  createPostDraft: {
    images: string[]; // base64
    mode: 'manual' | 'auto';
    manualPrice: string;
    manualDesc: string;
    platforms: { fb: boolean; ig: boolean };
    scheduleMode: 'now' | 'once' | 'auto';
    scheduleTime: string;
    postsPerDay: number;
    timeSlots: string[];
    style: string;
    generatedContent: string;
    showPreviewImage: boolean;
  };

  // Auto Post Draft
  autoPostDraft: {
    images: string[];
    postMode: 'single' | 'group';
    scheduleMode: 'now' | 'once' | 'auto';
    scheduleTime: string;
    postsPerDay: number;
    timeSlots: string[];
    intervalTime: number; // in minutes
    postsPerInterval: number;
    answerStructure: string;
    style: string;
    platforms: { fb: boolean; ig: boolean };
    generatedPosts: GeneratedPost[];
    showPreviewImage: boolean;
  };

  // Queue
  queue: QueueItem[];

  updateSettings: (settings: Partial<AppState>) => void;
  updateCreatePost: (data: Partial<AppState['createPostDraft']>) => void;
  updateAutoPost: (data: Partial<AppState['autoPostDraft']>) => void;
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, data: Partial<QueueItem>) => void;
  resetDrafts: () => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      shopInfo: {
        name: '',
        phone: '',
        address: '',
        hashtags: '',
      },
      n8nWebhookUrl: '',
      fbPageId: '',
      fbToken: '',
      igAccountId: '',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',

      createPostDraft: {
        images: [],
        mode: 'manual',
        manualPrice: '',
        manualDesc: '',
        platforms: { fb: true, ig: false },
        scheduleMode: 'now',
        scheduleTime: '',
        postsPerDay: 2,
        timeSlots: ['09:00', '15:00'],
        style: 'professional',
        generatedContent: '',
        showPreviewImage: true,
      },

      autoPostDraft: {
        images: [],
        postMode: 'group',
        scheduleMode: 'auto',
        scheduleTime: '',
        postsPerDay: 2,
        timeSlots: ['09:00', '15:00'],
        intervalTime: 60,
        postsPerInterval: 1,
        answerStructure: 'Viết một bài đăng hấp dẫn cho sản phẩm này. Nêu bật 3 ưu điểm và thêm Call-to-action.',
        style: 'professional',
        platforms: { fb: true, ig: false },
        generatedPosts: [],
        showPreviewImage: true,
      },

      queue: [],

      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      updateCreatePost: (data) =>
        set((state) => ({
          createPostDraft: { ...state.createPostDraft, ...data },
        })),
      updateAutoPost: (data) =>
        set((state) => ({
          autoPostDraft: { ...state.autoPostDraft, ...data },
        })),
      addToQueue: (item) =>
        set((state) => ({ queue: [...state.queue, item] })),
      removeFromQueue: (id) =>
        set((state) => ({ queue: state.queue.filter((q) => q.id !== id) })),
      updateQueueItem: (id, data) =>
        set((state) => ({
          queue: state.queue.map((q) => (q.id === id ? { ...q, ...data } : q)),
        })),
      resetDrafts: () =>
        set((state) => ({
          createPostDraft: {
            images: [],
            mode: 'manual',
            manualPrice: '',
            manualDesc: '',
            platforms: { fb: true, ig: false },
            scheduleMode: 'now',
            scheduleTime: '',
            postsPerDay: 2,
            timeSlots: ['09:00', '15:00'],
            style: 'professional',
            generatedContent: '',
            showPreviewImage: true,
          },
          autoPostDraft: {
            images: [],
            postMode: 'group',
            scheduleMode: 'auto',
            scheduleTime: '',
            postsPerDay: 2,
            timeSlots: ['09:00', '15:00'],
            intervalTime: 60,
            postsPerInterval: 1,
            answerStructure: 'Viết một bài đăng hấp dẫn cho sản phẩm này. Nêu bật 3 ưu điểm và thêm Call-to-action.',
            style: 'professional',
            platforms: { fb: true, ig: false },
            generatedPosts: [],
            showPreviewImage: true,
          },
        })),
      logout: () =>
        set(() => ({
          shopInfo: { name: '', phone: '', address: '', hashtags: '' },
          n8nWebhookUrl: '',
          fbPageId: '',
          fbToken: '',
          igAccountId: '',
          createPostDraft: {
            images: [],
            mode: 'manual',
            manualPrice: '',
            manualDesc: '',
            platforms: { fb: true, ig: false },
            scheduleMode: 'now',
            scheduleTime: '',
            postsPerDay: 2,
            timeSlots: ['09:00', '15:00'],
            style: 'professional',
            generatedContent: '',
            showPreviewImage: true,
          },
          autoPostDraft: {
            images: [],
            postMode: 'group',
            scheduleMode: 'auto',
            scheduleTime: '',
            postsPerDay: 2,
            timeSlots: ['09:00', '15:00'],
            intervalTime: 60,
            postsPerInterval: 1,
            answerStructure: 'Viết một bài đăng hấp dẫn cho sản phẩm này. Nêu bật 3 ưu điểm và thêm Call-to-action.',
            style: 'professional',
            platforms: { fb: true, ig: false },
            generatedPosts: [],
            showPreviewImage: true,
          },
          queue: [],
        })),
    }),
    {
      name: 'social-post-storage',
    }
  )
);
