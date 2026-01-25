import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch, deleteDoc, getDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  LayoutDashboard, Users, CheckSquare, Plus, ArrowRight, AlertTriangle, 
  CheckCircle2, Circle, UserCircle, Activity, FileText,
  RotateCcw, Hourglass, Lock, Trash2, Save, X, Zap,
  Briefcase, History, ArrowUpRight, Layers,
  BarChart3, AlertCircle, Loader2, ChevronDown, ChevronUp,
  ScrollText, Globe, Flag, Calendar, Bomb, Unlock, Camera, RefreshCw, Radio, Target, Share2
} from 'lucide-react';

// --- Firebase Config & Init ---
const firebaseConfig = {
  apiKey: "AIzaSyBobE0USzMg0_0nK6h34OoOi1N159ZrDlw",
  authDomain: "sinovalink.firebaseapp.com",
  projectId: "sinovalink",
  storageBucket: "sinovalink.firebasestorage.app",
  messagingSenderId: "535670397178",
  appId: "1:535670397178:web:24caa2e735644621419143"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- CONSTANTS ---
const ROLES = ['FOUNDER', 'XJ', 'ST', 'TC', 'QH', 'LE', 'ZC', 'ALL'];

// --- WORKFLOW TEMPLATE (V38.8 Campaign DNA) ---
const WORKFLOW_TEMPLATE = [
  // Launch
  { code: 'L-01', name: '确认签约', role: 'XJ', phase: '签约启动', desc: '看板客户卡片建立', type: 'once' },
  { code: 'L-02', name: '合同收集', role: 'ST', phase: '签约启动', desc: '建立Excel/发票/归档', prev: 'L-01', type: 'once' },
  { code: 'L-03', name: '建立工作空间', role: 'TC', phase: '签约启动', desc: '拉群/建文件夹', prev: 'L-01', type: 'once' },
  { code: 'L-04', name: '客户资料归档', role: 'TC', phase: '签约启动', desc: '资料清单入云盘', prev: 'L-03', type: 'once' },
  
  // Market Targeting
  { code: 'MT-01', name: 'AI市场初筛', role: 'TC', phase: '市场定位', desc: '输出初筛报告', prev: 'L-04', type: 'once' },
  { code: 'MT-02', name: '会前准备', role: 'XJ', phase: '市场定位', desc: '会议资料', prev: 'MT-01', type: 'once' },
  { code: 'MT-03', name: '战略决策会', role: 'QH', phase: '市场定位', desc: '召开会议', prev: 'MT-02', type: 'once' },
  { code: 'MT-03.5', name: '登记主攻国', role: 'QH', phase: '市场定位', desc: '输入确认后的国家，更新系统', prev: 'MT-03', type: 'once' },
  { code: 'MT-04', name: '目标国深度调研', role: 'TC', phase: '市场定位', desc: '深度报告', prev: 'MT-03.5', type: 'once' },
  
  // Penetration Prep (Trigger Chain)
  { code: 'MP-PRE-01', name: '企业穿刺', role: 'TC', phase: '市场渗透', desc: '基于调研整理Top企业名单', prev: 'MT-04', type: 'once' },
  { code: 'MP-PRE-02', name: '穿刺联系方式', role: 'ST', phase: '市场渗透', desc: '完善客户数据表', prev: 'MP-PRE-01', type: 'once' },
  
  // Localization
  { code: 'LB-01', name: '品牌小广告', role: 'XJ', phase: '在地化基建', desc: '输出小卡片', prev: 'MT-03.5', type: 'once' },
  { code: 'LB-02', name: '品牌改造方案', role: 'XJ', phase: '在地化基建', desc: '解决方案文档', prev: 'MT-04', type: 'once' },
  { code: 'LB-02-REVIEW', name: '方案审核', role: 'QH', phase: '在地化基建', desc: '通过或驳回', prev: 'LB-02', type: 'once' },
  { code: 'LB-02-FINAL', name: '方案定稿', role: 'XJ', phase: '在地化基建', desc: '添加PPT动效，最终定稿', prev: 'LB-02-REVIEW', type: 'once' },
  { code: 'LB-02-TRANS', name: '方案英化翻译', role: 'ZC', phase: '在地化基建', desc: '翻译方案', prev: 'LB-02-FINAL', type: 'once' },
  { code: 'LB-04', name: '卫星站点搭建', role: 'XJ', phase: '在地化基建', desc: '上线站点链接&SEO', prev: 'LB-02-FINAL', type: 'once' },
  { code: 'LB-06', name: '宣传视频制作', role: 'LE', phase: '在地化基建', desc: '数字人视频x2', prev: 'LB-02-FINAL', type: 'once' },
  { code: 'LB-07', name: '素材转化', role: 'ZC', phase: '在地化基建', desc: '社媒内容库初始化', prev: 'LB-02-FINAL', type: 'once' },
  
  // Internal/Ops
  { code: 'INT-WEB-WRITING', name: '白皮书/GEO文章', role: 'ZC', phase: '内部建设', desc: '撰写内容', type: 'once', prev: 'MT-04' },
];

// --- Helper Functions for Dates ---
const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  date.setDate(diff);
  date.setHours(0,0,0,0);
  return date;
};

