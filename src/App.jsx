import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  LayoutDashboard, Users, CheckSquare, Plus, ArrowRight, AlertTriangle, 
  CheckCircle2, Circle, UserCircle, Activity, FileText,
  RotateCcw, Hourglass, Lock, Trash2, Save, X, Zap,
  Briefcase, Flame, History, ArrowUpRight, Layers,
  BarChart3, AlertCircle, Loader2, ChevronDown, ChevronUp,
  ScrollText, Gauge
} from 'lucide-react';

// --- Firebase Config ---
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

// --- WORKFLOW DNA (Strictly Adjusted) ---
const WORKFLOW_TEMPLATE = [
  // === Phase 1: Launch ===
  { code: 'L-01', name: '确认签约', role: 'XJ', phase: '签约启动', desc: '看板客户卡片建立', sla: 24, type: 'once', track: 1 },
  { code: 'L-02', name: '合同收集', role: 'ST', phase: '签约启动', desc: '建立Excel/发票/归档', prev: 'L-01', sla: 48, type: 'once', track: 1 },
  { code: 'L-03', name: '建立工作空间', role: 'TC', phase: '签约启动', desc: '拉群/建文件夹', prev: 'L-01', sla: 4, type: 'once', track: 1 },
  { code: 'L-04', name: '客户资料归档', role: 'TC', phase: '签约启动', desc: '资料清单入云盘', prev: 'L-03', sla: 24, type: 'once', track: 1 },

  // === Phase 2: Market Targeting ===
  { code: 'MT-01', name: 'AI市场初筛', role: 'TC', phase: '市场定位', desc: '输出初筛报告', prev: 'L-04', sla: 12, type: 'once', track: 1 },
  { code: 'MT-02', name: '会前准备', role: 'XJ', phase: '市场定位', desc: '会议资料(PPT/视频)', prev: 'MT-01', sla: 4, type: 'once', track: 1 },
  { code: 'MT-03', name: '战略决策会', role: 'QH', phase: '市场定位', desc: '确认主攻国', prev: 'MT-02', sla: 2, type: 'once', track: 1 },
  { code: 'MT-04', name: '目标国深度调研', role: 'TC', phase: '市场定位', desc: '深度报告+穿刺名单V1.0', prev: 'MT-03', sla: 72, type: 'once', track: 1 },

  // === Phase 3: Localization ===
  { code: 'LB-01', name: '品牌小广告', role: 'XJ', phase: '在地化基建', desc: '输出小卡片', prev: 'MT-03', sla: 24, type: 'once', track: 1 },
  { code: 'LB-02', name: '品牌改造方案', role: 'XJ', phase: '在地化基建', desc: '解决方案文档', prev: 'MT-03', sla: 48, type: 'once', track: 1 },
  
  // FIX: ZC Whitepaper (LB-03) starts after TC Research (MT-04)
  { code: 'LB-03', name: '转化白皮书', role: 'ZC', phase: '在地化基建', desc: '制作白皮书', prev: 'MT-04', sla: 72, type: 'once', track: 1 },
  
  { code: 'LB-04', name: '卫星站点搭建', role: 'XJ', phase: '在地化基建', desc: '上线站点链接&SEO', prev: 'LB-02', sla: 72, type: 'once', track: 1 },
  { code: 'LB-06', name: '宣传视频制作', role: 'LE', phase: '在地化基建', desc: '数字人视频x2', prev: 'LB-02', sla: 96, type: 'once', track: 1 },
  { code: 'LB-05', name: '智能客服搭建', role: 'QH', phase: '在地化基建', desc: 'AI客服配置', prev: 'LB-04', sla: 24, type: 'once', track: 1 },
  { code: 'LB-07', name: '素材转化', role: 'ZC', phase: '在地化基建', desc: '社媒内容库初始化', prev: 'LB-02', sla: 48, type: 'once', track: 1 },
  { code: 'LB-08', name: '基建核心审核', role: 'QH', phase: '在地化基建', desc: '最终版交付物审核', prev: ['LB-05', 'LB-06', 'LB-07'], sla: 24, type: 'once', track: 1 },

  // === Phase 4: Market Penetration ===
  // All Outreach starts after MT-04 (List Ready)
  { code: 'MP-01', name: '高潜名单触达', role: 'TC', phase: '市场渗透', desc: '每日筛选与触达', prev: 'MT-04', sla: 24, type: 'continuous', track: 1 },
  { code: 'MP-02', name: '穿刺联系方式', role: 'ST', phase: '市场渗透', desc: '完善客户数据表', prev: 'MT-04', sla: 48, type: 'continuous', track: 1 },
  { code: 'MP-03', name: '批量触达(领英)', role: 'ST', phase: '市场渗透', desc: '每日触达/多号操作', prev: 'MT-04', sla: 24, type: 'continuous', track: 1 },
  
  // FIX: LE SINOVA Outreach - Continuous, after MT-04
  { code: 'MP-04', name: 'SINOVA批量触达', role: 'LE', phase: '市场渗透', desc: '每日SINOVA账号触达', prev: 'MT-04', sla: 24, type: 'continuous', track: 1 },
  
  // FIX: ZC Email - Weekly, after LB-03 (Whitepaper ready)
  { code: 'MP-05', name: '邮件阵地触达', role: 'ZC', phase: '市场渗透', desc: '每周邮件营销', prev: 'LB-03', sla: 168, type: 'weekly', track: 1 }, 
  
  { code: 'MP-CONTENT', name: '社媒素材转化', role: 'ZC', phase: '市场渗透', desc: '周一三五转化素材', prev: 'LB-07', sla: 24, type: 'mwf', track: 1 }, 
  { code: 'MP-06', name: '发布社媒动态', role: 'ALL', phase: '市场渗透', desc: '周一三五全员发布', prev: 'MP-CONTENT', sla: 24, type: 'mwf', track: 1 },
  { code: 'MP-07', name: '多渠道运营', role: 'ZC', phase: '市场渗透', desc: 'FB/Ins运营节点', prev: 'LB-07', sla: 48, type: 'weekly', track: 1 },

  // === Phase 5: Lead ===
  { code: 'LO-01', name: '线索登记(MQL)', role: 'XJ', phase: '线索转化', desc: '更新CRM/概率表', prev: 'MP-03', sla: 24, type: 'continuous', track: 1 },
  { code: 'LO-02', name: 'MQL初步互动', role: 'TC', phase: '线索转化', desc: '互动记录', prev: 'LO-01', sla: 24, type: 'continuous', track: 1 },
  { code: 'LO-03', name: '升级SQL指派', role: 'XJ', phase: '线索转化', desc: '@QH指派通知', prev: 'LO-02', sla: 4, type: 'once', track: 1 },
  { code: 'LO-04', name: '推进商机', role: 'QH', phase: '线索转化', desc: 'CRM商机阶段更新', prev: 'LO-03', sla: 168, type: 'weekly', track: 1 },
];

