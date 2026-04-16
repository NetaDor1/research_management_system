import React, { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  writeBatch, getDocs, deleteDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { createNotification } from '../services/notifications';
import './Page.css';

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
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Admin: send to researchers ───────────────────────────────────────────────
  const [researchers, setResearchers] = useState([]);
  const [selectedResearcherIds, setSelectedResearcherIds] = useState([]);
  const [importantTitle, setImportantTitle] = useState('');
  const [importantMessage, setImportantMessage] = useState('');
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

  // ── Admin: outbox thread selection ───────────────────────────────────────────
  const [adminSelectedOutboxThread, setAdminSelectedOutboxThread] = useState(null);

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
            map.set(data.researcherId, data.researcherName || 'חוקר');
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
    if (!db || activeNotifications.length === 0) return;
    const batch = writeBatch(db);
    activeNotifications.forEach((n) => {
      if (!n.read) batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
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
    if (!notification.read) await handleMarkRead(notification.id);
    if (notification.link) navigate(notification.link);
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
            fromUserName: user?.name || 'רשות המחקר',
            toUserId: uid,
            toUserName: researcher?.name || 'חוקר',
            title: importantTitle.trim() || 'הודעה חשובה',
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
        fromName: fromAdminSide ? 'רשות המחקר' : (user.name || 'חוקר'),
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
    if (typeof ts === 'number') return new Date(ts).toLocaleString('he-IL');
    return ts?.toDate ? ts.toDate().toLocaleString('he-IL') : '';
  };

  const shortDate = (ts) => {
    if (!ts) return '';
    const d = typeof ts === 'number' ? new Date(ts) : ts?.toDate?.();
    if (!d) return '';
    const now = new Date();
    const isThisYear = d.getFullYear() === now.getFullYear();
    return isThisYear
      ? d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
      : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedOutboxThread(null);
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
          {fromName}{fromRole === 'admin' ? ' — רשות המחקר' : ''}
        </div>
        <div style={{ lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: '11px', marginTop: '5px', color: isOwn ? 'rgba(255,255,255,0.55)' : '#aaa' }}>
          {formatDate(date)}
        </div>
      </div>
    </div>
  );

  const ThreadView = ({ thread, isAdminSide }) => {
    const sortedReplies = (thread.replies || []).slice().sort((a, b) => a.createdAt - b.createdAt);
    const replyText = replyInputs[thread.id] || '';
    const isSending = replySending === thread.id;

    return (
      <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        {/* Initial message bubble */}
        <MessageBubble
          text={thread.message}
          fromName={thread.fromUserName}
          fromRole="researcher"
          date={thread.createdAt}
          isOwn={!isAdminSide}
        />

        {/* Reply bubbles */}
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

        {/* Reply input */}
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
            placeholder="כתוב תגובה... (Enter לשליחה)"
            rows={2}
            style={{
              flex: 1, padding: '9px', borderRadius: '8px',
              border: '1px solid #cbd5e0', fontSize: '14px',
              resize: 'none', textAlign: 'right', direction: 'rtl'
            }}
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
            {isSending ? '...' : 'שלח'}
          </button>
        </div>
      </div>
    );
  };

  const StarButton = ({ starred, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      title={starred ? 'הסר ממועדפים' : 'הוסף למועדפים'}
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
      {/* Delete */}
      <button
        type="button"
        onClick={() => handleDeleteNotification(n.id)}
        title="מחק התראה"
        style={{
          width: '28px', height: '28px', flexShrink: 0, borderRadius: '4px',
          border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
        }}
      >
        🗑️
      </button>
    </div>
  );

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


  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
  if (isAdmin()) {
    const adminSidebarItems = [
      { key: 'all',      label: 'תיבת הודעות',   count: adminUnreadCount,  countColor: '#c0392b' },
      { key: 'starred',  label: 'מועדפים',         count: adminStarredCount, countColor: '#f59e0b' },
      { key: 'incoming', label: 'הודעות נכנסות',   count: unreadIncoming,    countColor: '#c0392b' },
      { key: 'outbox',   label: 'דואר יוצא',       count: adminActiveSent.filter((m) => (m.replies || []).length > 0 && m.researcherRead === false).length, countColor: '#c0392b' },
      { key: 'deleted',  label: 'אשפה',            count: adminTrashedCount, countColor: '#868e96' },
    ];
    const adminSelectedThread = adminActiveSent.find((m) => m.id === adminSelectedOutboxThread);
    const adminContentTitle = activeTab === 'outbox' && adminSelectedOutboxThread
      ? (adminSelectedThread?.title || 'דואר יוצא')
      : { all: 'תיבת הודעות', starred: 'מועדפים', incoming: 'הודעות נכנסות', outbox: 'דואר יוצא', send: 'שליחת הודעה', deleted: 'אשפה' }[activeTab] || 'התראות';
    const switchAdminTab = (tab) => { setActiveTab(tab); setAdminSelectedOutboxThread(null); };

    return (
      <div className="page-container">
        <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '28px 20px' }}>

          {/* ── Two-column wrapper ── */}
          <div style={{ display: 'flex', gap: '0', minHeight: '72vh', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

            {/* ── Content area ── */}
            <div style={{ flex: 1, padding: '28px', overflowY: 'auto', borderRight: '1px solid #e8eaed' }}>

              {/* Content header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#202124' }}>
                  {adminContentTitle}
                </h2>
                {activeTab === 'all' && adminUnreadCount > 0 && (
                  <button
                    onClick={handleAdminMarkAllRead}
                    style={{
                      padding: '6px 14px', background: 'transparent', color: '#5f6368',
                      border: '1px solid #dadce0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                    }}
                  >
                    סמן הכל כנקרא
                  </button>
                )}
                {activeTab === 'deleted' && adminTrashedCount > 0 && (
                  <button
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
                    style={{
                      padding: '6px 14px', background: 'transparent', color: '#e03131',
                      border: '1px solid #ffa8a8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                    }}
                  >
                    רוקן אשפה
                  </button>
                )}
              </div>

              {/* ── תיבת הודעות ── */}
              {activeTab === 'all' && (
                <div>
                  {adminNotifLoading && <p style={{ color: '#888', textAlign: 'right' }}>טוען...</p>}
                  {!adminNotifLoading && adminActiveNotifications.length === 0 && (
                    <p style={{ color: '#888', textAlign: 'right' }}>אין התראות להצגה</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {adminActiveNotifications.map((n) => (
                      <div key={n.id} style={{
                        textAlign: 'right', padding: '14px 16px',
                        background: n.read ? 'transparent' : '#fff7e6',
                        border: `1px solid ${n.read ? '#e2e8f0' : '#ffd59e'}`,
                        borderRadius: '8px', display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', gap: '10px'
                      }}>
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
                        <StarButton starred={(n.starredBy || []).includes(uid)} onToggle={() => handleToggleStar(n.id)} />
                        <button
                          type="button"
                          onClick={() => handleOpenNotification(n)}
                          style={{ textAlign: 'right', background: 'transparent', border: 'none', padding: 0, cursor: n.link ? 'pointer' : 'default', flex: 1 }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{n.title}</div>
                          <div style={{ color: '#555', marginBottom: '4px', fontSize: '14px' }}>{n.message}</div>
                          {n.createdAt?.toDate && (
                            <div style={{ fontSize: '12px', color: '#999' }}>{formatDate(n.createdAt)}</div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(n.id)}
                          title="מחק"
                          style={{
                            width: '28px', height: '28px', flexShrink: 0, borderRadius: '4px',
                            border: '1px solid #cbd5e0', background: 'transparent', cursor: 'pointer',
                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── מועדפים ── */}
              {activeTab === 'starred' && (
                <div>
                  {adminStarredCount === 0 && (
                    <p style={{ color: '#888', textAlign: 'right' }}>אין פריטים מועדפים</p>
                  )}
                  {adminStarredNotifications.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', fontSize: '13px' }}>התראות</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                        {adminStarredNotifications.map((n) => (
                          <NotificationCard key={n.id} n={n} />
                        ))}
                      </div>
                    </>
                  )}
                  {adminStarredIncoming.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', fontSize: '13px' }}>שיחות</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                      <span style={{ fontSize: '11px', background: '#1a56db', color: 'white', borderRadius: '8px', padding: '2px 8px', marginRight: '6px' }}>
                                        חדש
                                      </span>
                                    )}
                                  </div>
                                  {!isExpanded && (
                                    <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                                      {m.message.length > 100 ? m.message.slice(0, 100) + '...' : m.message}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <span style={{ color: m.fromUserName ? '#555' : '#999' }}>מאת: {m.fromUserName}</span>
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
                                  <ThreadView thread={m} isAdminSide={true} />
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

              {/* ── הודעות נכנסות ── */}
              {activeTab === 'incoming' && (
                <div>
                  {incomingLoading && <p style={{ color: '#888', textAlign: 'right' }}>טוען...</p>}
                  {!incomingLoading && adminActiveReceived.length === 0 && (
                    <p style={{ color: '#888', textAlign: 'right' }}>אין הודעות נכנסות</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {adminActiveReceived.map((m) => {
                      const isExpanded = expandedThread === m.id;
                      const replyCount = (m.replies || []).length;
                      return (
                        <div
                          key={m.id}
                          style={{
                            padding: '14px 16px', borderRadius: '10px', textAlign: 'right',
                            background: m.read ? 'white' : '#f0f4ff',
                            border: `1px solid ${m.read ? '#e2e8f0' : '#bac8ff'}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                {m.title}
                                <span style={{ fontWeight: 400, color: '#888', fontSize: '13px', marginRight: '8px' }}>
                                  מאת: {m.fromUserName}
                                </span>
                                {!m.read && (
                                  <span style={{
                                    fontSize: '11px', background: '#4263eb', color: 'white',
                                    borderRadius: '8px', padding: '2px 7px', marginRight: '6px'
                                  }}>
                                    חדש
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                                {isExpanded ? '' : m.message.length > 80 ? m.message.slice(0, 80) + '...' : m.message}
                              </div>
                              <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px' }}>
                                <span>{formatDate(m.createdAt)}</span>
                                {replyCount > 0 && <span>💬 {replyCount} תגובות</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleExpandThread(m.id, m)}
                                style={{
                                  padding: '5px 12px', fontSize: '13px', borderRadius: '6px',
                                  border: '1px solid #bac8ff', background: isExpanded ? '#4263eb' : 'white',
                                  color: isExpanded ? 'white' : '#4263eb', cursor: 'pointer'
                                }}
                              >
                                {isExpanded ? 'סגור ▲' : 'פתח שיחה ▼'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteIncoming(m.id)}
                                title="מחק"
                                style={{
                                  width: '28px', height: '28px', borderRadius: '4px',
                                  border: '1px solid #cbd5e0', background: 'transparent',
                                  cursor: 'pointer', fontSize: '14px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          {isExpanded && <ThreadView thread={m} isAdminSide={true} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── דואר יוצא (list → detail) ── */}
              {activeTab === 'outbox' && !adminSelectedOutboxThread && (
                <div>
                  {incomingLoading && <p style={{ color: '#888', textAlign: 'right' }}>טוען...</p>}
                  {!incomingLoading && adminActiveSent.length === 0 && (
                    <p style={{ color: '#888', textAlign: 'right' }}>לא שלחת הודעות עדיין</p>
                  )}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    {adminActiveSent.map((thread, idx) => {
                      const replyCount = (thread.replies || []).length;
                      const hasUnreadReply = replyCount > 0 && thread.researcherRead === false;
                      const lastReply = replyCount > 0 ? thread.replies[thread.replies.length - 1] : null;
                      const preview = lastReply ? lastReply.text : thread.message;
                      const rowBg = hasUnreadReply ? '#f0f4ff' : 'white';
                      return (
                        <div
                          key={thread.id}
                          onClick={async () => {
                            setAdminSelectedOutboxThread(thread.id);
                            if (hasUnreadReply) {
                              await updateDoc(doc(db, 'researcherMessages', thread.id), { researcherRead: true });
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', cursor: 'pointer', direction: 'rtl',
                            background: rowBg,
                            borderBottom: idx < adminActiveSent.length - 1 ? '1px solid #f1f3f4' : 'none',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = hasUnreadReply ? '#e8eeff' : '#f6f8fc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                        >
                          {/* Star */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <StarButton starred={!!thread.adminStarred} onToggle={() => handleToggleAdminOutboxStar(thread.id)} />
                          </div>
                          {/* Recipient + title + preview */}
                          <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'right' }}>
                            <span style={{ fontWeight: hasUnreadReply ? 700 : 600, color: '#202124', marginLeft: '6px' }}>
                              אל: {thread.toUserName || 'חוקר'}
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
                            <span style={{ flexShrink: 0, fontSize: '11px', background: '#1a56db', color: 'white', borderRadius: '10px', padding: '2px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              תגובה חדשה
                            </span>
                          )}
                          {/* Date */}
                          <span style={{ flexShrink: 0, fontSize: '13px', color: hasUnreadReply ? '#1a56db' : '#6b7280', fontWeight: hasUnreadReply ? 700 : 400 }}>
                            {shortDate(thread.createdAt)}
                          </span>
                          {/* Trash */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="מחק שיחה"
                              onClick={() => handleDeleteAdminOutboxThread(thread.id)}
                              style={{
                                width: '26px', height: '26px', borderRadius: '4px',
                                border: '1px solid #e2e8f0', background: 'transparent',
                                cursor: 'pointer', fontSize: '13px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                              }}
                            >
                              🗑️
                            </button>
                          </div>
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a56db', fontSize: '14px', marginBottom: '16px', padding: 0 }}
                    >
                      ← חזרה לדואר יוצא
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {allMsgsAdmin.map((msg, i) => {
                        const isAdmin = msg.fromRole === 'admin';
                        return (
                          <div key={i} style={{
                            padding: '16px 18px', borderRadius: '10px',
                            background: isAdmin ? '#f0f4ff' : '#fafafa',
                            border: `1px solid ${isAdmin ? '#bac8ff' : '#e2e8f0'}`,
                            textAlign: 'right', direction: 'rtl'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: isAdmin ? '#3b5bdb' : '#e2e8f0',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isAdmin ? 'white' : '#555', fontWeight: 700, fontSize: '14px', flexShrink: 0
                                }}>
                                  {msg.fromName?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{msg.fromName}{isAdmin ? ' — רשות המחקר' : ''}</div>
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
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'flex-end' }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(thread.id, true); } }}
                        placeholder="כתוב תגובה... (Enter לשליחה)"
                        rows={2}
                        style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', resize: 'none', textAlign: 'right', direction: 'rtl' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(thread.id, true)}
                        disabled={!replyText.trim() || isSending}
                        style={{
                          padding: '9px 16px', borderRadius: '8px', border: 'none',
                          background: !replyText.trim() || isSending ? '#ccc' : '#3b5bdb',
                          color: 'white', cursor: !replyText.trim() || isSending ? 'not-allowed' : 'pointer',
                          fontSize: '14px', whiteSpace: 'nowrap'
                        }}
                      >
                        {isSending ? '...' : 'שלח'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── שליחת הודעה ── */}
              {activeTab === 'send' && (
                <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', textAlign: 'right' }}>בחר/י חוקרים:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', direction: 'rtl' }}>
                      <input
                        type="checkbox"
                        id="select-all-admin"
                        checked={selectedResearcherIds.length === researchers.length && researchers.length > 0}
                        onChange={handleSelectAllResearchers}
                      />
                      <label htmlFor="select-all-admin" style={{ cursor: 'pointer', fontSize: '14px' }}>בחר/י הכל</label>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {researchers.map((r) => (
                        <label
                          key={r.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '5px 10px', borderRadius: '20px', cursor: 'pointer',
                            fontSize: '14px', userSelect: 'none',
                            border: selectedResearcherIds.includes(r.id) ? '1px solid #28a745' : '1px solid #cbd5e0',
                            background: selectedResearcherIds.includes(r.id) ? '#e6f9ee' : 'white'
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ accentColor: '#28a745' }}
                            checked={selectedResearcherIds.includes(r.id)}
                            onChange={() => handleToggleResearcher(r.id)}
                          />
                          {r.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="כותרת ההודעה..."
                      value={importantTitle}
                      onChange={(e) => setImportantTitle(e.target.value)}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', textAlign: 'right', direction: 'rtl' }}
                    />
                    <textarea
                      placeholder="תוכן ההודעה..."
                      value={importantMessage}
                      onChange={(e) => setImportantMessage(e.target.value)}
                      rows={5}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', resize: 'vertical', textAlign: 'right', direction: 'rtl' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendImportant}
                    disabled={sending || selectedResearcherIds.length === 0 || !importantMessage.trim()}
                    style={{
                      padding: '8px 20px',
                      background: sending || selectedResearcherIds.length === 0 || !importantMessage.trim() ? '#ccc' : '#1a56db',
                      color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px',
                      cursor: sending || selectedResearcherIds.length === 0 || !importantMessage.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {sending ? 'שולח...' : `שלח${selectedResearcherIds.length > 1 ? ` (${selectedResearcherIds.length} חוקרים)` : ''}`}
                  </button>
                </div>
              )}

              {/* ── אשפה ── */}
              {activeTab === 'deleted' && (
                <div>
                  {adminTrashedCount === 0 && <p style={{ color: '#888', textAlign: 'right' }}>האשפה ריקה</p>}

                  {adminTrashedNotifications.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', fontSize: '13px' }}>התראות</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
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
                              <button type="button" onClick={() => handleRestoreNotification(n.id)}
                                style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #dadce0', background: 'white', cursor: 'pointer', color: '#444' }}>
                                שחזר
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
                      <div style={{ fontWeight: 600, color: '#666', textAlign: 'right', marginBottom: '8px', fontSize: '13px' }}>שיחות (דואר יוצא)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {adminTrashedIncoming.map((m) => (
                          <div key={m.id} style={{
                            padding: '14px 16px', borderRadius: '8px', textAlign: 'right',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.85
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>
                                {m.title || 'שיחה ללא כותרת'}
                                <span style={{ fontWeight: 400, color: '#888', fontSize: '12px', marginRight: '8px' }}>מאת: {m.fromUserName}</span>
                              </div>
                              <div style={{ color: '#777', marginBottom: '4px', fontSize: '14px' }}>{m.message}</div>
                              {m.createdAt?.toDate && (
                                <div style={{ fontSize: '12px', color: '#aaa' }}>{formatDate(m.createdAt)}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                              <button type="button" onClick={() => handleRestoreAdminOutboxThread(m.id)}
                                style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #dadce0', background: 'white', cursor: 'pointer', color: '#444' }}>
                                שחזר
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

            {/* ── LEFT SIDEBAR ── */}
            <div style={{ width: '210px', flexShrink: 0, padding: '20px 12px', background: '#f6f8fc', order: -1 }}>

              {/* Compose / send button */}
              <button
                type="button"
                onClick={() => switchAdminTab('send')}
                style={{
                  width: '100%', padding: '14px 16px', marginBottom: '20px',
                  background: '#1a56db', color: 'white', border: 'none',
                  borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'center', letterSpacing: '0.3px'
                }}
              >
                + שלח הודעה לחוקרים
              </button>

              {/* Nav items */}
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
                      style={{
                        width: '100%', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', padding: '9px 16px',
                        background: isActive ? '#d3e3fd' : hasAlert ? '#e8e8e8' : 'transparent',
                        color: isActive ? '#1a56db' : hasAlert ? '#1a56db' : '#444',
                        fontWeight: isActive || hasAlert ? 700 : 400,
                        border: 'none', borderRadius: '20px 0 0 20px',
                        cursor: 'pointer', fontSize: '14px',
                        textAlign: 'right', marginBottom: '2px',
                        transition: 'background 0.1s',
                        boxShadow: hasAlert ? 'inset 3px 0 0 #1a56db' : 'none'
                      }}
                    >
                      <span style={{ direction: 'rtl' }}>{item.label}</span>
                      {item.count > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#1a56db' : item.countColor }}>
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
  }

  // ─── RESEARCHER VIEW (Gmail-style sidebar layout) ────────────────────────────
  const sidebarItems = [
    { key: 'all',     label: 'תיבת הודעות',  count: unreadCount,        countColor: '#c0392b' },
    { key: 'starred', label: 'מועדפים',       count: starredCount,       countColor: '#f59e0b' },
    { key: 'outbox',  label: 'דואר יוצא',    count: unreadRepliesCount, countColor: '#c0392b' },
    { key: 'deleted', label: 'אשפה',          count: totalTrashedCount,  countColor: '#868e96' },
  ];

  const selectedThread = outboxMessages.find((m) => m.id === selectedOutboxThread);
  const contentTitle = activeTab === 'outbox' && selectedOutboxThread
    ? (selectedThread?.title || 'דואר יוצא')
    : { all: 'תיבת הודעות', starred: 'מועדפים', outbox: 'דואר יוצא', deleted: 'אשפה', compose: 'הודעה חדשה לרשות' }[activeTab];

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
              {activeTab === 'all' && unreadCount > 0 && (
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

            {/* ── תיבת הודעות ── */}
            {activeTab === 'all' && (
              <div>
                {loading && <p style={{ color: '#888', textAlign: 'right' }}>טוען התראות...</p>}

                {/* ── הודעות מהרשות ── */}
                {activeResearcherIncoming.length > 0 && (
                  <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeResearcherIncoming.map((m) => {
                      const isUnread = m.read === false;
                      const isExpanded = expandedThread === m.id;
                      const replyText = replyInputs[m.id] || '';
                      const isSending = replySending === m.id;
                      return (
                        <div
                          key={m.id}
                          style={{
                            borderRadius: '8px', textAlign: 'right', direction: 'rtl',
                            background: isUnread ? '#f5f3ff' : 'white',
                            border: '1px solid #e2e8f0',
                            borderRight: '3px solid #7c3aed'
                          }}
                        >
                          {/* ── header row ── */}
                          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            {/* Mark-read checkbox */}
                            <button
                              type="button"
                              onClick={async () => { if (isUnread) await updateDoc(doc(db, 'researcherMessages', m.id), { read: true }); }}
                              title="סמן כנקרא"
                              disabled={!isUnread}
                              style={{
                                width: '22px', height: '22px', flexShrink: 0, borderRadius: '4px',
                                border: '1px solid #cbd5e0', background: 'transparent', color: '#333',
                                cursor: isUnread ? 'pointer' : 'default', fontSize: '13px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px'
                              }}
                            >
                              {!isUnread ? '✓' : ''}
                            </button>
                            {/* Star */}
                            <StarButton
                              starred={!!(m.starredBy || []).includes(uid)}
                              onToggle={async () => {
                                const isStarred = (m.starredBy || []).includes(uid);
                                await updateDoc(doc(db, 'researcherMessages', m.id), { starredBy: isStarred ? arrayRemove(uid) : arrayUnion(uid) });
                              }}
                            />
                            {/* Content — click to expand */}
                            <div
                              style={{ flex: 1, cursor: 'pointer', overflow: 'hidden' }}
                              onClick={async () => {
                                setExpandedThread(isExpanded ? null : m.id);
                                if (isUnread) await updateDoc(doc(db, 'researcherMessages', m.id), { read: true });
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: '14px', color: '#111827' }}>
                                  {m.title}
                                </span>
                                <span style={{ fontSize: '11px', color: '#7c3aed', marginRight: '8px', fontWeight: 500 }}>
                                  רשות המחקר
                                </span>
                                {isUnread && (
                                  <span style={{ fontSize: '11px', background: '#7c3aed', color: 'white', borderRadius: '10px', padding: '1px 7px', marginRight: '4px' }}>
                                    חדש
                                  </span>
                                )}
                              </div>
                              {!isExpanded && (
                                <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {m.message}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {shortDate(m.createdAt)}
                              </div>
                            </div>
                            {/* Trash */}
                            <button
                              type="button"
                              title="מחק"
                              onClick={async () => updateDoc(doc(db, 'researcherMessages', m.id), { deleted: true, starredBy: arrayRemove(uid) })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#d1d5db', padding: '0 2px', flexShrink: 0 }}
                            >
                              🗑️
                            </button>
                          </div>

                          {/* ── expanded: message + replies + reply button ── */}
                          {isExpanded && (
                            <div style={{ padding: '0 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {/* original message */}
                              <div style={{ color: '#374151', fontSize: '13px', whiteSpace: 'pre-wrap', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                                {m.message}
                              </div>
                              {/* replies */}
                              {(m.replies || []).map((r, i) => (
                                <div key={i} style={{ fontSize: '13px', padding: '8px 10px', borderRadius: '6px', background: r.fromRole === 'admin' ? '#f5f3ff' : '#f9fafb', border: '1px solid #e5e7eb', direction: 'rtl' }}>
                                  <span style={{ fontWeight: 600, marginLeft: '6px' }}>{r.fromName}:</span>
                                  <span style={{ color: '#374151' }}>{r.text}</span>
                                </div>
                              ))}
                              {/* השב button — shows textarea when clicked */}
                              {!replyOpen[m.id] ? (
                                <button
                                  type="button"
                                  onClick={() => setReplyOpen((prev) => ({ ...prev, [m.id]: true }))}
                                  style={{ alignSelf: 'flex-start', padding: '5px 16px', background: 'white', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                                >
                                  השב
                                </button>
                              ) : (
                                <div style={{ marginTop: '4px' }}>
                                  <textarea
                                    autoFocus
                                    value={replyText}
                                    onChange={(e) => setReplyInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                    placeholder="כתוב תגובה..."
                                    style={{ width: '100%', minHeight: '60px', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px', fontSize: '13px', resize: 'vertical', direction: 'rtl', boxSizing: 'border-box' }}
                                  />
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={isSending || !replyText.trim()}
                                      onClick={async () => {
                                        if (!replyText.trim()) return;
                                        setReplySending(m.id);
                                        try {
                                          await updateDoc(doc(db, 'researcherMessages', m.id), {
                                            replies: arrayUnion({ text: replyText.trim(), fromName: user?.name || 'חוקר', fromRole: 'researcher', createdAt: Date.now() }),
                                            researcherRead: false
                                          });
                                          await createNotification({
                                            userId: 'ADMIN',
                                            title: `תגובה חדשה מ-${user?.name || 'חוקר'}`,
                                            message: `${user?.name || 'חוקר'} השיב להודעה: "${m.title}"`,
                                            type: 'message',
                                            entityType: 'researcherMessage',
                                            entityId: m.id,
                                            link: '/notifications',
                                            eventKey: `researcher_reply:${m.id}:${Date.now()}`,
                                            targetRole: 'ADMIN'
                                          });
                                          setReplyInputs((prev) => ({ ...prev, [m.id]: '' }));
                                          setReplyOpen((prev) => ({ ...prev, [m.id]: false }));
                                        } finally { setReplySending(null); }
                                      }}
                                      style={{ padding: '5px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                      {isSending ? 'שולח...' : 'שלח'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReplyOpen((prev) => ({ ...prev, [m.id]: false }))}
                                      style={{ padding: '5px 12px', background: 'white', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                      ביטול
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── התראות מערכת ── */}
                {!loading && activeNotifications.length === 0 && activeResearcherIncoming.length === 0 && (
                  <p style={{ color: '#888', textAlign: 'right' }}>אין התראות להצגה</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeNotifications.map((n) => <NotificationCard key={n.id} n={n} />)}
                </div>
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
                                <ThreadView thread={m} isAdminSide={false} />
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
                        {/* Trash */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="מחק הודעה"
                            onClick={() => handleDeleteOutboxThread(thread.id)}
                            style={{
                              width: '26px', height: '26px', borderRadius: '4px',
                              border: '1px solid #e2e8f0', background: 'transparent',
                              cursor: 'pointer', fontSize: '13px', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                            }}
                          >
                            🗑️
                          </button>
                        </div>
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