const getStartOfMonth = (d) => {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0,0,0,0);
  return date;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('XJ');
  const [activeTab, setActiveTab] = useState('my-tasks');
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [processingTasks, setProcessingTasks] = useState({});
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClientName, setNewClientName] = useState('');
  const [newClientDate, setNewClientDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Modals
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [countryModal, setCountryModal] = useState({ show: false, task: null, country: '' });
  const [ropeModal, setRopeModal] = useState({ show: false, task: null, date: '', time: '18:00' });
  const [distModal, setDistModal] = useState({ show: false, task: null, quotas: { TC:0, ST:0, LE:0, ZC:0, XJ:0 } });
  const [quotaModal, setQuotaModal] = useState({ show: false, task: null, addValue: '' });
  
  const [manualModal, setManualModal] = useState({ 
    show: false, 
    type: 'simple', 
    name: '', 
    quotas: { TC:0, ST:0, LE:0, ZC:0, XJ:0 }, 
    date: '', 
    time: '',
    clientId: '' 
  });

  const [toast, setToast] = useState(null);

  // --- INIT & SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubTasks = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTasks(data);
        setLoading(false);
      },
      (error) => console.error("Tasks listener error:", error)
    );

    const unsubClients = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'clients'), 
      (snap) => {
        const clientList = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); 
        
        setClients(clientList);

        clientList.forEach(client => {
          const lastSync = client.lastSyncDate?.seconds 
            ? new Date(client.lastSyncDate.seconds * 1000) 
            : (client.createdAt?.seconds ? new Date(client.createdAt.seconds * 1000) : new Date());
            
          const now = new Date();
          const daysDiff = (now - lastSync) / (1000 * 60 * 60 * 24);

          if (daysDiff >= 14) {
            const hasPendingSync = tasks.some(t => t.clientId === client.id && t.code === 'SYNC-REPORT' && t.status !== 'completed');
            if (!hasPendingSync && user.uid && (currentRole === 'QH' || currentRole === 'FOUNDER')) { 
               generateSyncReport(client, lastSync); 
            }
          }
        });
      },
      (error) => console.error("Clients listener error:", error)
    );

    return () => { unsubTasks(); unsubClients(); };
  }, [user]);

  // --- NEW: Global Task Generator for ZC ---
  useEffect(() => {
    if (!user || loading) return;
    
    if (['ZC', 'FOUNDER', 'ALL'].includes(currentRole)) {
        const hasGlobalSocial = tasks.some(t => t.id === 'GLOBAL-OP-SOCIAL');
        if (!hasGlobalSocial) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', 'GLOBAL-OP-SOCIAL'), {
                code: 'OP-SOCIAL',
                name: '社媒矩阵运营',
                role: 'ZC',
                phase: '市场渗透',
                desc: '矩阵日历自动生成中...',
                clientId: 'GLOBAL',
                clientName: 'SINOVA 全局',
                status: 'pending',
                isReady: true,
                createdAt: serverTimestamp(),
                burningDeadline: null,
                type: 'daily' 
            });
        }
    }
  }, [tasks, user, loading, currentRole]);

  // --- BOMB STATISTICS ---
  const bombStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startOfMonth = getStartOfMonth(now);
    
    let weekly = 0;
    let monthly = 0;

    tasks.forEach(task => {
        if (currentRole !== 'ALL' && currentRole !== 'FOUNDER' && task.role !== currentRole) return;
        if (!task.burningDeadline?.seconds) return;
        
        const deadline = new Date(task.burningDeadline.seconds * 1000);
        const completedAt = task.completedAt?.seconds ? new Date(task.completedAt.seconds * 1000) : null;
        const isCompleted = task.status === 'completed';

        let isBombed = false;
        if (isCompleted) {
            if (completedAt > deadline) isBombed = true;
        } else {
            if (now > deadline) isBombed = true;
        }

        if (isBombed) {
            if (deadline >= startOfWeek) weekly++;
            if (deadline >= startOfMonth) monthly++;
        }
    });

    return { weekly, monthly };
  }, [tasks, currentRole]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- LOGIC FUNCTIONS ---

  const generateSyncReport = async (client, lastSync) => {
    const completedTasks = tasks.filter(t => 
      t.clientId === client.id && 
      t.status === 'completed' && 
      t.completedAt?.seconds && 
      new Date(t.completedAt.seconds * 1000) > lastSync
    );
    
    const details = completedTasks.map(t => {
        const dateStr = new Date(t.completedAt.seconds * 1000).toLocaleDateString();
        return `• ${t.name} (${t.role} - ${dateStr})`;
    }).join('\n');

    const desc = details ? `请同步以下近期进展：\n${details}` : '近期无重大节点完成，请同步常规进度。';
    const taskId = `${client.id}-SYNC-${Date.now()}`;
    
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
       code: 'SYNC-REPORT', name: '双周进度同步', role: 'QH', phase: '全景管理',
       desc: desc, clientId: client.id, clientName: client.name,
       status: 'pending', isReady: true, createdAt: serverTimestamp(), burningDeadline: null, type: 'once'
    });
  };

  const getSocialDesc = (clientList) => {
    const now = new Date();
    const day = now.getDay(); 
    
    if (day === 2 || day === 4) return '🔥 今日重点：SINOVA 综合品牌宣传';
    
    if (day === 1 || day === 3 || day === 5) {
        const validClients = clientList.filter(c => c.status === 'active');
        if (validClients.length === 0) return '今日重点：暂无活跃客户';
        
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const count = validClients.length;
        const index = (dayOfYear * 3) % count; 
        
        let targets = [];
        for (let i = 0; i < 3; i++) {
            targets.push(validClients[(index + i) % count].name);
        }
        targets = [...new Set(targets)];
        
        return `🎯 今日重点：${targets.join('、')} (发布内容 + 同步分发)`;
    }
    
    return '☕️ 今日重点：日常维护 / 周末休整';
  };

  // --- ACTIONS ---

  const createClient = async () => {
    if (!newClientName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const clientId = `CLIENT-${Date.now()}`;
    const batch = writeBatch(db);
    const timestamp = serverTimestamp();
    const startDateObj = new Date(newClientDate);

    batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId), {
      name: newClientName,
      createdAt: timestamp,
      startDate: startDateObj, 
      status: 'active',
      currentRound: 1,
      lastSyncDate: timestamp
    });

    const starters = WORKFLOW_TEMPLATE.filter(t => !t.prev);
    starters.forEach(t => {
      const taskId = `${clientId}-${t.code}`;
      batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
        ...t, clientId, clientName: newClientName, status: 'pending', isReady: true,
        createdAt: timestamp, burningDeadline: null, logs: []
      });
    });

    await batch.commit();
    setNewClientName('');
    setShowNewClientModal(false);
    setIsSubmitting(false);
    showToast(`🚀 客户启动！`);
  };

  const setBurningRope = async () => {
    const { task, date, time } = ropeModal;
    if (!date || !time) return;
    const deadline = new Date(`${date}T${time}`);
    const batch = writeBatch(db);
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { burningDeadline: deadline });
    await batch.commit();
    setRopeModal({ show: false, task: null, date: '', time: '' });
    showToast('🔥 燃烧绳已点燃');
  };

  const triggerNextTasks = (completedTask, existingTasks, batch) => {
    const standardNext = WORKFLOW_TEMPLATE.filter(t => t.prev === completedTask.code);
    standardNext.forEach(nextT => {
       const taskId = `${completedTask.clientId}-${nextT.code}`;
       if (!existingTasks.find(t => t.code === nextT.code)) {
         batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
           ...nextT, clientId: completedTask.clientId, clientName: completedTask.clientName,
           status: 'pending', isReady: true, createdAt: serverTimestamp(),
           burningDeadline: null, logs: []
         });
       }
    });

    if (completedTask.code === 'LB-CEO') {
       const nextId = `${completedTask.clientId}-LB-CEO-AI`;
       batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', nextId), {
         code: 'LB-CEO-AI', name: '老板数字人宣传片', role: 'LE', phase: '在地化基建',
         desc: '制作老板数字人短视频', clientId: completedTask.clientId, clientName: completedTask.clientName,
         status: 'pending', isReady: true, createdAt: serverTimestamp(), burningDeadline: null, type: 'once'
       });
    }

    if (completedTask.code === 'MP-PRE-02') {
       const distId = `${completedTask.clientId}-MP-DIST`;
       batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', distId), {
         code: 'MP-DIST', name: '分配战役额度', role: 'QH', phase: '市场渗透',
         desc: '为 TC/ST/LE/ZC/XJ 分配触达指标', clientId: completedTask.clientId, clientName: completedTask.clientName,
         status: 'pending', isReady: true, createdAt: serverTimestamp(), burningDeadline: null, type: 'once'
       });
    }

    if (completedTask.code === 'INT-WEB-WRITING') {
       const uploadId = `${completedTask.clientId}-INT-WEB-UPLOAD`;
       batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', uploadId), {
         code: 'INT-WEB-UPLOAD', name: '官网上传更新', role: 'XJ', phase: '内部建设',
         desc: '上传 ZC 的最新产出至 SINOVA 官网', clientId: completedTask.clientId, clientName: completedTask.clientName,
         status: 'pending', isReady: true, createdAt: serverTimestamp(), burningDeadline: null, type: 'once'
       });
    }

    // --- FIX: CAMPAIGN TRIGGER LOGIC ---
    if (completedTask.code === 'MP-EXEC' || completedTask.code === 'MANUAL-EXEC') {
       const isCampaign = !!completedTask.campaignName;
       const campaignSuffix = isCampaign ? `-${completedTask.campaignName}` : '';
       // Unique ID to allow multiple campaigns
       const r2Id = `${completedTask.clientId}-N-LOOP-02-${completedTask.role}${campaignSuffix}`;
       
       const baseName = `第2轮：发送解决方案`;
       const taskName = isCampaign ? `${completedTask.campaignName} - ${baseName}` : baseName;

       const now = new Date();
       const unlockDate = new Date(now.setDate(now.getDate() + 14));
       
       batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', r2Id), {
         code: 'N-LOOP-02', 
         name: taskName, 
         role: completedTask.role, 
         phase: '静默激活', 
         desc: '发送《解决方案》',
         clientId: completedTask.clientId, 
         clientName: completedTask.clientName,
         status: 'waiting', 
         unlockAt: unlockDate, 
         isReady: true, 
         createdAt: serverTimestamp(), 
         burningDeadline: null, 
         type: 'once',
         campaignName: completedTask.campaignName || null // Propagate DNA
       });
    }

    // --- SILENT STREAM PROPAGATION ---
    const loopSteps = [
        { current: 'N-LOOP-02', next: 'N-LOOP-03', name: '第3轮：发送讲解视频', desc: '发送视频内容' },
        { current: 'N-LOOP-03', next: 'N-LOOP-04', name: '第4轮：发送白皮书', desc: '发送白皮书' },
    ];

    loopSteps.forEach(step => {
        if (completedTask.code === step.current) {
            const isCampaign = !!completedTask.campaignName;
            const campaignSuffix = isCampaign ? `-${completedTask.campaignName}` : '';
            const nextId = `${completedTask.clientId}-${step.next}-${completedTask.role}${campaignSuffix}`;
            
            const taskName = isCampaign ? `${completedTask.campaignName} - ${step.name}` : step.name;

            const now = new Date();
            const unlockDate = new Date(now.setDate(now.getDate() + 14));
            
            batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', nextId), {
                code: step.next, 
                name: taskName,
                role: completedTask.role, 
                phase: '静默激活', 
                desc: step.desc,
                clientId: completedTask.clientId, 
                clientName: completedTask.clientName,
                status: 'waiting', 
                unlockAt: unlockDate, 
                isReady: true, 
                createdAt: serverTimestamp(), 
                burningDeadline: null, 
                type: 'once',
                campaignName: completedTask.campaignName || null
            });
        }
    });

    if (completedTask.code === 'N-LOOP-04') {
       const isCampaign = !!completedTask.campaignName;
       const campaignSuffix = isCampaign ? `-${completedTask.campaignName}` : '';
       const reviewId = `${completedTask.clientId}-N-REVIEW${campaignSuffix}`;
       
       const baseName = '静默期复盘';
       const taskName = isCampaign ? `${completedTask.campaignName} - ${baseName}` : baseName;

       // Basic check against existing (simplified)
       // In real app, querying specifically for this ID is better, but here we trust set() to overwrite or logic flow
       batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', reviewId), {
         code: 'N-REVIEW', 
         name: taskName, 
         role: 'QH', 
         phase: '静默激活', 
         desc: '复盘各条线静默效果',
         clientId: completedTask.clientId, 
         clientName: completedTask.clientName,
         status: 'pending', 
         isReady: true, 
         createdAt: serverTimestamp(), 
         burningDeadline: null, 
         type: 'once',
         campaignName: completedTask.campaignName || null
       });
    }

    if (completedTask.code === 'N-REVIEW') {
       const isCampaign = !!completedTask.campaignName;
       const campaignSuffix = isCampaign ? `-${completedTask.campaignName}` : '';
       const baseName = `第5轮：最终全景激活`;
       const taskName = isCampaign ? `${completedTask.campaignName} - ${baseName}` : baseName;

       ['TC', 'ST', 'LE', 'ZC'].forEach(role => {
          const r5Id = `${completedTask.clientId}-N-LOOP-05-${role}${campaignSuffix}`;
          batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', r5Id), {
            code: 'N-LOOP-05', 
            name: taskName, 
            role: role, 
            phase: '静默激活', 
            desc: '发送全景方案',
            clientId: completedTask.clientId, 
            clientName: completedTask.clientName,
            status: 'pending', 
            isReady: true, 
            createdAt: serverTimestamp(), 
            burningDeadline: null, 
            type: 'once',
            campaignName: completedTask.campaignName || null
          });
       });
    }
  };

  const handleTaskAction = async (task, actionType, payload = null) => {
    setProcessingTasks(prev => ({ ...prev, [task.id]: true }));
    const batch = writeBatch(db);
    const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    const clientRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', task.clientId);

    try {
      if (actionType === 'undo') {
         batch.update(taskRef, { status: 'pending', completedAt: null });
         showToast('↩️ 任务已还原');
      }
     // --- START of new code (replace the block above) ---
      else if (task.id === 'GLOBAL-OP-SOCIAL') {
         const now = new Date();
         const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
         
         let nextBusinessDay = new Date(now);

         // If today is Friday (5), next task is on Monday (+3 days)
         if (day === 5) {
            nextBusinessDay.setDate(now.getDate() + 3);
         } 
         // If today is Saturday (6), next task is on Monday (+2 days)
         else if (day === 6) {
            nextBusinessDay.setDate(now.getDate() + 2);
         }
         // Otherwise, next task is tomorrow
         else {
            nextBusinessDay.setDate(now.getDate() + 1);
         }

         // Set the time for the next task's appearance and deadline
         const unlockTime = new Date(nextBusinessDay);
         unlockTime.setHours(4, 0, 0, 0); // Re-appear at 4 AM

         const deadlineTime = new Date(nextBusinessDay);
         deadlineTime.setHours(18, 0, 0, 0); // Deadline is 6 PM

         batch.update(taskRef, { 
             status: 'waiting', // Set to 'waiting' to hide it for today
             unlockAt: unlockTime,
             burningDeadline: deadlineTime,
             logs: [...(task.logs||[]), {text: `于 ${now.toLocaleString()} 完成`, at: now.toISOString()}]
         });
         showToast('✅ 今日社媒运营完成！下个工作日将自动重置。');
      }
// --- END of new code ---
      }
      else if (task.code === 'MT-03.5') {
         if (!payload) { setCountryModal({ show: true, task, country: '' }); setProcessingTasks(prev=>({...prev, [task.id]: false})); return; }
         const newName = `${task.clientName} - ${payload}`;
         batch.update(clientRef, { name: newName });
         batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
         const clientTasks = tasks.filter(t => t.clientId === task.clientId);
         triggerNextTasks({ ...task, clientName: newName }, clientTasks, batch);
      }
      else if (task.code === 'LB-02-REVIEW') {
         if (actionType === 'reject') {
            const lb02 = tasks.find(t => t.clientId === task.clientId && t.code === 'LB-02');
            if (lb02) batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', lb02.id), { status: 'pending', completedAt: null });
            batch.update(taskRef, { status: 'pending', logs: [...(task.logs||[]), {text: 'QH驳回方案', at: new Date().toISOString()}] });
         } else {
            batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
            const clientTasks = tasks.filter(t => t.clientId === task.clientId);
            triggerNextTasks(task, clientTasks, batch);
         }
      }
      else if (task.code === 'SYNC-REPORT') {
         batch.update(clientRef, { lastSyncDate: serverTimestamp() });
         batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
      }
      else if (task.output && task.code !== 'LB-CEO' && actionType !== 'force') {
         setConfirmModal({
            show: true,
            title: '归档确认',
            message: '⚠️ 此任务为交付节点，请确认已将文件上传至 NAS？',
            onConfirm: () => {
                handleTaskAction(task, 'force');
                setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
            }
         });
         setProcessingTasks(prev => ({ ...prev, [task.id]: false }));
         return; 
      }
      else if (task.code === 'MP-DIST') {
         if (!payload) { setDistModal({ show: true, task, quotas: { TC:0, ST:0, LE:0, ZC:0, XJ:0 } }); setProcessingTasks(prev=>({...prev, [task.id]: false})); return; }
         Object.entries(payload).forEach(([role, quota]) => {
            if (parseInt(quota) > 0) {
               const execId = `${task.clientId}-MP-EXEC-${role}-${Date.now()}`;
               batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', execId), {
                  code: 'MP-EXEC', name: `本轮触达 ${role}`, role: role, type: 'quota',
                  quotaTotal: parseInt(quota), quotaCurrent: 0,
                  clientId: task.clientId, clientName: task.clientName,
                  status: 'pending', isReady: true, createdAt: serverTimestamp(), burningDeadline: null
               });
            }
         });
         batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
      }
      else {
         batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
         const clientTasks = tasks.filter(t => t.clientId === task.clientId);
         triggerNextTasks(task, clientTasks, batch);
      }
      await batch.commit();
      if (actionType !== 'undo' && task.id !== 'GLOBAL-OP-SOCIAL') showToast('✅ 任务更新');
    } catch(e) { console.error(e); showToast('❌ 错误'); }
    finally { setProcessingTasks(prev => ({ ...prev, [task.id]: false })); setConfirmModal({show:false, title:'', message:'', onConfirm:null}); }
  };

  const updateQuota = async () => {
     const { task, addValue } = quotaModal;
     if (!addValue || isNaN(addValue)) return;
     const val = parseInt(addValue);
     const newCurrent = (task.quotaCurrent || 0) + val;
     const batch = writeBatch(db);
     const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
     batch.update(taskRef, { quotaCurrent: newCurrent });
     if (newCurrent >= task.quotaTotal) {
        batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
        const clientTasks = tasks.filter(t => t.clientId === task.clientId);
        triggerNextTasks(task, clientTasks, batch);
     }
     await batch.commit();
     setQuotaModal({ show: false, task: null, addValue: '' });
     showToast('📈 进度更新');
  };

  const manualTrigger = async (type, client) => {
     const batch = writeBatch(db);
     const timestamp = serverTimestamp();
     if (type === 'LB-CEO') {
        const taskId = `${client.id}-LB-CEO-${Date.now()}`;
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
           code: 'LB-CEO', name: '老板实拍视频', role: 'LE', type: 'once', 
           clientId: client.id, clientName: client.name, status: 'pending', isReady: true, createdAt: timestamp, burningDeadline: null
        });
     } else if (type === 'SAT-UPDATE') {
        const taskId = `${client.id}-SAT-UPDATE-${Date.now()}`;
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
           code: 'SAT-UPDATE', name: '私域内容更新', role: 'ZC', desc: `更新${client.name}卫星站的白皮书和GEO文章`,
           clientId: client.id, clientName: client.name, status: 'pending', isReady: true, createdAt: timestamp, burningDeadline: null
        });
     } else if (type === 'NEXT-ROUND') {
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id), { currentRound: (client.currentRound||1) + 1 });
        const taskId = `${client.id}-MP-PRE-01-R${(client.currentRound||1) + 1}`;
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
           code: 'MP-PRE-01', name: '企业穿刺 (新轮次)', role: 'TC', phase: '市场渗透', desc: '新一轮Top企业名单',
           clientId: client.id, clientName: client.name, status: 'pending', isReady: true, createdAt: timestamp, burningDeadline: null
        });
     }
     await batch.commit();
     showToast('🚀 指令已下达');
     setConfirmModal({show:false, title:'', message:'', onConfirm:null});
  };

  const handleManualSubmit = async () => {
     const { type, name, quotas, date, time, clientId } = manualModal;
     if (!name.trim()) return;

     const batch = writeBatch(db);
     const timestamp = serverTimestamp();
     let deadline = null;
     if (date && time) deadline = new Date(`${date}T${time}`);

     let targetClientId = 'MANUAL';
     let targetClientName = '临时任务';
     if (clientId) {
         const selectedClient = clients.find(c => c.id === clientId);
         if (selectedClient) {
             targetClientId = selectedClient.id;
             targetClientName = selectedClient.name;
         }
     }

     if (type === 'simple') {
        const taskId = `MANUAL-${Date.now()}`;
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
           name: name, role: currentRole, clientId: targetClientId, clientName: targetClientName, code: 'MANUAL',
           status: 'pending', isReady: true, createdAt: timestamp, burningDeadline: deadline, type: 'once'
        });
     } else {
        Object.entries(quotas).forEach(([role, val]) => {
           if (parseInt(val) > 0) {
              const execId = `MANUAL-EXEC-${role}-${Date.now()}`;
              batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', execId), {
                 code: 'MANUAL-EXEC', name: `${name} - ${role}`, role: role, type: 'quota',
                 quotaTotal: parseInt(val), quotaCurrent: 0,
                 clientId: targetClientId, clientName: targetClientName, 
                 status: 'pending', isReady: true, createdAt: timestamp, burningDeadline: deadline,
                 campaignName: name // FIX: Inject DNA
              });
           }
        });
     }

     await batch.commit();
     setManualModal({ show: false, type: 'simple', name: '', quotas: { TC:0, ST:0, LE:0, ZC:0, XJ:0 }, date: '', time: '', clientId: '' });
     showToast('🚀 任务已下达');
  };

  // --- RENDERING ---

  const renderBurningRope = (task) => {
     if (!task.burningDeadline) return <button onClick={() => setRopeModal({ show: true, task, date: '', time: '18:00' })} className="mt-2 w-full border-2 border-dashed border-slate-300 text-slate-400 text-xs py-1 rounded hover:border-orange-400 hover:text-orange-500 flex items-center justify-center gap-1"><Bomb size={12}/> 🔥 设定燃烧绳</button>;
     
     const deadline = task.burningDeadline.seconds ? new Date(task.burningDeadline.seconds * 1000) : new Date();
     const created = task.createdAt?.seconds ? new Date(task.createdAt.seconds * 1000) : new Date();
     
     const now = new Date();
     const total = deadline - created;
     const left = deadline - now;
     let pct = Math.max(0, (left / total) * 100);
     let color = 'bg-emerald-500';
     if (pct < 50) color = 'bg-yellow-500';
     if (pct < 20) color = 'bg-red-600';
     const isBombed = now > deadline && task.status !== 'completed';
     
     return (
        <div className="mt-2 w-full">
           <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>{isBombed ? '已炸裂' : '燃烧中'}</span>
              <span>{deadline.toLocaleDateString()}</span>
           </div>
           <div className="w-full h-2 bg-slate-100 rounded overflow-hidden relative">
              <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
           </div>
           {isBombed && <div className="absolute top-0 right-0 -mt-8 -mr-2 animate-bounce"><Bomb size={24} className="text-red-600 drop-shadow-lg"/></div>}
        </div>
     );
  };

  const renderTaskItem = (task) => {
    const isCompleted = task.status === 'completed';
    const deadline = task.burningDeadline?.seconds ? new Date(task.burningDeadline.seconds * 1000) : null;
    const completedAt = task.completedAt?.seconds ? new Date(task.completedAt.seconds * 1000) : null;
    
    const wasBombed = isCompleted && deadline && completedAt > deadline;
    const isActiveBombed = !isCompleted && deadline && new Date() > deadline;
    const isBombed = wasBombed || isActiveBombed;

    const isLocked = task.status === 'waiting' && task.unlockAt?.seconds && new Date() < new Date(task.unlockAt.seconds * 1000);
    const unlockDate = task.unlockAt?.seconds ? new Date(task.unlockAt.seconds * 1000) : null;
    
    const displayName = task.id === 'GLOBAL-OP-SOCIAL' ? getSocialDesc(clients) : task.name;
    const isGlobalSocial = task.id === 'GLOBAL-OP-SOCIAL';

    if (isLocked) {
       return (
          <div key={task.id} className="bg-slate-50 p-4 border border-slate-100 rounded-lg opacity-60 flex items-center gap-4 mb-2">
             <Lock size={16} className="text-slate-400"/>
             <div>
                <h3 className="text-sm font-bold text-slate-500">{task.name}</h3>
                <p className="text-xs text-slate-400">静默中... {unlockDate.toLocaleDateString()} 解锁</p>
             </div>
          </div>
       );
    }

    return (
      <div key={task.id} className={`p-4 border-b transition-all flex items-start gap-4 relative ${isBombed ? 'bg-red-50 border-red-200' : 'bg-white border-slate-50 hover:bg-slate-50'}`}>
        <div className="pt-1">
           {isCompleted ? (
              activeTab === 'history' ? 
              <button onClick={() => handleTaskAction(task, 'undo')} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-yellow-100 hover:text-yellow-600" title="撤销完成"><RotateCcw size={14}/></button>
              : <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckSquare size={16}/></div>
           ) : task.type === 'quota' ? (
              <div onClick={() => setQuotaModal({ show: true, task, addValue: '' })} className="cursor-pointer relative w-10 h-10 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-blue-600" strokeDasharray={100} strokeDashoffset={100 - ((task.quotaCurrent||0)/task.quotaTotal)*100} />
                 </svg>
                 <span className="absolute text-[8px] font-bold">{Math.round(((task.quotaCurrent||0)/task.quotaTotal)*100)}%</span>
              </div>
           ) : (
             <button onClick={() => handleTaskAction(task, 'complete')} disabled={processingTasks[task.id]} className="w-8 h-8 rounded-full border-2 border-slate-300 text-slate-300 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center">
               {processingTasks[task.id] ? <Loader2 className="animate-spin" size={14}/> : <CheckSquare size={16}/>}
             </button>
           )}
        </div>
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{task.clientName}</span>
             {isGlobalSocial && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1 rounded flex items-center"><Share2 size={8} className="mr-1"/> 矩阵同步</span>}
             {task.code === 'LB-02-REVIEW' && !isCompleted && <button onClick={()=>handleTaskAction(task, 'reject')} className="text-[10px] bg-red-100 text-red-600 px-1 rounded hover:bg-red-200">驳回</button>}
             {isBombed && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Bomb size={10}/> 炸弹</span>}
           </div>
           <h3 className={`font-bold text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
             {displayName}
           </h3>
           {task.code === 'SYNC-REPORT' ? (
             <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line bg-slate-50 p-2 rounded border border-slate-100">{task.desc}</div>
           ) : (
             <p className="text-xs text-slate-500 mt-0.5">{task.desc}</p>
           )}
           {task.type === 'quota' && <div className="text-xs font-mono mt-1 text-blue-600">{task.quotaCurrent} / {task.quotaTotal}</div>}
           {!isCompleted && renderBurningRope(task)}
           {isCompleted && completedAt && <div className="text-[10px] text-slate-400 mt-1">完成于: {completedAt.toLocaleString()}</div>}
        </div>
      </div>
    );
  };

  const renderGroupedTasks = (list) => {
    const groups = list.reduce((acc, t) => {
      const k = t.clientName || '其他';
      if(!acc[k]) acc[k] = [];
      acc[k].push(t);
      return acc;
    }, {});
    
    const sortedKeys = Object.keys(groups).sort((a,b) => {
        if(a === 'SINOVA 全局') return -1;
        if(b === 'SINOVA 全局') return 1;
        return 0;
    });

    return sortedKeys.map((name) => {
      const groupTasks = groups[name];
      const isExpanded = expandedGroups[name] ?? true; 
      return (
        <div key={name} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4 shadow-sm">
           <div onClick={() => setExpandedGroups(p => ({...p, [name]: !isExpanded}))} className="px-4 py-3 bg-slate-50 flex justify-between items-center cursor-pointer select-none">
              <div className="font-bold text-slate-700 flex items-center gap-2">
                 {isExpanded ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
                 {name}
                 <span className="text-xs font-normal text-slate-500 bg-white px-2 rounded-full border border-slate-200">{groupTasks.length}</span>
              </div>
           </div>
           {isExpanded && <div>{groupTasks.map(renderTaskItem)}</div>}
        </div>
      );
    });
  };

  const renderClientCard = (client) => {
     const startDate = client.startDate?.seconds 
       ? new Date(client.startDate.seconds * 1000) 
       : (client.createdAt?.seconds ? new Date(client.createdAt.seconds * 1000) : new Date());
     const weeks = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24 * 7));
     
     const clientTasks = tasks.filter(t => t.clientId === client.id);
     const activeTask = clientTasks.find(t => t.status === 'pending' || t.status === 'in-progress');
     const stage = activeTask ? activeTask.phase : '待机中';
     const isPrivUpdateStale = false; 

     return (
        <div key={client.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-start mb-4">
              <div>
                 <h3 className="font-bold text-lg flex items-center gap-2">{client.name}</h3>
                 <div className="flex gap-2 text-xs mt-1">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">入池第 {weeks} 周</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{stage}</span>
                 </div>
              </div>
              <button onClick={() => setConfirmModal({show:true, title:'拍摄老板', message:'生成LE任务？', onConfirm:()=>manualTrigger('LB-CEO', client)})} className="text-slate-400 hover:text-blue-600"><Camera size={18}/></button>
           </div>
           <div className="bg-slate-50 p-2 rounded mb-4 text-xs flex justify-between items-center">
              <span className="text-slate-500">上周炸弹</span>
              <span className="text-emerald-600 font-bold">✅ 表现良好</span>
           </div>
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmModal({show:true, title:'开启新轮', message:'Round+1 并触发企业穿刺？', onConfirm:()=>manualTrigger('NEXT-ROUND', client)})} disabled={currentRole!=='QH'} className="flex items-center justify-center gap-1 py-2 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200 disabled:opacity-50">
                 <RefreshCw size={12}/> 开启新轮
              </button>
              <button onClick={() => setConfirmModal({show:true, title:'私域更新', message:'触发ZC更新卫星站？', onConfirm:()=>manualTrigger('SAT-UPDATE', client)})} className={`flex items-center justify-center gap-1 py-2 rounded text-xs border ${isPrivUpdateStale ? 'border-red-200 text-red-600 bg-red-50' : 'border-slate-200 text-slate-600'}`}>
                 <Globe size={12}/> 私域更新
              </button>
           </div>
        </div>
     );
  };

  const filteredTasks = useMemo(() => {
     let list = tasks.filter(t => currentRole === 'ALL' || t.role === currentRole || t.role === 'ALL');
     if (activeTab === 'my-tasks') list = list.filter(t => t.status !== 'completed');
     if (activeTab === 'history') list = list.filter(t => t.status === 'completed');
     
     return list.sort((a, b) => {
        if (activeTab === 'history') return (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0);
        
        const aBomb = a.burningDeadline?.seconds && new Date() > new Date(a.burningDeadline.seconds*1000);
        const bBomb = b.burningDeadline?.seconds && new Date() > new Date(b.burningDeadline.seconds*1000);
        if (aBomb && !bBomb) return -1;
        if (!aBomb && bBomb) return 1;
        return (a.burningDeadline?.seconds || Infinity) - (b.burningDeadline?.seconds || Infinity);
     });
  }, [tasks, currentRole, activeTab]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-10 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="text-blue-500"/> 粤新链·指挥台</h1>
          <p className="text-[10px] mt-1 text-slate-500">V38.8 Campaign DNA</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button onClick={() => setActiveTab('my-tasks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'my-tasks' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><CheckSquare size={18} /> 我的待办</button>
          <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'clients' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Users size={18} /> 客户全景</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><History size={18} /> 任务记录</button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <select value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-700">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
        </div>
        
        {/* BOMB STATS PANEL */}
        <div className="mt-4 mx-4 p-3 bg-slate-800 rounded-lg border border-slate-700 mb-6">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Bomb size={12} className="text-red-500"/> 炸弹统计</div>
          <div className="flex justify-between text-center">
            <div>
              <div className="text-lg font-bold text-white">{bombStats.weekly}</div>
              <div className="text-[10px] text-slate-500">本周</div>
            </div>
            <div className="w-px bg-slate-700 mx-2"></div>
            <div>
              <div className="text-lg font-bold text-white">{bombStats.monthly}</div>
              <div className="text-[10px] text-slate-500">本月</div>
            </div>
          </div>
        </div>
      </div>

      <main className="ml-64 flex-1 overflow-y-auto p-8">
        {toast && <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-3 rounded shadow-xl z-50 animate-fade-in">{toast}</div>}

        {(activeTab === 'my-tasks' || activeTab === 'history') && (
           <div className="max-w-3xl mx-auto">
              <header className="mb-6 flex justify-between items-center">
                 <h2 className="text-xl font-bold">{activeTab === 'my-tasks' ? '我的待办' : '历史归档'}</h2>
                 {activeTab === 'my-tasks' && <div className="flex gap-2">
                    <button onClick={() => setManualModal({...manualModal, show: true})} className="bg-slate-900 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Plus size={14}/> 临时任务</button>
                 </div>}
              </header>
              <div className="space-y-4">
                 {filteredTasks.length === 0 && <div className="text-center text-slate-400 py-10">无数据</div>}
                 {renderGroupedTasks(filteredTasks)}
              </div>
           </div>
        )}

        {activeTab === 'clients' && (
           <div className="max-w-5xl mx-auto">
              <header className="mb-6 flex justify-between items-center">
                 <h2 className="text-xl font-bold">客户全景</h2>
                 {(['FOUNDER','XJ','QH'].includes(currentRole)) && (
                    <button onClick={() => setShowNewClientModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"><Plus size={18}/> 新签约</button>
                 )}
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {clients.map(renderClientCard)}
              </div>
           </div>
        )}
      </main>

      {/* --- MODALS --- */}
      {confirmModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3><p className="text-sm text-slate-500 mb-6">{confirmModal.message}</p><div className="flex justify-end gap-3"><button onClick={() => setConfirmModal({...confirmModal, show:false, title:'', message:'', onConfirm:null})} className="px-4 py-2 text-slate-500">取消</button><button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">确认</button></div></div></div>}

      {/* NEW: Manual Task Modal with Client ID */}
      {manualModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-[400px] shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Target className="text-blue-500"/> 发起临时任务</h3>
            
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={manualModal.type === 'simple'} onChange={() => setManualModal({...manualModal, type: 'simple'})} />
                <span className={manualModal.type === 'simple' ? 'font-bold text-slate-800' : 'text-slate-500'}>执行任务</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={manualModal.type === 'quota'} onChange={() => setManualModal({...manualModal, type: 'quota'})} />
                <span className={manualModal.type === 'quota' ? 'font-bold text-slate-800' : 'text-slate-500'}>穿刺战役</span>
              </label>
            </div>

            <div className="space-y-4">
              {/* Client Selection */}
              <select 
                className="w-full border p-3 rounded bg-white text-sm"
                value={manualModal.clientId} 
                onChange={e => setManualModal({...manualModal, clientId: e.target.value})}
              >
                <option value="">-- 关联客户 (可选) --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <input 
                className="w-full border p-3 rounded" 
                placeholder={manualModal.type === 'simple' ? "任务名称" : "战役名称 (如: 某某客户突击)"} 
                value={manualModal.name} 
                onChange={e => setManualModal({...manualModal, name: e.target.value})} 
              />
              
              {manualModal.type === 'quota' && (
                <div className="bg-slate-50 p-3 rounded border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 mb-2">触达指标分配</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['TC','ST','LE','ZC','XJ'].map(r => (
                      <div key={r} className="flex items-center justify-between">
                        <label className="text-xs font-bold w-8">{r}</label>
                        <input 
                          type="number" 
                          className="border p-1 rounded w-full text-xs" 
                          placeholder="0" 
                          onChange={e => setManualModal(prev => ({...prev, quotas: {...prev.quotas, [r]: e.target.value}}))} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Bomb size={12}/> 燃烧绳 (选填)</div>
                <div className="flex gap-2">
                  <input type="date" className="w-full border p-2 rounded text-xs" value={manualModal.date} onChange={e => setManualModal({...manualModal, date: e.target.value})} />
                  <input type="time" className="w-full border p-2 rounded text-xs" value={manualModal.time} onChange={e => setManualModal({...manualModal, time: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setManualModal({...manualModal, show: false})} className="px-4 py-2 text-slate-500">取消</button>
              <button onClick={handleManualSubmit} className="px-4 py-2 bg-slate-900 text-white rounded">下达指令</button>
            </div>
          </div>
        </div>
      )}

      {/* FIX: New Client Modal with Date Input */}
      {showNewClientModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-8 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-4">新客户签约</h3>
      <div className="space-y-4">
        <input className="w-full border p-3 rounded" placeholder="客户全称" value={newClientName} onChange={e=>setNewClientName(e.target.value)} autoFocus />
        <div><label className="text-xs text-slate-500">签约/入池时间 (支持补录)</label><input type="date" className="w-full border p-3 rounded" value={newClientDate} onChange={e=>setNewClientDate(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-6"><button onClick={() => setShowNewClientModal(false)} className="px-4 py-2 text-slate-500">取消</button><button onClick={createClient} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">{isSubmitting && <Loader2 className="animate-spin" size={16}/>} 启动</button></div></div></div>}
      
      {countryModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe className="text-blue-500"/> 确认主攻国</h3><input className="w-full border p-3 rounded mb-4" placeholder="例如: 美国" value={countryModal.country} onChange={e=>setCountryModal({...countryModal, country: e.target.value})} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setCountryModal({...countryModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={() => handleTaskAction(countryModal.task, 'complete', countryModal.country)} className="px-4 py-2 bg-blue-600 text-white rounded">确认并更名</button></div></div></div>}
      {ropeModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Bomb className="text-red-500"/> 设定燃烧绳</h3><div className="space-y-4"><input type="date" className="w-full border p-3 rounded" value={ropeModal.date} onChange={e=>setRopeModal({...ropeModal, date: e.target.value})} /><input type="time" className="w-full border p-3 rounded" value={ropeModal.time} onChange={e=>setRopeModal({...ropeModal, time: e.target.value})} /></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setRopeModal({...ropeModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={setBurningRope} className="px-4 py-2 bg-red-600 text-white rounded">点燃</button></div></div></div>}
      {distModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CrosshairIcon className="text-purple-500"/> 分配战役额度</h3><div className="space-y-3">{['TC','ST','LE','ZC','XJ'].map(r=><div key={r} className="flex items-center justify-between"><label className="font-bold w-12">{r}</label><input type="number" className="border p-2 rounded w-48" placeholder="触达数量" onChange={e=>setDistModal(prev=>({...prev, quotas: {...prev.quotas, [r]: e.target.value}}))} /></div>)}</div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setDistModal({...distModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={() => handleTaskAction(distModal.task, 'complete', distModal.quotas)} className="px-4 py-2 bg-purple-600 text-white rounded">发布战役</button></div></div></div>}
      {quotaModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[300px] shadow-2xl"><h3 className="text-lg font-bold mb-4">汇报进度</h3><input type="number" className="w-full border p-3 rounded mb-4" placeholder="今日新增数量" value={quotaModal.addValue} onChange={e=>setQuotaModal({...quotaModal, addValue: e.target.value})} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setQuotaModal({...quotaModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={updateQuota} className="px-4 py-2 bg-blue-600 text-white rounded">更新</button></div></div></div>}
    </div>
  );
}

function CrosshairIcon(props) { return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>}