// Track 2: Nurture Loop
const TRACK_2_NURTURE_TEMPLATE = [
  { code: 'N-LOOP-02', name: '第2轮：发送解决方案', phase: '静默激活', desc: '向目标群组发送《解决方案》', sla: 24, type: 'continuous', track: 2, round: 2 },
  { code: 'N-LOOP-03', name: '第3轮：发送讲解视频', phase: '静默激活', desc: '发送视频内容', prev: 'N-LOOP-02', sla: 168, type: 'continuous', track: 2, round: 3 }, 
  { code: 'N-LOOP-04', name: '第4轮：发送白皮书', phase: '静默激活', desc: '发送白皮书并引导下载', prev: 'N-LOOP-03', sla: 168, type: 'continuous', track: 2, round: 4 },
  { code: 'N-LOOP-05', name: '第5轮：最终全景激活', phase: '静默激活', desc: '发送SINOVAlink全景方案+阵亡分析', prev: 'N-LOOP-04', sla: 168, type: 'continuous', track: 2, round: 5 },
  { code: 'N-LOOP-RECHECK', name: '60天后：静默客户回捞', phase: '静默激活', desc: '检查是否有新的回关或意向', prev: 'N-LOOP-05', sla: 1440, type: 'once', track: 2, round: 6 }, 
];

