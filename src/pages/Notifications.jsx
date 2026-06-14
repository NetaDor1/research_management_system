import React, { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  writeBatch, getDocs, deleteDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createNotification } from '../services/notifications';
import './Page.css';
import './Notifications.css';

const TAB_STYLES = {
  base: {
    padding: '8px 18px',
    borderRadius: '20px',
    border: '1px solid #cbd5e0',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#555',
    transition: 'all 0.15s'
  },
  active: {
    background: '#3b5bdb',
    color: 'white',
    border: '1px solid #3b5bdb'
  }
};

const tabStyle = (isActive) => ({
  ...TAB_STYLES.base,
  ...(isActive ? TAB_STYLES.active : {})
});

const Notifications = () => {
  const { user, isAdmin } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === 'he' ? 'he-IL' : 'en-US';

  const [activeTab, setActiveTab] = useState('all');

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Admin: send to researchers ───────────────────────────────────────────────
  const [researchers, setResearchers] = useState([]);
  const [selectedResearcherIds, setSelectedResearcherIds] = useState([]);
  const [importantTitle, setImportantTitle] = useState('');
  const [importantMessage, setImportantMessage] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // ── Admin: all-system notifications ─────────────────────────────────────────
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminNotifLoading, setAdminNotifLoading] = useState(false);

  // ── Admin: incoming messages ─────────────────────────────────────────────────
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [unreadIncoming, setUnreadIncoming] = useState(0);

  // ── Researcher: compose + outbox + incoming from admin ──────────────────────
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [outboxMessages, setOutboxMessages] = useState([]);
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [researcherIncoming, setResearcherIncoming] = useState([]);

  // ── Thread state (shared) ────────────────────────────────────────────────────
  const [expandedThread, setExpandedThread] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [replyOpen, setReplyOpen] = useState({});
  const [replySending, setReplySending] = useState(null);
  const [selectedOutboxThread, setSelectedOutboxThread] = useState(null);
  const [selectedIncomingThread, setSelectedIncomingThread] = useState(null);

  // ── Admin: outbox thread selection ───────────────────────────────────────────
  const [adminSelectedOutboxThread, setAdminSelectedOutboxThread] = useState(null);
  const [adminSelectedIncomingThread, setAdminSelectedIncomingThread] = useState(null);
  const [selectedInboxKeys, setSelectedInboxKeys] = useState([]);
  const [inboxTypeFilter, setInboxTypeFilter] = useState(null);

  // ─── Load researcher's own notifications ─────────────────────────────────────
  useEffect(() => {
    if (!db || !user?.id) { setLoading(false); return; }
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      setNotifications(items);
      setLoading(false);
    }, () => { setNotifications([]); setLoading(false); });
    return () => unsub();
  }, [user?.id]);

  // ─── Admin: load targeted notifications (created for admin by researcher actions) ──
  useEffect(() => {
    if (!db || !isAdmin()) return;
    setAdminNotifLoading(true);
    const q = query(collection(db, 'notifications'), where('targetRole', '==', 'ADMIN'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      setAdminNotifications(items);
      setAdminNotifLoading(false);
    }, () => setAdminNotifLoading(false));
    return () => unsub();
  }, [isAdmin]);

  // ─── Admin: researcher list ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!db || !isAdmin()) return;
      try {
        const snap = await getDocs(collection(db, 'researchProposals'));
        const map = new Map();
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.researcherId && !map.has(data.researcherId))
            map.set(data.researcherId, data.researcherName || t('researcher'));
        });
        setResearchers(Array.from(map.entries()).map(([id, name]) => ({ id, name })));
      } catch { setResearchers([]); }
    };
    load();
  }, [isAdmin]);

  // ─── Admin: incoming messages ────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !isAdmin()) return;
    setIncomingLoading(true);
    const unsub = onSnapshot(collection(db, 'researcherMessages'), (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      setIncomingMessages(items);
      setUnreadIncoming(items.filter((m) => !m.read).length);
      setIncomingLoading(false);
    }, () => setIncomingLoading(false));
    return () => unsub();
  }, [isAdmin]);

  // ─── Deadline reminders check on page open ───────────────────────────────────
  useEffect(() => {
    if (!db || !user?.id) return;

    const checkDeadlines = async () => {
      try {
        const now = new Date();
        const inSevenDays = new Date(); inSevenDays.setDate(now.getDate() + 7);
        const inTwoDays   = new Date(); inTwoDays.setDate(now.getDate() + 2);

        // Load tasks from both collections
        const loadTasks = async (collName) => {
          const parentRef = collection(db, collName);
          const parentQuery = isAdmin() ? parentRef : query(parentRef, where('researcherId', '==', user.id));
          const parentSnap = await getDocs(parentQuery);
          const all = await Promise.all(
            parentSnap.docs.map(async (pDoc) => {
              const pData = pDoc.data();
              const tSnap = await getDocs(collection(db, collName, pDoc.id, 'tasks'));
              return tSnap.docs.map((tDoc) => {
                const d = tDoc.data();
                let dueDate = '';
                if (d.dueDate) {
                  try {
                    if (typeof d.dueDate.toDate === 'function') dueDate = d.dueDate.toDate().toISOString().split('T')[0];
                    else if (d.dueDate.seconds) dueDate = new Date(d.dueDate.seconds * 1000).toISOString().split('T')[0];
                    else if (typeof d.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) dueDate = d.dueDate;
                  } catch (_) { /* skip */ }
                }
                return {
                  id: tDoc.id, title: d.title || 'ללא כותרת',
                  dueDate, researcherId: d.researcherId || pData.researcherId || '',
                  researchProposalId: collName === 'researchProposals' ? pDoc.id : null,
                  patentId: collName === 'patents' ? pDoc.id : null,
                };
              });
            })
          );
          return all.flat().filter((t) => t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate));
        };

        const [rTasks, pTasks] = await Promise.all([loadTasks('researchProposals'), loadTasks('patents')]);
        const allTasks = [...rTasks, ...pTasks];

        const candidates = allTasks.filter((t) => {
          const due = new Date(t.dueDate);
          return !isNaN(due.getTime()) && due >= now && due <= inSevenDays;
        });
        if (candidates.length === 0) return;

        // Load existing deadline notifications to avoid duplicates
        const existingQ = isAdmin()
          ? query(collection(db, 'notifications'), where('targetRole', '==', 'ADMIN'), where('type', '==', 'task_due_soon'))
          : query(collection(db, 'notifications'), where('userId', '==', user.id), where('type', '==', 'task_due_soon'));
        const existingSnap = await getDocs(existingQ);
        const existingKeys = new Set(existingSnap.docs.map((d) => d.data().eventKey).filter(Boolean));

        const toCreate = [];
        candidates.forEach((task) => {
          const due = new Date(task.dueDate);
          const dueLabel = due.toLocaleDateString('he-IL');
          const link = task.researchProposalId ? `/research/${task.researchProposalId}#tasks` : task.patentId ? `/patents/${task.patentId}` : '';
          const prefix = isAdmin() ? 'admin' : 'researcher';

          const key7 = `${prefix}_task_due_7days:${task.id}:${task.dueDate}`;
          if (!existingKeys.has(key7)) {
            toCreate.push(createNotification({
              userId: isAdmin() ? 'ADMIN' : user.id,
              ...(isAdmin() ? { targetRole: 'ADMIN' } : {}),
              title: 'תזכורת: מועד הגשה בעוד שבוע',
              message: `המשימה "${task.title}" מגיעה למועד ההגשה בעוד כשבוע (${dueLabel}).`,
              type: 'task_due_soon', entityType: 'task', entityId: task.id, link, eventKey: key7
            }));
          }

          if (due <= inTwoDays) {
            const key2 = `${prefix}_task_due_2days:${task.id}:${task.dueDate}`;
            if (!existingKeys.has(key2)) {
              toCreate.push(createNotification({
                userId: isAdmin() ? 'ADMIN' : user.id,
                ...(isAdmin() ? { targetRole: 'ADMIN' } : {}),
                title: 'תזכורת: מועד הגשה מחר-מחרתיים',
                message: `המשימה "${task.title}" מגיעה למועד ההגשה בקרוב מאוד (${dueLabel}).`,
                type: 'task_due_soon', entityType: 'task', entityId: task.id, link, eventKey: key2
              }));
            }
          }
        });

        if (toCreate.length > 0) await Promise.all(toCreate);
      } catch (e) {
        console.warn('Deadline check error:', e);
      }
    };

    checkDeadlines();
  }, [user?.id, isAdmin]);

  // ─── Researcher: outbox (researcher→admin) ───────────────────────────────────
  useEffect(() => {
    if (!db || !user?.id || isAdmin()) return;
    setOutboxLoading(true);
    const q = query(collection(db, 'researcherMessages'), where('fromUserId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      setOutboxMessages(items);
      setOutboxLoading(false);
    }, () => setOutboxLoading(false));
    return () => unsub();
  }, [user?.id, isAdmin]);

  // ─── Researcher: incoming messages from admin ─────────────────────────────────
  useEffect(() => {
    if (!db || !user?.id || isAdmin()) return;
    const q = query(
      collection(db, 'researcherMessages'),
      where('fromAdmin', '==', true),
      where('toUserId', '==', user.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      setResearcherIncoming(items);
    }, () => setResearcherIncoming([]));
    return () => unsub();
  }, [user?.id, isAdmin]);

  // ─── Notification handlers ───────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const handleToggleStar = async (id) => {
    if (!db || !id || !user?.id) return;
    const n = [...notifications, ...adminNotifications].find((x) => x.id === id);
    if (!n) return;
    const isStarred = (n.starredBy || []).includes(user.id);
    await updateDoc(doc(db, 'notifications', id), {
      starredBy: isStarred ? arrayRemove(user.id) : arrayUnion(user.id)
    });
  };

  const handleToggleOutboxStar = async (id) => {
    if (!db || !id) return;
    const m = outboxMessages.find((x) => x.id === id);
    if (!m) return;
    await updateDoc(doc(db, 'researcherMessages', id), { starred: !m.starred });
  };

  const handleToggleOutboxRead = async (id) => {
    if (!db || !id) return;
    const m = outboxMessages.find((x) => x.id === id);
    if (!m) return;
    await updateDoc(doc(db, 'researcherMessages', id), { researcherRead: !m.researcherRead });
  };

  const handleDeleteOutboxThread = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'researcherMessages', id), { deleted: true, starred: false });
    if (selectedOutboxThread === id) setSelectedOutboxThread(null);
  };

  const handleRestoreOutboxThread = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'researcherMessages', id), { deleted: false });
  };

  const handlePermanentDeleteOutboxThread = async (id) => {
    if (!db || !id) return;
    await deleteDoc(doc(db, 'researcherMessages', id));
  };

  const handleDeleteNotification = async (id) => {
    if (!db || !id || !user?.id) return;
    await updateDoc(doc(db, 'notifications', id), {
      deletedBy: arrayUnion(user.id),
      starredBy: arrayRemove(user.id)
    });
  };

  const handleRestoreNotification = async (id) => {
    if (!db || !id || !user?.id) return;
    await updateDoc(doc(db, 'notifications', id), { deletedBy: arrayRemove(user.id) });
  };

  const handlePermanentDelete = async (id) => {
    if (!db || !id || !user?.id) return;
    await updateDoc(doc(db, 'notifications', id), { deletedBy: arrayRemove(user.id) });
  };

  const handleMarkAllRead = async () => {
    if (!db) return;
    const batch = writeBatch(db);
    let hasUpdates = false;
    activeNotifications.forEach((n) => {
      if (!n.read) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
        hasUpdates = true;
      }
    });
    activeResearcherIncoming.forEach((m) => {
      if (m.read === false) {
        batch.update(doc(db, 'researcherMessages', m.id), { read: true });
        hasUpdates = true;
      }
    });
    if (hasUpdates) await batch.commit();
  };

  const handleAdminMarkAllRead = async () => {
    if (!db) return;
    const unread = adminActiveNotifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const handleOpenNotification = async (notification) => {
    if (!notification) return;
    clearInboxSelection();
    if (!notification.read) await handleMarkRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const findAdminMessageThread = (messageId) => {
    const thread = incomingMessages.find((m) => m.id === messageId);
    if (!thread || thread.adminDeleted) return null;
    return thread;
  };

  const openAdminThread = async (threadOrId) => {
    const thread = typeof threadOrId === 'string' ? findAdminMessageThread(threadOrId) : threadOrId;
    if (!thread) return;
    clearInboxSelection();
    if (thread.fromAdmin) {
      setAdminSelectedIncomingThread(null);
      setAdminSelectedOutboxThread(thread.id);
      if (thread.researcherRead === false && db) {
        await updateDoc(doc(db, 'researcherMessages', thread.id), { researcherRead: true });
      }
    } else {
      setAdminSelectedOutboxThread(null);
      setAdminSelectedIncomingThread(thread.id);
      if (thread.read === false && db) {
        await updateDoc(doc(db, 'researcherMessages', thread.id), { read: true });
      }
    }
    if (isAdmin() && db) {
      const related = adminNotifications.filter(
        (n) => n.entityType === 'researcherMessage' && n.entityId === thread.id && !n.read
      );
      if (related.length > 0) {
        const batch = writeBatch(db);
        related.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
        await batch.commit();
      }
    }
  };

  const handleAdminInboxItemClick = async (item) => {
    if (item._kind === 'message') {
      await openAdminThread(item);
      return;
    }
    if (item.entityType === 'researcherMessage' && item.entityId) {
      const thread = findAdminMessageThread(item.entityId);
      if (thread) {
        if (!item.read) await handleMarkRead(item.id);
        await openAdminThread(thread);
        return;
      }
    }
    await handleOpenNotification(item);
  };

  // ─── Admin: send to researchers ──────────────────────────────────────────────
  const handleToggleResearcher = (id) =>
    setSelectedResearcherIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSelectAllResearchers = () =>
    setSelectedResearcherIds(
      selectedResearcherIds.length === researchers.length ? [] : researchers.map((r) => r.id)
    );

  const handleSendImportant = async () => {
    if (selectedResearcherIds.length === 0 || !importantMessage.trim()) return;
    setSending(true);
    try {
      await Promise.all(
        selectedResearcherIds.map((uid) => {
          const researcher = researchers.find((r) => r.id === uid);
          return addDoc(collection(db, 'researcherMessages'), {
            fromAdmin: true,
            fromUserName: user?.name || t('researchAuthority'),
            toUserId: uid,
            toUserName: researcher?.name || t('researcher'),
            title: importantTitle.trim() || t('notifDefaultImportantTitle'),
            message: importantMessage.trim(),
            createdAt: serverTimestamp(),
            read: false,
            researcherRead: false,
            replies: [],
            starred: false,
            adminStarred: false,
            adminDeleted: false,
            deleted: false
          });
        })
      );
      setImportantTitle('');
      setImportantMessage('');
      setSelectedResearcherIds([]);
      setRecipientSearch('');
      setRecipientDropdownOpen(false);
      setActiveTab('outbox');
    } finally {
      setSending(false);
    }
  };

  // ─── Admin: incoming message handlers ────────────────────────────────────────
  const handleMarkIncomingRead = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'researcherMessages', id), { read: true });
  };

  const handleDeleteIncoming = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'researcherMessages', id), { adminDeleted: true, adminStarred: false });
  };

  // ─── Admin: outbox (conversations) handlers ───────────────────────────────────
  const handleToggleAdminOutboxStar = async (id) => {
    if (!db || !id) return;
    const m = incomingMessages.find((x) => x.id === id);
    if (!m) return;
    await updateDoc(doc(db, 'researcherMessages', id), { adminStarred: !m.adminStarred });
  };

  const handleToggleAdminOutboxRead = async (id) => {
    if (!db || !id) return;
    const m = incomingMessages.find((x) => x.id === id);
    if (!m) return;
    await updateDoc(doc(db, 'researcherMessages', id), { read: !m.read });
  };

  const handleDeleteAdminOutboxThread = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'researcherMessages', id), { adminDeleted: true, adminStarred: false });
    if (adminSelectedOutboxThread === id) setAdminSelectedOutboxThread(null);
  };

  const handleRestoreAdminOutboxThread = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'researcherMessages', id), { adminDeleted: false });
  };

  const handlePermanentDeleteAdminOutboxThread = async (id) => {
    if (!db || !id) return;
    await deleteDoc(doc(db, 'researcherMessages', id));
  };

  // ─── Researcher: send new message ────────────────────────────────────────────
  const handleSendToAuthority = async () => {
    if (!composeMessage.trim() || !user?.id) return;
    setComposeSending(true);
    try {
      await addDoc(collection(db, 'researcherMessages'), {
        fromUserId: user.id,
        fromUserName: user.name || 'חוקר',
        title: composeTitle.trim() || 'הודעה מחוקר',
        message: composeMessage.trim(),
        createdAt: serverTimestamp(),
        read: false,
        researcherRead: true,
        replies: []
      });
      setComposeTitle('');
      setComposeMessage('');
      setActiveTab('outbox');
    } finally {
      setComposeSending(false);
    }
  };

  // ─── Reply to a thread (admin or researcher) ─────────────────────────────────
  const handleReply = async (threadId, fromAdminSide) => {
    const text = (replyInputs[threadId] || '').trim();
    if (!text || !db) return;
    setReplySending(threadId);
    try {
      const reply = {
        text,
        fromName: fromAdminSide ? t('researchAuthority') : (user.name || t('researcher')),
        fromRole: fromAdminSide ? 'admin' : 'researcher',
        fromUserId: user.id,
        createdAt: Date.now()
      };
      const updates = {
        replies: arrayUnion(reply),
        ...(fromAdminSide
          ? { read: true, researcherRead: false }
          : { read: false, researcherRead: true })
      };
      await updateDoc(doc(db, 'researcherMessages', threadId), updates);
      if (!fromAdminSide) {
        const thread =
          researcherIncoming.find((m) => m.id === threadId) ||
          outboxMessages.find((m) => m.id === threadId);
        if (thread?.fromAdmin) {
          await createNotification({
            userId: 'ADMIN',
            title: `${t('notifNewReply')} — ${user?.name || t('researcher')}`,
            message: `${user?.name || t('researcher')}: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
            type: 'message',
            entityType: 'researcherMessage',
            entityId: threadId,
            link: '/notifications',
            eventKey: `researcher_reply:${threadId}:${Date.now()}`,
            targetRole: 'ADMIN'
          });
        }
      }
      setReplyInputs((prev) => ({ ...prev, [threadId]: '' }));
    } finally {
      setReplySending(null);
    }
  };

  // When researcher expands a thread with unread admin replies → mark as read
  const handleExpandThread = async (threadId, thread) => {
    if (expandedThread === threadId) {
      setExpandedThread(null);
      return;
    }
    setExpandedThread(threadId);
    if (!isAdmin() && thread?.researcherRead === false && db) {
      await updateDoc(doc(db, 'researcherMessages', threadId), { researcherRead: true });
    }
    if (isAdmin() && thread?.read === false && db) {
      await updateDoc(doc(db, 'researcherMessages', threadId), { read: true });
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return '';
    if (typeof ts === 'number') return new Date(ts).toLocaleString(dateLocale);
    return ts?.toDate ? ts.toDate().toLocaleString(dateLocale) : '';
  };

  const shortDate = (ts) => {
    if (!ts) return '';
    const d = typeof ts === 'number' ? new Date(ts) : ts?.toDate?.();
    if (!d) return '';
    return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const filteredResearchers = researchers.filter((r) => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return true;
    return (r.name || '').toLowerCase().includes(q);
  });

  const selectedResearchers = researchers.filter((r) => selectedResearcherIds.includes(r.id));

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedOutboxThread(null);
    setSelectedIncomingThread(null);
    setSelectedInboxKeys([]);
    setInboxTypeFilter(null);
  };

  const getMessageTime = (ts) => {
    if (typeof ts === 'number') return ts;
    return ts?.toDate?.()?.getTime?.() || 0;
  };

  const inboxKey = (kind, id) => `${kind}:${id}`;

  const parseInboxKey = (key) => {
    const sep = key.indexOf(':');
    return { kind: key.slice(0, sep), id: key.slice(sep + 1) };
  };

  const isReminderNotification = (item) =>
    item._kind === 'notification' && item.type === 'task_due_soon';

  const getInboxItemType = (item) => {
    if (item._kind === 'message' || item.type === 'message') return 'message';
    if (item.type === 'task_due_soon') return 'reminder';
    return 'system';
  };

  const filterInboxByType = (items, filter) => {
    if (!filter) return items;
    return items.filter((item) => getInboxItemType(item) === filter);
  };

  const getInboxItemMeta = (item) => {
    if (item._kind === 'message' || item.type === 'message') {
      return { icon: '✉️', className: 'mail-type-icon--message', label: t('notifTypeMessage') };
    }
    if (isReminderNotification(item)) {
      return { icon: '⏰', className: 'mail-type-icon--reminder', label: t('notifTypeReminder') };
    }
    return { icon: '📋', className: 'mail-type-icon--system', label: t('notifTypeSystem') };
  };

  const getThreadLastActivityTime = (thread) => {
    const replies = thread.replies || [];
    if (replies.length > 0) return getMessageTime(replies[replies.length - 1].createdAt);
    return getMessageTime(thread.createdAt);
  };

  const getThreadPreviewText = (thread) => {
    const replies = thread.replies || [];
    if (replies.length > 0) return replies[replies.length - 1].text;
    return thread.message || '';
  };

  const buildAdminInboxItems = (received, sent, notifications) => {
    const threadIds = new Set();
    const threadItems = [];

    received.forEach((m) => {
      threadIds.add(m.id);
      threadItems.push({
        ...m,
        _kind: 'message',
        _sortTime: getThreadLastActivityTime(m),
        _listPreview: getThreadPreviewText(m),
      });
    });

    sent.forEach((m) => {
      if ((m.replies || []).length > 0 && !threadIds.has(m.id)) {
        threadIds.add(m.id);
        threadItems.push({
          ...m,
          _kind: 'message',
          _sortTime: getThreadLastActivityTime(m),
          _listPreview: getThreadPreviewText(m),
        });
      }
    });

    const notifItems = notifications
      .filter((n) => {
        if (n.entityType === 'researcherMessage') return false;
        if (n.entityId && threadIds.has(n.entityId)) return false;
        return true;
      })
      .map((n) => ({ ...n, _kind: 'notification', _sortTime: getMessageTime(n.createdAt) }));

    return [...threadItems, ...notifItems].sort((a, b) => b._sortTime - a._sortTime);
  };

  const buildInboxItems = (messages = [], notifications = []) =>
    [
      ...messages.map((m) => ({
        ...m,
        _kind: 'message',
        _sortTime: getThreadLastActivityTime(m),
        _listPreview: getThreadPreviewText(m),
      })),
      ...notifications.map((n) => ({ ...n, _kind: 'notification', _sortTime: getMessageTime(n.createdAt) })),
    ].sort((a, b) => b._sortTime - a._sortTime);

  const isInboxItemUnread = (item) => {
    if (item._kind === 'message') {
      if (item.fromAdmin && isAdmin()) {
        return (item.replies || []).length > 0 && item.researcherRead === false;
      }
      return item.read === false;
    }
    return !item.read;
  };

  const toggleInboxSelection = (key) => {
    setSelectedInboxKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const clearInboxSelection = () => setSelectedInboxKeys([]);

  const toggleSelectAllInbox = (items) => {
    const keys = items.map((item) => inboxKey(item._kind, item.id));
    const allSelected = keys.length > 0 && keys.every((k) => selectedInboxKeys.includes(k));
    setSelectedInboxKeys(allSelected ? [] : keys);
  };

  const handleBulkMarkReadInbox = async (keys) => {
    if (!db || keys.length === 0) return;
    const batch = writeBatch(db);
    keys.forEach((key) => {
      const { kind, id } = parseInboxKey(key);
      if (kind === 'notification') {
        batch.update(doc(db, 'notifications', id), { read: true });
      } else if (kind === 'message') {
        batch.update(doc(db, 'researcherMessages', id), { read: true });
      }
    });
    await batch.commit();
    clearInboxSelection();
  };

  const handleBulkTrashInbox = async (keys, { adminMode = false } = {}) => {
    if (!db || keys.length === 0) return;
    const batch = writeBatch(db);
    keys.forEach((key) => {
      const { kind, id } = parseInboxKey(key);
      if (kind === 'notification') {
        batch.update(doc(db, 'notifications', id), {
          deletedBy: arrayUnion(uid),
          starredBy: arrayRemove(uid),
        });
      } else if (kind === 'message') {
        batch.update(doc(db, 'researcherMessages', id), adminMode
          ? { adminDeleted: true, adminStarred: false }
          : { deleted: true, starredBy: arrayRemove(uid) });
      }
    });
    await batch.commit();
    clearInboxSelection();
  };

  const openResearcherIncomingThread = async (thread) => {
    clearInboxSelection();
    setSelectedIncomingThread(thread.id);
    if (thread.read === false && db) {
      await updateDoc(doc(db, 'researcherMessages', thread.id), { read: true });
    }
  };

  const uid = user?.id;
  const activeNotifications = notifications.filter((n) => !(n.deletedBy || []).includes(uid));
  const trashedNotifications = notifications.filter((n) => (n.deletedBy || []).includes(uid));
  const activeOutboxMessages = outboxMessages.filter((m) => !m.deleted);
  const trashedOutboxMessages = outboxMessages.filter((m) => m.deleted === true);
  const activeResearcherIncoming  = researcherIncoming.filter((m) => !m.deleted);
  const trashedResearcherIncoming = researcherIncoming.filter((m) => m.deleted === true);
  const unreadResearcherIncoming  = activeResearcherIncoming.filter((m) => m.read === false).length;
  const unreadCount = activeNotifications.filter((n) => !n.read).length + unreadResearcherIncoming;
  const unreadRepliesCount = activeOutboxMessages.filter((m) => m.researcherRead === false).length;
  const starredNotifications = activeNotifications.filter((n) => (n.starredBy || []).includes(uid));
  const starredOutbox = activeOutboxMessages.filter((m) => m.starred);
  const starredIncoming = activeResearcherIncoming.filter((m) => (m.starredBy || []).includes(uid));
  const starredCount = starredNotifications.length + starredOutbox.length + starredIncoming.length;
  const totalTrashedCount = trashedNotifications.length + trashedOutboxMessages.length + trashedResearcherIncoming.length;

  // ─── Sub-components ───────────────────────────────────────────────────────────
  const MessageBubble = ({ text, fromName, fromRole, date, isOwn }) => (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-start' : 'flex-end', marginBottom: '8px' }}>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isOwn ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isOwn ? '#3b5bdb' : '#f1f3f5',
        color: isOwn ? 'white' : '#333',
        textAlign: 'right'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: isOwn ? 'rgba(255,255,255,0.75)' : '#888' }}>
          {fromName}{fromRole === 'admin' ? ` — ${t('researchAuthority')}` : ''}
        </div>
        <div style={{ lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: '11px', marginTop: '5px', color: isOwn ? 'rgba(255,255,255,0.55)' : '#aaa' }}>
          {formatDate(date)}
        </div>
      </div>
    </div>
  );

  const renderThreadView = (thread, isAdminSide) => {
    const sortedReplies = (thread.replies || []).slice().sort((a, b) => a.createdAt - b.createdAt);
    const replyText = replyInputs[thread.id] || '';
    const isSending = replySending === thread.id;

    return (
      <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        <MessageBubble
          text={thread.message}
          fromName={thread.fromUserName}
          fromRole="researcher"
          date={thread.createdAt}
          isOwn={!isAdminSide}
        />
        {sortedReplies.map((r, i) => (
          <MessageBubble
            key={i}
            text={r.text}
            fromName={r.fromName}
            fromRole={r.fromRole}
            date={r.createdAt}
            isOwn={isAdminSide ? r.fromRole === 'admin' : r.fromRole === 'researcher'}
          />
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'flex-end' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReply(thread.id, isAdminSide);
              }
            }}
            placeholder={t('notifReplyPlaceholder')}
            rows={2}
            style={{
              flex: 1, padding: '9px', borderRadius: '8px',
              border: '1px solid #cbd5e0', fontSize: '14px',
              resize: 'none'
            }}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <button
            type="button"
            onClick={() => handleReply(thread.id, isAdminSide)}
            disabled={!replyText.trim() || isSending}
            style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none',
              background: !replyText.trim() || isSending ? '#ccc' : '#3b5bdb',
              color: 'white', cursor: !replyText.trim() || isSending ? 'not-allowed' : 'pointer',
              fontSize: '14px', whiteSpace: 'nowrap'
            }}
          >
            {isSending ? '...' : t('notifSendBtn')}
          </button>
        </div>
      </div>
    );
  };

  const StarButton = ({ starred, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      title={starred ? t('notifRemoveStar') : t('notifAddStar')}
      style={{
        width: '24px', height: '24px', flexShrink: 0, border: 'none',
        background: 'transparent', cursor: 'pointer', padding: 0,
        fontSize: '16px', lineHeight: 1,
        color: starred ? '#f59e0b' : '#cbd5e0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color 0.15s'
      }}
    >
      {starred ? '★' : '☆'}
    </button>
  );

  const NotificationCard = ({ n }) => (
    <div style={{
      textAlign: 'right', padding: '14px 16px',
      background: n.read ? 'transparent' : '#fff7e6',
      border: `1px solid ${n.read ? '#e2e8f0' : '#ffd59e'}`,
      borderRadius: '8px', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: '10px'
    }}>
      {/* Mark-read checkbox */}
      <button
        type="button"
        onClick={() => { if (!n.read) handleMarkRead(n.id); }}
        title="סמן כנקרא"
        disabled={n.read}
        style={{
          width: '22px', height: '22px', flexShrink: 0, borderRadius: '4px',
          border: '1px solid #cbd5e0', background: 'transparent', color: '#333',
          cursor: n.read ? 'default' : 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {n.read ? '✓' : ''}
      </button>
      {/* Star */}
      <StarButton starred={(n.starredBy || []).includes(uid)} onToggle={() => handleToggleStar(n.id)} />
      {/* Content */}
      <button
        type="button"
        onClick={() => handleOpenNotification(n)}
        style={{
          textAlign: 'right', background: 'transparent', border: 'none',
          padding: 0, cursor: n.link ? 'pointer' : 'default', flex: 1
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{n.title}</div>
        <div style={{ color: '#555', marginBottom: '4px' }}>{n.message}</div>
        {n.createdAt?.toDate && (
          <div style={{ fontSize: '12px', color: '#999' }}>{formatDate(n.createdAt)}</div>
        )}
      </button>
    </div>
  );

  const renderMailConversationView = ({
    thread,
    backLabel,
    onBack,
    starred,
    onToggleStar,
    initialFromRole,
    initialFromName,
    onReply,
  }) => {
    if (!thread) return null;
    const replyText = replyInputs[thread.id] || '';
    const isSending = replySending === thread.id;
    const allMsgs = [
      {
        text: thread.message,
        fromName: initialFromName,
        fromRole: initialFromRole,
        createdAt: thread.createdAt,
      },
      ...(thread.replies || []).map((r) => ({
        text: r.text,
        fromName: r.fromName,
        fromRole: r.fromRole,
        createdAt: r.createdAt,
      })),
    ].sort((a, b) => getMessageTime(a.createdAt) - getMessageTime(b.createdAt));

    return (
      <div>
        <button type="button" onClick={onBack} className="mail-thread-back">
          {isRTL ? '→' : '←'} {backLabel}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {onToggleStar && <StarButton starred={!!starred} onToggle={onToggleStar} />}
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#202124', flex: 1 }}>
            {thread.title || t('notifUntitledMessage')}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allMsgs.map((msg, i) => {
            const isAdmin = msg.fromRole === 'admin';
            return (
              <div key={i} className={`mail-message${isAdmin ? ' is-admin' : ' is-researcher'}`}>
                <div className="mail-message-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={`mail-message-avatar${isAdmin ? ' is-admin' : ' is-researcher'}`}>
                      {(msg.fromName || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>
                        {msg.fromName}{isAdmin ? ` — ${t('researchAuthority')}` : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{formatDate(msg.createdAt)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ lineHeight: 1.7, color: '#333', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            );
          })}
        </div>

        <div className="mail-reply-bar">
          <textarea
            value={replyText}
            onChange={(e) => setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onReply(thread.id);
              }
            }}
            placeholder={t('notifReplyPlaceholder')}
            rows={3}
            className="mail-reply-input"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <button
            type="button"
            onClick={() => onReply(thread.id)}
            disabled={!replyText.trim() || isSending}
            className="mail-reply-btn"
          >
            {isSending ? t('notifSending') : t('notifSendBtn')}
          </button>
        </div>
      </div>
    );
  };

  // ── Admin computed ────────────────────────────────────────────────────────────
  const adminActiveNotifications = adminNotifications.filter((n) => !(n.deletedBy || []).includes(uid));
  const adminTrashedNotifications = adminNotifications.filter((n) => (n.deletedBy || []).includes(uid));
  const adminStarredNotifications = adminActiveNotifications.filter((n) => (n.starredBy || []).includes(uid));
  const adminUnreadCount = adminActiveNotifications.filter((n) => !n.read).length;

  // Split researcherMessages: admin-sent (fromAdmin:true) vs researcher-sent (!fromAdmin)
  const adminSentMessages      = incomingMessages.filter((m) => m.fromAdmin === true);
  const adminReceivedMessages  = incomingMessages.filter((m) => !m.fromAdmin);

  const adminActiveSent        = adminSentMessages.filter((m) => !m.adminDeleted);
  const adminTrashedSent       = adminSentMessages.filter((m) => m.adminDeleted === true);
  const adminStarredSent       = adminActiveSent.filter((m) => m.adminStarred === true);

  const adminActiveReceived    = adminReceivedMessages.filter((m) => !m.adminDeleted);
  const adminTrashedReceived   = adminReceivedMessages.filter((m) => m.adminDeleted === true);
  const adminStarredReceived   = adminActiveReceived.filter((m) => m.adminStarred === true);

  const adminActiveIncoming    = adminActiveReceived;   // for backward-compat references
  const adminTrashedIncoming   = [...adminTrashedSent, ...adminTrashedReceived];
  const adminStarredIncoming   = [...adminStarredSent, ...adminStarredReceived];

  const adminStarredCount = adminStarredNotifications.length + adminStarredIncoming.length;
  const adminTrashedCount = adminTrashedNotifications.length + adminTrashedIncoming.length;

  const MailInboxList = ({
    items,
    onItemClick,
    adminMode = false,
    showStar = true,
    onToggleStar,
    getStarred,
    getRowExtra,
    typeFilter = null,
    onTypeFilterChange,
  }) => {
    if (items.length === 0 && !typeFilter) return null;
    const visibleItems = filterInboxByType(items, typeFilter);
    const itemKeys = visibleItems.map((item) => inboxKey(item._kind, item.id));
    const selectedInView = selectedInboxKeys.filter((k) => itemKeys.includes(k));
    const selectedCount = selectedInView.length;
    const allSelected = itemKeys.length > 0 && selectedCount === itemKeys.length;
    const someSelected = selectedCount > 0 && !allSelected;

    const typeFilters = [
      { key: 'reminder', icon: '⏰', className: 'mail-type-icon--reminder', label: t('notifTypeReminder') },
      { key: 'message', icon: '✉️', className: 'mail-type-icon--message', label: t('notifTypeMessage') },
      { key: 'system', icon: '📋', className: 'mail-type-icon--system', label: t('notifTypeSystem') },
    ];

    return (
      <>
        <div className="mail-list-toolbar">
          <label className="mail-select-all" title={t('selectAll')}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={() => toggleSelectAllInbox(visibleItems)}
              disabled={visibleItems.length === 0}
            />
          </label>
          {selectedCount > 0 ? (
            <div className="mail-bulk-actions">
              <span className="mail-bulk-count">
                {t('notifSelectedCount').replace('{count}', selectedCount)}
              </span>
              <button
                type="button"
                className="mail-bulk-btn"
                onClick={() => handleBulkMarkReadInbox(selectedInView)}
              >
                {t('notifMarkRead')}
              </button>
              <button
                type="button"
                className="mail-bulk-btn mail-bulk-btn--danger"
                onClick={() => handleBulkTrashInbox(selectedInView, { adminMode })}
              >
                {t('notifMoveToTrash')}
              </button>
            </div>
          ) : (
            <div className="mail-type-legend">
              {typeFilters.map(({ key, icon, className, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`mail-type-filter-btn${typeFilter === key ? ' is-active' : ''}`}
                  onClick={() => onTypeFilterChange?.(typeFilter === key ? null : key)}
                  title={label}
                >
                  <span className={`mail-type-icon ${className}`}>{icon}</span>
                  {label}
                </button>
              ))}
              {typeFilter && (
                <button
                  type="button"
                  className="mail-type-clear-filter"
                  onClick={() => onTypeFilterChange?.(null)}
                >
                  {t('notifShowAll')}
                </button>
              )}
            </div>
          )}
        </div>
        {visibleItems.length === 0 ? (
          <p className="mail-empty">{t('notifNoFilteredItems')}</p>
        ) : (
        <div className="mail-list">
          {visibleItems.map((item) => {
            const key = inboxKey(item._kind, item.id);
            const isSelected = selectedInboxKeys.includes(key);
            const isUnread = isInboxItemUnread(item);
            const meta = getInboxItemMeta(item);
            const itemType = getInboxItemType(item);
            const replyCount = (item.replies || []).length;
            const preview = item._listPreview ?? item.message ?? '';

            return (
              <div
                key={key}
                className={`mail-row${isUnread ? ' is-unread' : ''}${isSelected ? ' is-selected' : ''}`}
                onClick={() => onItemClick(item)}
              >
                <label className="mail-row-select" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleInboxSelection(key)}
                  />
                </label>
                <button
                  type="button"
                  className={`mail-type-icon-btn ${meta.className}${typeFilter === itemType ? ' is-active' : ''}`}
                  title={meta.label}
                  aria-label={meta.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTypeFilterChange?.(typeFilter === itemType ? null : itemType);
                  }}
                >
                  {meta.icon}
                </button>
                {showStar && onToggleStar && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <StarButton starred={!!getStarred?.(item)} onToggle={() => onToggleStar(item)} />
                  </div>
                )}
                <div className="mail-row-content">
                  <span style={{ fontWeight: isUnread ? 700 : 600, color: '#202124', marginInlineEnd: '6px' }}>
                    {item.title || t('notifUntitledMessage')}
                  </span>
                  {getRowExtra?.(item)}
                  {isUnread && (
                    <span className="mail-badge mail-badge--new" style={{ marginInlineStart: '6px' }}>
                      {t('notifNew')}
                    </span>
                  )}
                  {preview && (
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                      {' — '}{preview.length > 60 ? `${preview.slice(0, 60)}...` : preview}
                    </span>
                  )}
                  {replyCount > 0 && (
                    <span style={{ color: '#888', fontSize: '12px', marginInlineStart: '6px' }}>
                      ({replyCount})
                    </span>
                  )}
                </div>
                <span className={`mail-row-meta${isUnread ? ' is-unread' : ''}`}>
                  {shortDate(item.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
        )}
      </>
    );
  };


  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
  if (isAdmin()) {
    const adminTabLabels = {
      all: t('notifInbox'),
      starred: t('notifStarred'),
      incoming: t('notifIncoming'),
      outbox: t('notifOutbox'),
      send: t('notifSend'),
      deleted: t('notifDeleted'),
    };
    const adminSidebarItems = [
      { key: 'all',      label: t('notifInbox'),    count: adminUnreadCount,  countColor: '#c0392b' },
      { key: 'starred',  label: t('notifStarred'),  count: adminStarredCount, countColor: '#f59e0b' },
      { key: 'incoming', label: t('notifIncoming'), count: unreadIncoming,    countColor: '#c0392b' },
      { key: 'outbox',   label: t('notifOutbox'),   count: adminActiveSent.filter((m) => (m.replies || []).length > 0 && m.researcherRead === false).length, countColor: '#c0392b' },
      { key: 'deleted',  label: t('notifDeleted'),  count: adminTrashedCount, countColor: '#868e96' },
    ];
    const adminSelectedThread = adminActiveSent.find((m) => m.id === adminSelectedOutboxThread);
    const adminSelectedIncoming = adminActiveReceived.find((m) => m.id === adminSelectedIncomingThread);
    const adminOpenThread = adminSelectedIncomingThread
      ? adminActiveReceived.find((m) => m.id === adminSelectedIncomingThread)
      : adminSelectedOutboxThread
      ? adminActiveSent.find((m) => m.id === adminSelectedOutboxThread)
      : null;
    const adminContentTitle = activeTab === 'all' && adminOpenThread
      ? (adminOpenThread.title || t('notifInbox'))
      : activeTab === 'outbox' && adminSelectedOutboxThread
      ? (adminSelectedThread?.title || t('notifOutbox'))
      : activeTab === 'incoming' && adminSelectedIncomingThread
      ? (adminSelectedIncoming?.title || t('notifIncoming'))
      : adminTabLabels[activeTab] || t('notifTitle');
    const switchAdminTab = (tab) => {
      setActiveTab(tab);
      setAdminSelectedOutboxThread(null);
      setAdminSelectedIncomingThread(null);
      setSelectedInboxKeys([]);
      setInboxTypeFilter(null);
    };
    const allResearchersSelected = selectedResearcherIds.length === researchers.length && researchers.length > 0;
    const canSendMessage = selectedResearcherIds.length > 0 && importantMessage.trim() && !sending;
    const adminInboxItems = buildAdminInboxItems(
      adminActiveReceived,
      adminActiveSent,
      adminActiveNotifications
    );

    return (
      <div className="page-container">
        <div className="mail-app">

          <div className="mail-shell">

            <aside className="mail-sidebar">
              <button
                type="button"
                className="mail-compose-btn"
                onClick={() => switchAdminTab('send')}
              >
                + {t('notifComposeToResearchers')}
              </button>

              <nav>
                {adminSidebarItems.map((item) => {
                  const isActive = activeTab === item.key;
                  const unreadOutboxReplies = adminActiveSent.filter((m) => (m.replies || []).length > 0 && m.researcherRead === false).length;
                  const hasAlert = !isActive && (
                    (item.key === 'incoming' && unreadIncoming > 0) ||
                    (item.key === 'outbox' && unreadOutboxReplies > 0)
                  );
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => switchAdminTab(item.key)}
                      className={`mail-nav-item${isActive ? ' is-active' : ''}${hasAlert ? ' has-alert' : ''}`}
                    >
                      <span>{item.label}</span>
                      {item.count > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#1a56db' : item.countColor }}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="mail-main">

              <div className="mail-header">
                <h2>{adminContentTitle}</h2>
                {activeTab === 'all' && adminUnreadCount > 0 && (
                  <button type="button" onClick={handleAdminMarkAllRead} className="mail-header-action mail-header-action--muted">
                    {t('notifMarkAllRead')}
                  </button>
                )}
                {activeTab === 'deleted' && adminTrashedCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const batch = writeBatch(db);
                      adminTrashedNotifications.forEach((n) =>
                        batch.update(doc(db, 'notifications', n.id), { deletedBy: arrayRemove(uid) })
                      );
                      adminTrashedIncoming.forEach((m) =>
                        batch.update(doc(db, 'researcherMessages', m.id), { adminDeleted: false })
                      );
                      await batch.commit();
                    }}
                    className="mail-header-action mail-header-action--danger"
                  >
                    {t('notifEmptyTrash')}
                  </button>
                )}
              </div>

              {activeTab === 'all' && adminOpenThread &&
                renderMailConversationView({
                  thread: adminOpenThread,
                  backLabel: t('notifBackToInbox'),
                  onBack: () => {
                    setAdminSelectedIncomingThread(null);
                    setAdminSelectedOutboxThread(null);
                  },
                  starred: !!adminOpenThread.adminStarred,
                  onToggleStar: () => handleToggleAdminOutboxStar(adminOpenThread.id),
                  initialFromRole: adminOpenThread.fromAdmin ? 'admin' : 'researcher',
                  initialFromName: adminOpenThread.fromAdmin
                    ? (adminOpenThread.fromUserName || t('researchAuthority'))
                    : (adminOpenThread.fromUserName || t('researcher')),
                  onReply: (threadId) => handleReply(threadId, true),
                })}

              {activeTab === 'all' && !adminOpenThread && (
                <div>
                  {adminNotifLoading && <p className="mail-empty">{t('notifLoading')}</p>}
                  {!adminNotifLoading && adminInboxItems.length === 0 && (
                    <p className="mail-empty">{t('notifNoNotifications')}</p>
                  )}
                  <MailInboxList
                    items={adminInboxItems}
                    onItemClick={(item) => handleAdminInboxItemClick(item)}
                    showStar
                    onToggleStar={(item) => {
                      if (item._kind === 'message') handleToggleAdminOutboxStar(item.id);
                      else handleToggleStar(item.id);
                    }}
                    getStarred={(item) =>
                      item._kind === 'message'
                        ? !!item.adminStarred
                        : (item.starredBy || []).includes(uid)
                    }
                    getRowExtra={(item) => {
                      if (item._kind !== 'message') return null;
                      if (item.fromAdmin) {
                        return (
                          <span style={{ color: '#888', fontSize: '13px', marginInlineEnd: '6px' }}>
                            {t('notifTo')}: {item.toUserName || t('researcher')}
                          </span>
                        );
                      }
                      return (
                        <span style={{ color: '#888', fontSize: '13px', marginInlineEnd: '6px' }}>
                          {t('notifFrom')}: {item.fromUserName}
                        </span>
                      );
                    }}
                    typeFilter={inboxTypeFilter}
                    onTypeFilterChange={setInboxTypeFilter}
                  />
                </div>
              )}

              {activeTab === 'starred' && (
                <div>
                  {adminStarredCount === 0 && (
                    <p className="mail-empty">{t('notifNoStarred')}</p>
                  )}
                  {adminStarredNotifications.length > 0 && (
                    <>
                      <div className="mail-section-label">{t('notifSectionNotifications')}</div>
                      <div className="mail-cards-stack">
                        {adminStarredNotifications.map((n) => (
                          <NotificationCard key={n.id} n={n} />
                        ))}
                      </div>
                    </>
                  )}
                  {adminStarredIncoming.length > 0 && (
                    <>
                      <div className="mail-section-label">{t('notifSectionConversations')}</div>
                      <div className="mail-cards-stack">
                        {adminStarredIncoming.map((m) => {
                          const isExpanded = expandedThread === m.id;
                          const replyCount = (m.replies || []).length;
                          return (
                            <div key={m.id} style={{
                              borderRadius: '8px', textAlign: 'right',
                              background: !m.read ? '#f0f4ff' : 'white',
                              border: `1px solid ${!m.read ? '#bac8ff' : '#e2e8f0'}`
                            }}>
                              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <StarButton starred={true} onToggle={() => handleToggleAdminOutboxStar(m.id)} />
                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleExpandThread(m.id, m)}>
                                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                    {m.title}
                                    {!m.read && (
                                      <span className="mail-badge mail-badge--new" style={{ marginInlineStart: '6px' }}>
                                        {t('notifNew')}
                                      </span>
                                    )}
                                  </div>
                                  {!isExpanded && (
                                    <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                                      {m.message.length > 100 ? m.message.slice(0, 100) + '...' : m.message}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <span style={{ color: m.fromUserName ? '#555' : '#999' }}>{t('notifFrom')}: {m.fromUserName}</span>
                                    {replyCount > 0 && <span>{replyCount} {t('notifReplies')}</span>}
                                    <span>{formatDate(m.createdAt)}</span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, cursor: 'pointer' }} onClick={() => handleExpandThread(m.id, m)}>
                                  {isExpanded ? '▲' : '▼'}
                                </span>
                              </div>
                              {isExpanded && (
                                <div style={{ paddingInline: '16px', paddingBottom: '16px' }}>
                                  {renderThreadView(m, true)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'incoming' && adminSelectedIncomingThread &&
                renderMailConversationView({
                  thread: adminSelectedIncoming,
                  backLabel: t('notifIncoming'),
                  onBack: () => setAdminSelectedIncomingThread(null),
                  starred: !!adminSelectedIncoming?.adminStarred,
                  onToggleStar: () => adminSelectedIncoming && handleToggleAdminOutboxStar(adminSelectedIncoming.id),
                  initialFromRole: 'researcher',
                  initialFromName: adminSelectedIncoming?.fromUserName || t('researcher'),
                  onReply: (threadId) => handleReply(threadId, true),
                })}

              {activeTab === 'incoming' && !adminSelectedIncomingThread && (
                <div>
                  {incomingLoading && <p className="mail-empty">{t('notifLoading')}</p>}
                  {!incomingLoading && adminActiveReceived.length === 0 && (
                    <p className="mail-empty">{t('notifNoIncoming')}</p>
                  )}
                  <MailInboxList
                    items={buildInboxItems(adminActiveReceived, [])}
                    adminMode
                    onItemClick={(item) => openAdminThread(item)}
                    showStar={false}
                    getRowExtra={(item) => (
                      <span style={{ color: '#888', fontSize: '13px', marginInlineEnd: '6px' }}>
                        {t('notifFrom')}: {item.fromUserName}
                      </span>
                    )}
                    typeFilter={inboxTypeFilter}
                    onTypeFilterChange={setInboxTypeFilter}
                  />
                </div>
              )}

              {activeTab === 'outbox' && !adminSelectedOutboxThread && (
                <div>
                  {incomingLoading && <p className="mail-empty">{t('notifLoading')}</p>}
                  {!incomingLoading && adminActiveSent.length === 0 && (
                    <p className="mail-empty">{t('notifNoSentYet')}</p>
                  )}
                  <div className="mail-list">
                    {adminActiveSent.map((thread, idx) => {
                      const replyCount = (thread.replies || []).length;
                      const hasUnreadReply = replyCount > 0 && thread.researcherRead === false;
                      const lastReply = replyCount > 0 ? thread.replies[thread.replies.length - 1] : null;
                      const preview = lastReply ? lastReply.text : thread.message;
                      return (
                        <div
                          key={thread.id}
                          onClick={async () => {
                            setAdminSelectedOutboxThread(thread.id);
                            if (hasUnreadReply) {
                              await updateDoc(doc(db, 'researcherMessages', thread.id), { researcherRead: true });
                            }
                          }}
                          className={`mail-row${hasUnreadReply ? ' is-unread' : ''}`}
                        >
                          {/* Star */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <StarButton starred={!!thread.adminStarred} onToggle={() => handleToggleAdminOutboxStar(thread.id)} />
                          </div>
                          {/* Recipient + title + preview */}
                          <div className="mail-row-content">
                            <span style={{ fontWeight: hasUnreadReply ? 700 : 600, color: '#202124', marginInlineEnd: '6px' }}>
                              {t('notifTo')}: {thread.toUserName || t('researcher')}
                            </span>
                            <span style={{ fontWeight: hasUnreadReply ? 700 : 600, color: '#202124', marginLeft: '6px' }}>
                              {thread.title}
                              {replyCount > 0 && <span style={{ fontWeight: 400, color: '#888', fontSize: '12px', marginRight: '4px' }}>({replyCount})</span>}
                            </span>
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>
                              — {preview.length > 60 ? preview.slice(0, 60) + '...' : preview}
                            </span>
                          </div>
                          {/* Reply status */}
                          {hasUnreadReply && (
                            <span className="mail-badge">{t('notifNewReply')}</span>
                          )}
                          <span className={`mail-row-meta${hasUnreadReply ? ' is-unread' : ''}`}>
                            {shortDate(thread.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── דואר יוצא – detail view ── */}
              {activeTab === 'outbox' && adminSelectedOutboxThread && (() => {
                const thread = adminActiveSent.find((m) => m.id === adminSelectedOutboxThread);
                if (!thread) return null;
                const allMsgsAdmin = [
                  { text: thread.message, fromName: thread.fromUserName || 'רשות המחקר', fromRole: 'admin', createdAt: thread.createdAt, isReply: false },
                  ...(thread.replies || []).map((r) => ({ text: r.text, fromName: r.fromName, fromRole: r.fromRole, createdAt: r.createdAt, isReply: true }))
                ].sort((a, b) => {
                  const tA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt?.toDate?.()?.getTime?.() || 0);
                  const tB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt?.toDate?.()?.getTime?.() || 0);
                  return tB - tA;
                });
                const replyText = replyInputs[thread.id] || '';
                const isSending = replySending === thread.id;
                return (
                  <div key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setAdminSelectedOutboxThread(null)}
                      className="mail-thread-back"
                    >
                      {isRTL ? '→' : '←'} {t('notifBackToOutbox')}
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {allMsgsAdmin.map((msg, i) => {
                        const isAdmin = msg.fromRole === 'admin';
                        return (
                          <div key={i} className={`mail-message${isAdmin ? ' is-admin' : ' is-researcher'}`}>
                            <div className="mail-message-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className={`mail-message-avatar${isAdmin ? ' is-admin' : ' is-researcher'}`}>
                                  {msg.fromName?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                    {msg.fromName}{isAdmin ? ` — ${t('researchAuthority')}` : ''}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#999' }}>{formatDate(msg.createdAt)}</div>
                                </div>
                              </div>
                              {i === 0 && <div style={{ fontWeight: 700, fontSize: '16px', color: '#202124' }}>{thread.title}</div>}
                            </div>
                            <div style={{ lineHeight: 1.7, color: '#333', fontSize: '14px' }}>{msg.text}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mail-reply-bar">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(thread.id, true); } }}
                        placeholder={t('notifReplyPlaceholder')}
                        rows={2}
                        className="mail-reply-input"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(thread.id, true)}
                        disabled={!replyText.trim() || isSending}
                        className="mail-reply-btn"
                      >
                        {isSending ? '...' : t('notifSendBtn')}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'send' && (
                <div className="mail-compose">
                  <div className="mail-compose-toolbar">
                    <h3>{t('notifSend')}</h3>
                  </div>

                  <div className="mail-field-row">
                    <label className="mail-field-label" htmlFor="admin-recipient-search">{t('notifTo')}</label>
                    <div className="mail-recipients-wrap">
                      <div className="mail-recipients-bar">
                        {selectedResearchers.map((r) => (
                          <span key={r.id} className="mail-recipient-chip">
                            {r.name}
                            <button
                              type="button"
                              aria-label={`${t('notifDelete')} ${r.name}`}
                              onClick={() => handleToggleResearcher(r.id)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          id="admin-recipient-search"
                          type="text"
                          className="mail-recipient-search"
                          placeholder={t('notifSearchResearchers')}
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          onFocus={() => setRecipientDropdownOpen(true)}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      </div>
                      {(recipientDropdownOpen || recipientSearch.trim()) && (
                        <div className="mail-recipient-dropdown">
                          {filteredResearchers.length === 0 ? (
                            <div className="mail-recipient-empty">{t('notifNoResearchersFound')}</div>
                          ) : (
                            filteredResearchers.map((r) => {
                              const isSelected = selectedResearcherIds.includes(r.id);
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  className={`mail-recipient-option${isSelected ? ' is-selected' : ''}`}
                                  onClick={() => handleToggleResearcher(r.id)}
                                >
                                  <span className="mail-recipient-option-check">{isSelected ? '✓' : ''}</span>
                                  {r.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                      <div className="mail-recipient-actions">
                        <button
                          type="button"
                          className="mail-recipient-action"
                          onClick={handleSelectAllResearchers}
                        >
                          {allResearchersSelected ? t('clearAll') : t('selectAll')}
                        </button>
                        {selectedResearcherIds.length > 0 && (
                          <span className="mail-send-hint">
                            {t('notifSendToCount').replace('{count}', selectedResearcherIds.length)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mail-field-row">
                    <label className="mail-field-label" htmlFor="admin-message-subject">{t('notifSubject')}</label>
                    <input
                      id="admin-message-subject"
                      type="text"
                      className="mail-field-input"
                      placeholder={t('notifSubjectPlaceholder')}
                      value={importantTitle}
                      onChange={(e) => setImportantTitle(e.target.value)}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div className="mail-field-row mail-body-row">
                    <textarea
                      className="mail-body-input"
                      placeholder={t('notifBodyPlaceholder')}
                      value={importantMessage}
                      onChange={(e) => setImportantMessage(e.target.value)}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div className="mail-compose-footer">
                    <button
                      type="button"
                      onClick={handleSendImportant}
                      disabled={!canSendMessage}
                      className="mail-send-btn"
                    >
                      {sending
                        ? t('notifSending')
                        : selectedResearcherIds.length > 1
                          ? t('notifSendToCount').replace('{count}', selectedResearcherIds.length)
                          : t('notifSendBtn')}
                    </button>
                    {selectedResearcherIds.length === 0 && (
                      <span className="mail-send-hint">{t('notifRecipientsHint')}</span>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'deleted' && (
                <div>
                  {adminTrashedCount === 0 && <p className="mail-empty">{t('notifTrashEmpty')}</p>}

                  {adminTrashedNotifications.length > 0 && (
                    <>
                      <div className="mail-section-label">{t('notifSectionNotifications')}</div>
                      <div className="mail-cards-stack">
                        {adminTrashedNotifications.map((n) => (
                          <div key={n.id} style={{
                            padding: '14px 16px', borderRadius: '8px', textAlign: 'right',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.85
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>{n.title}</div>
                              <div style={{ color: '#777', marginBottom: '4px', fontSize: '14px' }}>{n.message}</div>
                              {n.createdAt?.toDate && (
                                <div style={{ fontSize: '12px', color: '#aaa' }}>{formatDate(n.createdAt)}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                              <button type="button" onClick={() => handleRestoreNotification(n.id)} className="mail-restore-btn">
                                {t('notifRestore')}
                              </button>
                              <button type="button" onClick={() => handlePermanentDelete(n.id)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #ffa8a8', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#e03131', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {adminTrashedIncoming.length > 0 && (
                    <>
                      <div className="mail-section-label">{t('notifSectionOutboxConversations')}</div>
                      <div className="mail-cards-stack">
                        {adminTrashedIncoming.map((m) => (
                          <div key={m.id} style={{
                            padding: '14px 16px', borderRadius: '8px', textAlign: 'right',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.85
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>
                                {m.title || t('notifUntitledThread')}
                                <span style={{ fontWeight: 400, color: '#888', fontSize: '12px', marginInlineStart: '8px' }}>{t('notifFrom')}: {m.fromUserName}</span>
                              </div>
                              <div style={{ color: '#777', marginBottom: '4px', fontSize: '14px' }}>{m.message}</div>
                              {m.createdAt?.toDate && (
                                <div style={{ fontSize: '12px', color: '#aaa' }}>{formatDate(m.createdAt)}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                              <button type="button" onClick={() => handleRestoreAdminOutboxThread(m.id)} className="mail-restore-btn">
                                {t('notifRestore')}
                              </button>
                              <button type="button" onClick={() => handlePermanentDeleteAdminOutboxThread(m.id)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #ffa8a8', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#e03131', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    );
  }

  // ─── RESEARCHER VIEW (Gmail-style sidebar layout) ────────────────────────────
  const sidebarItems = [
    { key: 'all',     label: 'תיבת הודעות',  count: unreadCount,        countColor: '#c0392b' },
    { key: 'starred', label: 'מועדפים',       count: starredCount,       countColor: '#f59e0b' },
    { key: 'outbox',  label: 'דואר יוצא',    count: unreadRepliesCount, countColor: '#c0392b' },
    { key: 'deleted', label: 'אשפה',          count: totalTrashedCount,  countColor: '#868e96' },
  ];

  const selectedThread = outboxMessages.find((m) => m.id === selectedOutboxThread);
  const selectedIncoming = activeResearcherIncoming.find((m) => m.id === selectedIncomingThread);
  const contentTitle = activeTab === 'all' && selectedIncomingThread
    ? (selectedIncoming?.title || t('notifInbox'))
    : activeTab === 'outbox' && selectedOutboxThread
    ? (selectedThread?.title || t('notifOutbox'))
    : { all: t('notifInbox'), starred: t('notifStarred'), outbox: t('notifOutbox'), deleted: t('notifDeleted'), compose: t('notifComposeNewToAuthority') }[activeTab];

  return (
    <div className="page-container">
      <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '28px 20px' }}>

        {/* ── Two-column wrapper ── */}
        <div style={{ display: 'flex', gap: '0', minHeight: '72vh', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

          {/* ── Content area (left) ── */}
          <div style={{ flex: 1, padding: '28px 28px', overflowY: 'auto', borderRight: '1px solid #e8eaed' }}>

            {/* Content header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#202124', textAlign: 'right' }}>
                {contentTitle}
              </h2>
              {activeTab === 'all' && unreadCount > 0 && !selectedIncomingThread && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    padding: '6px 14px', background: 'transparent', color: '#5f6368',
                    border: '1px solid #dadce0', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  סמן הכל כנקרא
                </button>
              )}
              {activeTab === 'deleted' && totalTrashedCount > 0 && (
                <button
                  onClick={async () => {
                    const batch = writeBatch(db);
                    trashedNotifications.forEach((n) =>
                      batch.update(doc(db, 'notifications', n.id), { deletedBy: arrayRemove(uid) })
                    );
                    trashedOutboxMessages.forEach((m) => batch.delete(doc(db, 'researcherMessages', m.id)));
                    trashedResearcherIncoming.forEach((m) => batch.delete(doc(db, 'researcherMessages', m.id)));
                    await batch.commit();
                  }}
                  style={{
                    padding: '6px 14px', background: 'transparent', color: '#e03131',
                    border: '1px solid #ffa8a8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  רוקן אשפה
                </button>
              )}
            </div>

            {activeTab === 'all' && selectedIncomingThread &&
              renderMailConversationView({
                thread: selectedIncoming,
                backLabel: t('notifBackToInbox'),
                onBack: () => setSelectedIncomingThread(null),
                starred: (selectedIncoming?.starredBy || []).includes(uid),
                onToggleStar: async () => {
                  if (!selectedIncoming) return;
                  const isStarred = (selectedIncoming.starredBy || []).includes(uid);
                  await updateDoc(doc(db, 'researcherMessages', selectedIncoming.id), {
                    starredBy: isStarred ? arrayRemove(uid) : arrayUnion(uid),
                  });
                },
                initialFromRole: 'admin',
                initialFromName: selectedIncoming?.fromUserName || t('researchAuthority'),
                onReply: (threadId) => handleReply(threadId, false),
              })}

            {activeTab === 'all' && !selectedIncomingThread && (
              <div>
                {loading && <p className="mail-empty">{t('notifLoadingNotifications')}</p>}
                {!loading && activeNotifications.length === 0 && activeResearcherIncoming.length === 0 && (
                  <p className="mail-empty">{t('notifNoNotifications')}</p>
                )}
                <MailInboxList
                  items={buildInboxItems(activeResearcherIncoming, activeNotifications)}
                  onItemClick={(item) => {
                    if (item._kind === 'message') openResearcherIncomingThread(item);
                    else handleOpenNotification(item);
                  }}
                  showStar
                  onToggleStar={(item) => {
                    if (item._kind === 'message') {
                      const isStarred = (item.starredBy || []).includes(uid);
                      updateDoc(doc(db, 'researcherMessages', item.id), {
                        starredBy: isStarred ? arrayRemove(uid) : arrayUnion(uid),
                      });
                    } else {
                      handleToggleStar(item.id);
                    }
                  }}
                  getStarred={(item) => (item.starredBy || []).includes(uid)}
                  getRowExtra={(item) =>
                    item._kind === 'message' ? (
                      <span style={{ fontSize: '12px', color: '#7c3aed', marginInlineEnd: '6px' }}>
                        {t('researchAuthority')}
                      </span>
                    ) : null
                  }
                  typeFilter={inboxTypeFilter}
                  onTypeFilterChange={setInboxTypeFilter}
                />
              </div>
            )}

            {/* ── מועדפים ── */}
            {activeTab === 'starred' && (
              <div>
                {starredCount === 0 && (
                  <p style={{ color: '#888', textAlign: 'right' }}>לא סומנו פריטים מועדפים עדיין</p>
                )}
                {starredNotifications.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'right', marginBottom: '8px', fontWeight: 600 }}>
                      התראות
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {starredNotifications.map((n) => <NotificationCard key={n.id} n={n} />)}
                    </div>
                  </div>
                )}
                {starredOutbox.length > 0 && (
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'right', marginBottom: '8px', fontWeight: 600 }}>
                      הודעות לרשות
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {starredOutbox.map((m) => {
                        const isExpanded = expandedThread === m.id;
                        const replyCount = (m.replies || []).length;
                        const hasNewReply = m.researcherRead === false;
                        return (
                          <div
                            key={m.id}
                            style={{
                              borderRadius: '8px', textAlign: 'right',
                              background: hasNewReply ? '#f0f4ff' : 'white',
                              border: `1px solid ${hasNewReply ? '#bac8ff' : '#e2e8f0'}`
                            }}
                          >
                            <div
                              style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
                            >
                              <StarButton starred={true} onToggle={() => handleToggleOutboxStar(m.id)} />
                              <div
                                style={{ flex: 1, cursor: 'pointer' }}
                                onClick={() => handleExpandThread(m.id, m)}
                              >
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                  {m.title}
                                  {hasNewReply && (
                                    <span style={{ fontSize: '11px', background: '#1a56db', color: 'white', borderRadius: '8px', padding: '2px 8px', marginRight: '6px' }}>
                                      תגובה חדשה
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && (
                                  <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                                    {m.message.length > 100 ? m.message.slice(0, 100) + '...' : m.message}
                                  </div>
                                )}
                                <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                  <span style={{ color: m.read ? '#2e7d32' : '#868e96' }}>{m.read ? '✓ נקרא' : 'ממתין לקריאה'}</span>
                                  {replyCount > 0 && <span>{replyCount} תגובות</span>}
                                  <span>{formatDate(m.createdAt)}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, cursor: 'pointer' }} onClick={() => handleExpandThread(m.id, m)}>
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </div>
                            {isExpanded && (
                              <div style={{ paddingInline: '16px', paddingBottom: '16px' }}>
                                {renderThreadView(m, false)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {starredIncoming.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'right', marginBottom: '8px', fontWeight: 600 }}>
                      הודעות נכנסות
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {starredIncoming.map((m) => (
                        <div key={m.id} style={{ borderRadius: '8px', textAlign: 'right', background: 'white', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <StarButton
                            starred={true}
                            onToggle={async () => {
                              await updateDoc(doc(db, 'researcherMessages', m.id), { starredBy: arrayRemove(uid) });
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{m.title}</div>
                            <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                              {m.message?.length > 100 ? m.message.slice(0, 100) + '...' : m.message}
                            </div>
                            <div style={{ fontSize: '12px', color: '#999' }}>
                              מאת: {m.fromUserName || 'רשות המחקר'} · {formatDate(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── אשפה ── */}
            {activeTab === 'deleted' && (
              <div>
                {totalTrashedCount === 0 && <p style={{ color: '#888', textAlign: 'right' }}>האשפה ריקה</p>}

                {/* ── פריטים שנמחקו (התראות) ── */}
                {trashedNotifications.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', fontSize: '13px' }}>התראות</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                      {trashedNotifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '14px 16px', borderRadius: '8px', textAlign: 'right',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.85
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>{n.title}</div>
                            <div style={{ color: '#777', marginBottom: '4px', fontSize: '14px' }}>{n.message}</div>
                            {n.createdAt?.toDate && (
                              <div style={{ fontSize: '12px', color: '#aaa' }}>{formatDate(n.createdAt)}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRestoreNotification(n.id)}
                              style={{
                                padding: '4px 12px', fontSize: '12px', borderRadius: '4px',
                                border: '1px solid #dadce0', background: 'white', cursor: 'pointer', color: '#444'
                              }}
                            >
                              שחזר
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(n.id)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '4px',
                                border: '1px solid #ffa8a8', background: 'transparent',
                                cursor: 'pointer', fontSize: '14px', color: '#e03131',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── שיחות שנמחקו (דואר יוצא) ── */}
                {trashedOutboxMessages.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', fontSize: '13px' }}>שיחות (דואר יוצא)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {trashedOutboxMessages.map((thread) => (
                        <div
                          key={thread.id}
                          style={{
                            padding: '14px 16px', borderRadius: '8px', textAlign: 'right',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.85
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>{thread.title || 'הודעה ללא כותרת'}</div>
                            <div style={{ color: '#777', marginBottom: '4px', fontSize: '14px' }}>{thread.message}</div>
                            {thread.createdAt?.toDate && (
                              <div style={{ fontSize: '12px', color: '#aaa' }}>{formatDate(thread.createdAt)}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRestoreOutboxThread(thread.id)}
                              style={{
                                padding: '4px 12px', fontSize: '12px', borderRadius: '4px',
                                border: '1px solid #dadce0', background: 'white', cursor: 'pointer', color: '#444'
                              }}
                            >
                              שחזר
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDeleteOutboxThread(thread.id)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '4px',
                                border: '1px solid #ffa8a8', background: 'transparent',
                                cursor: 'pointer', fontSize: '14px', color: '#e03131',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── הודעות נכנסות שנמחקו ── */}
                {trashedResearcherIncoming.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', marginTop: '16px', fontSize: '13px' }}>הודעות נכנסות</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {trashedResearcherIncoming.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            padding: '14px 16px', borderRadius: '8px', textAlign: 'right',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.85
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>{m.title || 'הודעה ללא כותרת'}</div>
                            <div style={{ color: '#777', marginBottom: '4px', fontSize: '14px' }}>{m.message}</div>
                            {m.createdAt?.toDate && (
                              <div style={{ fontSize: '12px', color: '#aaa' }}>{formatDate(m.createdAt)}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => updateDoc(doc(db, 'researcherMessages', m.id), { deleted: false })}
                              style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #dadce0', background: 'white', cursor: 'pointer', color: '#444' }}
                            >
                              שחזר
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteDoc(doc(db, 'researcherMessages', m.id))}
                              style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #ffa8a8', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#e03131', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── הודעות נכנסות (from admin) ── */}
            {/* ── כתוב לרשות ── */}
            {activeTab === 'compose' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="כותרת ההודעה..."
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    style={{
                      padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid #dadce0', fontSize: '14px',
                      textAlign: 'right', direction: 'rtl', outline: 'none'
                    }}
                  />
                  <textarea
                    placeholder="תוכן ההודעה..."
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    rows={7}
                    style={{
                      padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid #dadce0', fontSize: '14px',
                      resize: 'vertical', textAlign: 'right', direction: 'rtl', outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendToAuthority}
                  disabled={composeSending || !composeMessage.trim()}
                  style={{
                    padding: '10px 28px',
                    background: composeSending || !composeMessage.trim() ? '#ccc' : '#1a56db',
                    color: 'white', border: 'none', borderRadius: '20px', fontSize: '14px',
                    fontWeight: 600,
                    cursor: composeSending || !composeMessage.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {composeSending ? 'שולח...' : 'שלח'}
                </button>
              </div>
            )}

            {/* ── דואר יוצא ── */}
            {activeTab === 'outbox' && !selectedOutboxThread && (
              <div>
                {outboxLoading && <p style={{ color: '#888', textAlign: 'right' }}>טוען...</p>}
                {!outboxLoading && activeOutboxMessages.length === 0 && (
                  <p style={{ color: '#888', textAlign: 'right' }}>לא שלחת הודעות עדיין</p>
                )}
                {/* ── Gmail-style list ── */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {activeOutboxMessages.map((thread, idx) => {
                    const hasNewReply = thread.researcherRead === false;
                    const replyCount = (thread.replies || []).length;
                    const lastReply = replyCount > 0 ? thread.replies[thread.replies.length - 1] : null;
                    const preview = lastReply ? lastReply.text : thread.message;
                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          setSelectedOutboxThread(thread.id);
                          if (hasNewReply) handleExpandThread(thread.id, thread);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px', cursor: 'pointer', direction: 'rtl',
                          background: hasNewReply ? '#f0f4ff' : 'white',
                          borderBottom: idx < activeOutboxMessages.length - 1 ? '1px solid #f1f3f4' : 'none',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = hasNewReply ? '#e8eeff' : '#f6f8fc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = hasNewReply ? '#f0f4ff' : 'white'; }}
                      >
                        {/* Checkbox – mark reply as read/unread */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title={hasNewReply ? 'סמן כנקרא' : 'סמן כלא נקרא'}
                            onClick={() => handleToggleOutboxRead(thread.id)}
                            style={{
                              width: '20px', height: '20px', borderRadius: '4px',
                              border: '1px solid #cbd5e0', background: 'transparent',
                              cursor: 'pointer', fontSize: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#555', flexShrink: 0
                            }}
                          >
                            {!hasNewReply ? '✓' : ''}
                          </button>
                        </div>
                        {/* Star */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <StarButton starred={!!thread.starred} onToggle={() => handleToggleOutboxStar(thread.id)} />
                        </div>
                        {/* Title + preview */}
                        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'right' }}>
                          <span style={{ fontWeight: hasNewReply ? 700 : 600, color: '#202124', marginLeft: '6px' }}>
                            {thread.title}
                            {replyCount > 0 && <span style={{ fontWeight: 400, color: '#888', fontSize: '12px', marginRight: '4px' }}>({replyCount})</span>}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>
                            — {preview.length > 60 ? preview.slice(0, 60) + '...' : preview}
                          </span>
                        </div>
                        {/* Read status */}
                        <span style={{ flexShrink: 0, fontSize: '12px', color: thread.read ? '#2e7d32' : '#868e96', whiteSpace: 'nowrap' }}>
                          {thread.read ? '✓ נקרא' : 'ממתין לקריאה'}
                        </span>
                        {/* Date */}
                        <span style={{ flexShrink: 0, fontSize: '13px', color: hasNewReply ? '#1a56db' : '#6b7280', fontWeight: hasNewReply ? 700 : 400 }}>
                          {shortDate(thread.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'outbox' && selectedOutboxThread && (() => {
              const thread = outboxMessages.find((m) => m.id === selectedOutboxThread);
              if (!thread) return null;
              const hasNewReply = thread.researcherRead === false;

              // Build full message list sorted newest first
              const allMsgs = [
                { text: thread.message, fromName: thread.fromUserName, fromRole: 'researcher', createdAt: thread.createdAt, isReply: false },
                ...(thread.replies || []).map((r) => ({ text: r.text, fromName: r.fromName, fromRole: r.fromRole, createdAt: r.createdAt, isReply: true }))
              ].sort((a, b) => {
                const tA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt?.toDate?.()?.getTime?.() || 0);
                const tB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt?.toDate?.()?.getTime?.() || 0);
                return tB - tA;
              });

              return (
                <div key={thread.id}>
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setSelectedOutboxThread(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: '1px solid #e2e8f0',
                      borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                      fontSize: '13px', color: '#555', marginBottom: '18px'
                    }}
                  >
                    ← חזרה לדואר יוצא
                  </button>

                  {/* Thread subject header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '18px' }}>
                    <StarButton starred={!!thread.starred} onToggle={() => handleToggleOutboxStar(thread.id)} />
                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#202124', direction: 'rtl' }}>
                      {thread.title}
                    </h3>
                    {hasNewReply && (
                      <span style={{ fontSize: '12px', background: '#1a56db', color: 'white', borderRadius: '10px', padding: '2px 10px' }}>
                        תגובה חדשה
                      </span>
                    )}
                  </div>

                  {/* Email-style message cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allMsgs.map((msg, i) => {
                      const initials = (msg.fromName || '?').slice(0, 2).toUpperCase();
                      const avatarBg = msg.fromRole === 'admin' ? '#1a56db' : '#6b7280';
                      return (
                        <div
                          key={i}
                          style={{
                            background: 'white', border: '1px solid #e2e8f0',
                            borderRadius: '10px', padding: '18px 20px',
                            textAlign: 'right', direction: 'rtl'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '14px', color: '#1a1a2e' }}>
                            {msg.isReply ? `RE: ${thread.title}` : thread.title}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{formatDate(msg.createdAt)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{msg.fromName}</span>
                              <div style={{
                                width: '34px', height: '34px', borderRadius: '50%',
                                background: avatarBg, color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 700, flexShrink: 0
                              }}>
                                {initials}
                              </div>
                            </div>
                          </div>
                          <hr style={{ border: 'none', borderTop: '1px solid #e8eaed', margin: '0 0 14px' }} />
                          <div style={{ color: '#374151', lineHeight: 1.7, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply input */}
                  <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                      value={replyInputs[thread.id] || ''}
                      onChange={(e) => setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(thread.id, false); } }}
                      placeholder="כתוב תגובה... (Enter לשליחה)"
                      rows={2}
                      style={{
                        flex: 1, padding: '9px 14px', borderRadius: '8px',
                        border: '1px solid #e2e8f0', fontSize: '14px',
                        resize: 'none', textAlign: 'right', direction: 'rtl', outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(thread.id, false)}
                      disabled={!(replyInputs[thread.id] || '').trim() || replySending === thread.id}
                      style={{
                        padding: '9px 18px', borderRadius: '8px', border: 'none',
                        background: !(replyInputs[thread.id] || '').trim() ? '#ccc' : '#1a56db',
                        color: 'white', cursor: !(replyInputs[thread.id] || '').trim() ? 'not-allowed' : 'pointer',
                        fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap'
                      }}
                    >
                      {replySending === thread.id ? '...' : 'שלח'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{ width: '210px', flexShrink: 0, padding: '20px 12px', background: '#f6f8fc', order: -1 }}>

            {/* Compose button */}
            <button
              type="button"
              onClick={() => switchTab('compose')}
              style={{
                width: '100%', padding: '14px 16px', marginBottom: '20px',
                background: '#1a56db', color: 'white', border: 'none',
                borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', textAlign: 'center', letterSpacing: '0.3px'
              }}
            >
              + כתוב לרשות
            </button>

            {/* Nav items */}
            <nav>
              {sidebarItems.map((item) => {
                const isActive = activeTab === item.key;
                const hasAlert = item.key === 'outbox' && unreadRepliesCount > 0 && !isActive;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => switchTab(item.key)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '9px 16px',
                      background: isActive ? '#d3e3fd' : hasAlert ? '#e8e8e8' : 'transparent',
                      color: isActive ? '#1a56db' : '#444',
                      fontWeight: isActive || hasAlert ? 700 : 400,
                      border: 'none', borderRadius: '20px 0 0 20px',
                      cursor: 'pointer', fontSize: '14px',
                      textAlign: 'right', marginBottom: '2px',
                      transition: 'background 0.1s',
                      boxShadow: hasAlert ? 'inset 3px 0 0 #888' : 'none'
                    }}
                  >
                    <span style={{ direction: 'rtl' }}>{item.label}</span>
                    {item.count > 0 && (
                      <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: isActive ? '#1a56db' : item.countColor
                      }}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Notifications;