// Track 2: Strike
const TRACK_2_STRIKE_TEMPLATE = [
  { code: 'S-LOOP-01', name: '识别重点攻坚', role: 'QH', phase: '重点攻坚', desc: 'CRM标记攻坚目标', sla: 48, type: 'once', track: 2, round: 99 },
  { code: 'S-LOOP-02', name: '定制轻方案', role: 'ZC', phase: '重点攻坚', desc: '针对性PPT/PDF', prev: 'S-LOOP-01', sla: 48, type: 'once', track: 2, round: 99 },
  { code: 'S-LOOP-03', name: '高管私信攻坚', role: 'TC', phase: '重点攻坚', desc: '发送方案给CEO', prev: 'S-LOOP-02', sla: 48, type: 'continuous', track: 2, round: 99 },
];

const TRACK_3_TEMPLATE = [
  { code: 'INT-01', name: '官网内容更新', role: 'ZC', phase: '内部建设', desc: 'SEO文章/白皮书', sla: 48, type: 'mwf', track: 3 },
  { code: 'INT-02', name: 'Youtube更新', role: 'LE', phase: '内部建设', desc: '发布新视频', sla: 168, type: 'weekly', track: 3 },
];

// --- HELPERS ---
const getNextDueDate = (type, pressure = 1.0) => {
  const now = new Date();
  const target = new Date(now);
  target.setHours(10, 0, 0, 0); 
  if (type === 'daily' || type === 'continuous') target.setDate(target.getDate() + 1);
  else if (type === 'weekly') target.setDate(target.getDate() + 7);
  else if (type === 'mwf') {
    const day = target.getDay(); 
    if (day === 1) target.setDate(target.getDate() + 2); 
    else if (day === 3) target.setDate(target.getDate() + 2); 
    else if (day === 5) target.setDate(target.getDate() + 3); 
    else target.setDate(target.getDate() + 1);
  } else target.setDate(target.getDate() + 1);
  return target;
};

const getSlaDuration = (baseSlaHours, pressureMode) => {
  const modifier = pressureMode ? 0.8 : 1.0;
  return baseSlaHours * modifier * 3600000;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('XJ');
  const [activeTab, setActiveTab] = useState('my-tasks');
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [pressureMode, setPressureMode] = useState(false);
  const [processingTasks, setProcessingTasks] = useState({});
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [taskFilter, setTaskFilter] = useState('priority'); 
  const [expandedGroups, setExpandedGroups] = useState({});

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [logModal, setLogModal] = useState({ show: false, task: null, content: '' });
  const [leadModal, setLeadModal] = useState({ show: false, task: null, clientName: '', clientId: '', contact: '', note: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(data);
      setLoading(false);
      const activeCount = data.filter(t => t.status === 'pending' || t.status === 'in-progress').length;
      setPressureMode(activeCount > 20);
    });
    const unsubClients = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), orderBy('createdAt', 'desc')), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTasks(); unsubClients(); };
  }, [user]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const createClient = async () => {
    if (!newClientName.trim() || isSubmitting) return; 
    setIsSubmitting(true);
    const clientId = `CLIENT-${Date.now()}`;
    const batch = writeBatch(db);

    batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId), {
      name: newClientName, createdAt: serverTimestamp(), status: 'active', progress: 0, currentRound: 1, startWeek: serverTimestamp()
    });

    const starters = WORKFLOW_TEMPLATE.filter(t => !t.prev);
    starters.forEach(t => {
      const taskId = `${clientId}-${t.code}`;
      batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
        ...t, clientId, clientName: newClientName, status: 'pending', isReady: true,
        createdAt: serverTimestamp(), dueDate: new Date(Date.now() + getSlaDuration(t.sla, pressureMode)), logs: []
      });
    });

    await batch.commit();
    setNewClientName('');
    setShowNewClientModal(false);
    setIsSubmitting(false);
    showToast(`🚀 客户启动！`);
  };

  const triggerNextTasks = (completedTask, existingTasks, batch) => {
    const nextSteps = [
      ...WORKFLOW_TEMPLATE.filter(t => {
        const prevs = Array.isArray(t.prev) ? t.prev : [t.prev];
        return prevs.includes(completedTask.code);
      }),
      ...TRACK_2_NURTURE_TEMPLATE.filter(t => t.prev === completedTask.originalCode || t.prev === completedTask.code)
    ];

    nextSteps.forEach(nextT => {
      const targetRole = nextT.track === 2 ? completedTask.role : nextT.role;
      if (nextT.track === 2 && targetRole === 'XJ') return; 

      const uniqueCode = nextT.track === 2 ? `${nextT.code}-${targetRole}` : nextT.code;
      if (existingTasks.find(t => t.code === nextT.code && (nextT.track === 2 ? t.role === targetRole : true))) return;

      let ready = true;
      if (Array.isArray(nextT.prev)) {
        ready = nextT.prev.every(code => {
          if (code === completedTask.code) return true;
          const sibling = existingTasks.find(t => t.code === code);
          return sibling && sibling.status === 'completed';
        });
      }

      if (ready) {
        const taskId = `${completedTask.clientId}-${uniqueCode}`;
        const now = new Date();
        const duration = nextT.sla === 1440 ? (60 * 24 * 3600000) : getSlaDuration(nextT.sla, pressureMode);
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
          ...nextT, role: targetRole, clientId: completedTask.clientId, clientName: completedTask.clientName,
          status: 'pending', isReady: true, createdAt: serverTimestamp(),
          dueDate: new Date(now.getTime() + duration), logs: [],
          originalCode: nextT.code,
          name: nextT.track === 2 ? `${nextT.name} (${targetRole}线)` : nextT.name
        });
      }
    });
  };

  const activateNurtureLoop = (clientName, clientId, batch, role) => {
    if (role === 'XJ') return;
    const startNode = TRACK_2_NURTURE_TEMPLATE[0];
    const taskId = `${clientId}-${startNode.code}-${role}`;
    batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
      ...startNode, role: role, clientId, clientName, status: 'pending', isReady: true,
      createdAt: serverTimestamp(), dueDate: getNextDueDate('daily'), logs: [],
      originalCode: startNode.code, name: `${startNode.name} (${role}线)`
    });
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId), { currentRound: 2, nurtureActive: true });
  };

  const submitComplete = async (task) => {
    setProcessingTasks(prev => ({ ...prev, [task.id]: true }));
    try {
      const batch = writeBatch(db);
      const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
      batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });

      const clientTasks = tasks.filter(t => t.clientId === task.clientId);
      triggerNextTasks(task, clientTasks, batch);

      const milestones = clientTasks.filter(t => t.track === 1 && t.type === 'once');
      const completedCount = milestones.filter(t => t.status === 'completed').length + (task.type==='once' && task.status!=='completed' ? 1 : 0);
      const totalTemplateTasks = WORKFLOW_TEMPLATE.filter(t => t.track === 1 && t.type === 'once').length;
      const progress = Math.round((completedCount / totalTemplateTasks) * 100);
      
      const updates = { progress };
      if (task.track === 2 && task.round) updates.currentRound = task.round + 1; 
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'clients', task.clientId), updates);

      await batch.commit();
      showToast(`✅ [${task.name}] 完成`);
    } catch (e) { console.error(e); alert("操作失败"); } 
    finally { setProcessingTasks(prev => ({ ...prev, [task.id]: false })); setConfirmModal({ ...confirmModal, show: false }); }
  };

  const submitCheckIn = async () => {
    const { task, content } = logModal;
    if (!task) return;
    const batch = writeBatch(db);
    const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    const nextDue = getNextDueDate(task.type, pressureMode);
    batch.update(taskRef, {
      dueDate: nextDue, lastCheckIn: serverTimestamp(),
      logs: [...(task.logs || []), { text: content || "打卡", type: 'check-in', user: user.uid, userRole: currentRole, at: new Date().toISOString() }]
    });
    await batch.commit();
    showToast(`📝 打卡成功`);
    setLogModal({ show: false, task: null, content: '' });
  };

  const submitUndo = async (task) => {
    const batch = writeBatch(db);
    const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    batch.update(taskRef, { status: 'pending', completedAt: null });
    await batch.commit();
    showToast(`↩️ 撤回成功`);
    setConfirmModal({ ...confirmModal, show: false });
  };

  const submitLead = async () => {
    const { clientName, clientId, contact, note, task } = leadModal;
    if (!contact || !note) return alert("请填写完整商机信息");
    const batch = writeBatch(db);
    TRACK_2_STRIKE_TEMPLATE.forEach(t => {
      const taskId = `${clientId}-${t.code}-${Date.now()}`; 
      batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
        ...t, clientId, clientName, status: 'pending', isReady: true,
        createdAt: serverTimestamp(), dueDate: getNextDueDate('daily'), logs: [],
        context: { contact, note, sourceRole: currentRole, sourceUser: user.uid, sourceTask: task?.name } 
      });
    });
    if (task) {
      const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
      batch.update(taskRef, {
        logs: [...(task.logs || []), { text: `🔥 发现商机! 目标: ${contact} | 需求: ${note}`, type: 'lead', user: user.uid, userRole: currentRole, clientName, taskName: task.name, at: new Date().toISOString() }]
      });
    }
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId), { track2Active: true });
    await batch.commit();
    showToast(`🔥 商机已登记`);
    setLeadModal({ show: false, task: null, clientName: '', clientId: '', contact: '', note: '' });
    setTaskFilter('track2');
  };

  const requestComplete = (task) => {
    const isOnce = task.type === 'once';
    const isOutreachEnd = ['MP-01', 'MP-03', 'MP-05'].includes(task.code);
    setConfirmModal({
      show: true,
      title: isOnce ? `完成 [${task.name}]?` : `结束 [${task.name}] 阶段?`,
      message: isOutreachEnd ? `注意：触达结束后，是否立即启动「静默激活循环 (${task.role}线)」?` : isOnce ? "触发后续工作流。" : "这将彻底关闭此任务。",
      onConfirm: async () => {
        if (isOutreachEnd) {
           setProcessingTasks(prev => ({ ...prev, [task.id]: true }));
           const batch = writeBatch(db);
           activateNurtureLoop(task.clientName, task.clientId, batch, task.role);
           const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
           batch.update(taskRef, { status: 'completed', completedAt: serverTimestamp() });
           await batch.commit();
           showToast(`✅ ${task.role}线静默激活已启动`);
           setProcessingTasks(prev => ({ ...prev, [task.id]: false }));
           setConfirmModal({ ...confirmModal, show: false });
        } else submitComplete(task);
      }
    });
  };

  const requestUndo = (task) => setConfirmModal({ show: true, title: "撤回任务?", message: "恢复为待办。", onConfirm: () => submitUndo(task) });
  const openLeadModal = (task) => setLeadModal({ show: true, task, clientName: task.clientName, clientId: task.clientId, contact: '', note: '' });

  const renderTaskItem = (task) => {
    const isRecurring = ['continuous', 'daily', 'weekly', 'mwf'].includes(task.type);
    const dueDate = task.dueDate ? new Date(task.dueDate.seconds * 1000) : null;
    const isOverdue = dueDate && new Date() > dueDate;
    const isProcessing = processingTasks[task.id];
    const isCompleted = task.status === 'completed';
    const context = task.context;

    return (
      <div key={task.id} className={`bg-white p-4 border-b border-slate-50 hover:bg-slate-50 transition-all flex items-start gap-4 group ${isOverdue && !isCompleted ? 'bg-red-50/30' : ''}`}>
        <div className="pt-1">
          {isCompleted ? <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckSquare size={16} /></div> : (
            <div className="flex flex-col gap-2">
              {isRecurring && (
                <button onClick={() => setLogModal({ show: true, task, content: '' })} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100" title="打卡"><FileText size={14}/></button>
              )}
              <button onClick={() => requestComplete(task)} disabled={isProcessing} className="w-8 h-8 rounded-full border-2 border-slate-300 text-slate-300 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center" title={isRecurring ? "结束阶段" : "完成"}>
                {isProcessing ? <Loader2 className="animate-spin" size={14}/> : isRecurring ? <ArrowRight size={14}/> : <CheckSquare size={14}/>}
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-slate-400">{task.code}</span>
            {isOverdue && !isCompleted && <span className="text-xs text-red-500 font-bold flex items-center"><AlertTriangle size={10} className="mr-1"/> 逾期</span>}
            {task.track === 2 && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center"><Zap size={8} className="mr-1"/> 攻坚</span>}
            {task.round && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">第{task.round}轮</span>}
          </div>
          <h3 className={`font-bold text-sm text-slate-800 ${isCompleted ? 'line-through text-slate-400' : ''}`}>{task.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{task.desc}</p>
          {context && <div className="mt-2 text-xs bg-purple-50 border border-purple-100 text-purple-800 p-2 rounded"><div className="font-bold flex items-center gap-1 mb-1"><Flame size={12}/> 线索来源: {context.sourceRole} ({context.sourceTask})</div><div>🎯 目标: {context.contact}</div><div className="mt-1">📝 备注: {context.note}</div></div>}
          {!isCompleted && (task.phase === '市场渗透' || task.phase === '线索转化' || task.phase === '静默激活') && (
            <button onClick={() => openLeadModal(task)} className="mt-2 text-[10px] flex items-center gap-1 text-purple-600 border border-purple-100 px-2 py-0.5 rounded hover:bg-purple-50 transition-colors"><Flame size={10}/> 发现商机</button>
          )}
        </div>
        <div className="text-right text-xs text-slate-400 pt-1 min-w-[80px]">
          {dueDate && !isCompleted && <div className={isOverdue ? 'text-red-500 font-bold' : ''}>{dueDate.toLocaleDateString()}</div>}
          {isCompleted && <span className="text-emerald-600">已完成</span>}
        </div>
      </div>
    );
  };

  // --- GROUPED TASK RENDER (V28.1 RESTORED) ---
  const renderGroupedTasks = (filtered) => {
    const groups = filtered.reduce((acc, task) => {
      const key = task.clientName || '其他';
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
    const sortedGroups = Object.entries(groups).sort(([nameA, tasksA], [nameB, tasksB]) => {
      const hasOverdueA = tasksA.some(t => t.dueDate && new Date(t.dueDate.seconds*1000) < new Date());
      const hasOverdueB = tasksB.some(t => t.dueDate && new Date(t.dueDate.seconds*1000) < new Date());
      if (hasOverdueA && !hasOverdueB) return -1;
      if (!hasOverdueA && hasOverdueB) return 1;
      return 0;
    });
    return sortedGroups.map(([clientName, clientTasks]) => {
      const hasOverdue = clientTasks.some(t => t.dueDate && new Date(t.dueDate.seconds*1000) < new Date());
      const isExpanded = expandedGroups[clientName] ?? (hasOverdue || taskFilter === 'priority' || taskFilter === 'track2');
      return (
        <div key={clientName} className={`bg-white rounded-xl border shadow-sm overflow-hidden mb-4 ${hasOverdue ? 'border-red-200' : 'border-slate-200'}`}>
          <div className={`px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 ${hasOverdue ? 'bg-red-50' : 'bg-slate-50'}`} onClick={() => setExpandedGroups(prev => ({ ...prev, [clientName]: !isExpanded }))}>
            <div className="font-bold text-slate-700 flex items-center gap-2">
              {isExpanded ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
              <Users size={16} className={hasOverdue ? 'text-red-500' : 'text-slate-400'}/>
              {clientName}
              <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{clientTasks.length}</span>
            </div>
            {hasOverdue && <span className="text-xs text-red-600 font-bold flex items-center"><AlertCircle size={12} className="mr-1"/> 需关注</span>}
          </div>
          {isExpanded && <div>{clientTasks.map(task => renderTaskItem(task))}</div>}
        </div>
      );
    });
  };

  const filteredTasks = useMemo(() => {
    // FIX: RESTRICT XJ TO ONLY SEE XJ TASKS
    let list = tasks.filter(t => {
      if (currentRole === 'FOUNDER' || currentRole === 'ALL') return true;
      return t.role === currentRole || t.role === 'ALL';
    });
    
    list = list.filter(t => activeTab === 'completed' ? t.status === 'completed' : t.status !== 'completed');
    if (taskFilter === 'urgent' && activeTab !== 'completed') {
      const today = new Date(); today.setHours(23,59,59,999);
      list = list.filter(t => t.dueDate && t.dueDate.seconds*1000 <= today.getTime());
    } else if (taskFilter === 'track2') {
      list = list.filter(t => t.track === 2);
    }
    return list.sort((a, b) => (a.dueDate?.seconds || Infinity) - (b.dueDate?.seconds || Infinity));
  }, [tasks, currentRole, activeTab, taskFilter]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">加载中...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-10 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="text-blue-500"/> 粤新链·指挥台</h1>
          <p className="text-[10px] mt-1 text-slate-500">V30.0 完美秩序版</p>
          <div className={`mt-4 p-2 rounded flex items-center gap-2 text-xs font-bold ${pressureMode ? 'bg-red-900/50 text-red-400 animate-pulse' : 'bg-slate-800 text-emerald-400'}`}>
            <Gauge size={14}/> {pressureMode ? '高压模式' : '系统负载正常'}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-6">
          {[
            { id: 'my-tasks', label: '我的待办', icon: CheckSquare },
            { id: 'logs', label: '全局日志', icon: ScrollText, roles: ['FOUNDER', 'XJ', 'QH'] },
            { id: 'clients', label: '客户全景', icon: Users },
            { id: 'completed', label: '历史归档', icon: History },
          ].map(item => ((!item.roles || item.roles.includes(currentRole)) && <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><item.icon size={18} /> {item.label}</button>))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <select value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-700">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
        </div>
      </div>
      <main className="ml-64 flex-1 overflow-y-auto p-8">
        {toast && <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-3 rounded shadow-xl z-50 animate-fade-in">{toast}</div>}
        {activeTab === 'logs' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><ScrollText/> 全局作业日志</h2>
            {tasks.flatMap(t => (t.logs || []).map(l => ({...l, taskName: t.name, clientName: t.clientName}))).sort((a,b)=>new Date(b.at)-new Date(a.at)).map((log, i) => (
              <div key={i} className={`p-4 rounded-xl border shadow-sm text-sm ${log.type === 'lead' ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}>
                <div className="font-bold flex justify-between"><span>{log.clientName} - {log.taskName}</span><span className="font-normal text-slate-400">{new Date(log.at).toLocaleString()}</span></div>
                <div className={`mt-1 ${log.type === 'lead' ? 'text-purple-800 font-medium' : 'text-slate-600'}`}>{log.type === 'lead' && <Flame size={12} className="inline mr-1"/>}<span className="font-bold text-slate-700 mr-2">[{log.userRole}]</span>{log.text}</div>
              </div>
            ))}
          </div>
        )}
        {(activeTab === 'my-tasks' || activeTab === 'completed') && (
          <div className="max-w-5xl mx-auto space-y-4">
            <header className="mb-4 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{activeTab === 'completed' ? '已归档任务' : '待办流水线'}</h2><div className="flex gap-1 bg-slate-100 p-1 rounded"><button onClick={() => setTaskFilter('priority')} className={`px-3 py-1 text-xs rounded ${taskFilter === 'priority' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>全部</button><button onClick={() => setTaskFilter('urgent')} className={`px-3 py-1 text-xs rounded ${taskFilter === 'urgent' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>急件</button><button onClick={() => setTaskFilter('track2')} className={`px-3 py-1 text-xs rounded ${taskFilter === 'track2' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>攻坚</button></div></header>
            {/* V28.1 GROUPED RENDER RESTORED */}
            {renderGroupedTasks(filteredTasks)}
          </div>
        )}
        {activeTab === 'clients' && <div className="max-w-5xl mx-auto space-y-6"><header className="flex justify-between items-center"><h2 className="text-2xl font-bold">客户全景</h2><button onClick={() => setShowNewClientModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow"><Plus size={18}/> 新签约</button></header><div className="grid gap-4">{clients.map(c => <div key={c.id} className="bg-white p-6 rounded-xl border shadow-sm"><div className="flex justify-between"><h3 className="font-bold">{c.name}</h3><div className="text-xs text-slate-400">入池 {Math.ceil((new Date()-new Date(c.startWeek?.seconds*1000))/(604800000))} 周</div></div><div className="flex gap-2 mt-1 text-xs"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Round: {c.currentRound || 1}</span></div><div className="w-full h-2 bg-slate-100 rounded mt-2"><div className="h-full bg-blue-500" style={{width: `${c.progress}%`}}></div></div></div>)}</div></div>}
      </main>
      {confirmModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3><p className="text-sm text-slate-500 mb-6">{confirmModal.message}</p><div className="flex justify-end gap-3"><button onClick={() => setConfirmModal({...confirmModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">确认</button></div></div></div>}
      {showNewClientModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-8 rounded-xl w-[400px] shadow-2xl"><h3 className="text-lg font-bold mb-4">新客户签约</h3><input className="w-full border p-3 rounded mb-6" placeholder="客户全称" value={newClientName} onChange={e=>setNewClientName(e.target.value)} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setShowNewClientModal(false)} disabled={isSubmitting} className="px-4 py-2 text-slate-500">取消</button><button onClick={createClient} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">{isSubmitting && <Loader2 className="animate-spin" size={16}/>} 启动</button></div></div></div>}
      {leadModal.show && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Flame className="text-purple-500"/> 商机登记卡</h3><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">目标客户</label><input className="w-full border p-2 rounded" placeholder="例如: CEO John Doe" value={leadModal.contact} onChange={e=>setLeadModal({...leadModal, contact: e.target.value})} autoFocus/></div><div><label className="block text-xs font-bold text-slate-500 mb-1">需求备注</label><textarea className="w-full border p-2 rounded h-24 resize-none" placeholder="详情..." value={leadModal.note} onChange={e=>setLeadModal({...leadModal, note: e.target.value})} /></div></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setLeadModal({...leadModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={submitLead} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">登记并启动攻坚</button></div></div></div>}
      {logModal.show && logModal.task && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl"><h3 className="text-lg font-bold mb-4">📝 {logModal.task.name} - 日常打卡</h3><textarea className="w-full border p-3 rounded mb-4 h-32 resize-none" placeholder="今日进展..." value={logModal.content} onChange={e=>setLogModal({...logModal, content: e.target.value})} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setLogModal({...logModal, show:false})} className="px-4 py-2 text-slate-500">取消</button><button onClick={submitCheckIn} className="px-4 py-2 bg-blue-600 text-white rounded">确认</button></div></div></div>}
    </div>
  );
}
