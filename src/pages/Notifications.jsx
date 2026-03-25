import React, { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  writeBatch, getDocs, deleteDoc, addDoc, serverTimestamp, arrayUnion
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

  const [activeTab, setActiveTab] = useState(isAdmin ? 'send' : 'all');

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Admin: send to researchers ───────────────────────────────────────────────
  const [researchers, setResearchers] = useState([]);
  const [selectedResearcherIds, setSelectedResearcherIds] = useState([]);
  const [importantTitle, setImportantTitle] = useState('');
  const [importantMessage, setImportantMessage] = useState('');
  const [sending, setSending] = useState(false);

  // ── Admin: incoming messages ─────────────────────────────────────────────────
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [unreadIncoming, setUnreadIncoming] = useState(0);

  // ── Researcher: compose + outbox ─────────────────────────────────────────────
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [outboxMessages, setOutboxMessages] = useState([]);
  const [outboxLoading, setOutboxLoading] = useState(false);

  // ── Thread state (shared) ────────────────────────────────────────────────────
  const [expandedThread, setExpandedThread] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [replySending, setReplySending] = useState(null);

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

  // ─── Researcher: outbox ───────────────────────────────────────────────────────
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

  // ─── Notification handlers ───────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const handleDeleteNotification = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'notifications', id), { deleted: true });
  };

  const handleRestoreNotification = async (id) => {
    if (!db || !id) return;
    await updateDoc(doc(db, 'notifications', id), { deleted: false });
  };

  const handlePermanentDelete = async (id) => {
    if (!db || !id) return;
    await deleteDoc(doc(db, 'notifications', id));
  };

  const handleMarkAllRead = async () => {
    if (!db || activeNotifications.length === 0) return;
    const batch = writeBatch(db);
    activeNotifications.forEach((n) => {
      if (!n.read) batch.update(doc(db, 'notifications', n.id), { read: true });
    });
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
      const ts = Date.now();
      await Promise.all(
        selectedResearcherIds.map((uid) =>
          createNotification({
            userId: uid,
            title: importantTitle.trim() || 'הודעה חשובה',
            message: importantMessage.trim(),
            type: 'important',
            entityType: 'system',
            entityId: '',
            link: '/notifications',
            eventKey: `important:${uid}:${ts}`
          })
        )
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

  const activeNotifications = notifications.filter((n) => !n.deleted);
  const trashedNotifications = notifications.filter((n) => n.deleted === true);
  const unreadCount = activeNotifications.filter((n) => !n.read).length;
  const unreadRepliesCount = outboxMessages.filter((m) => m.researcherRead === false).length;

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

  const NotificationCard = ({ n }) => (
    <div style={{
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
      <button
        type="button"
        onClick={() => handleDeleteNotification(n.id)}
        title="מחק התראה"
        style={{
          width: '28px', height: '28px', flexShrink: 0, borderRadius: '4px',
          border: '1px solid #cbd5e0', background: 'transparent', cursor: 'pointer',
          fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
        }}
      >
        🗑️
      </button>
    </div>
  );

  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
  if (isAdmin()) {
    return (
      <div className="page-container">
        <div className="page-content" style={{ maxWidth: '900px' }}>
          <h1 style={{ margin: '0 0 20px' }}>התראות</h1>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button style={tabStyle(activeTab === 'send')} onClick={() => setActiveTab('send')}>
              ✉️ שליחת הודעה לחוקרים
            </button>
            <button style={tabStyle(activeTab === 'incoming')} onClick={() => setActiveTab('incoming')}>
              📬 הודעות נכנסות מחוקרים
              {unreadIncoming > 0 && (
                <span style={{
                  marginRight: '6px', background: '#e03131', color: 'white',
                  borderRadius: '10px', padding: '1px 7px', fontSize: '12px'
                }}>
                  {unreadIncoming}
                </span>
              )}
            </button>
          </div>

          {/* ── Admin: send tab ── */}
          {activeTab === 'send' && (
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
              <h2 style={{ marginTop: 0 }}>שליחת הודעה חשובה לחוקרים</h2>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>בחר/י חוקרים:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectedResearcherIds.length === researchers.length && researchers.length > 0}
                    onChange={handleSelectAllResearchers}
                  />
                  <label htmlFor="select-all" style={{ cursor: 'pointer', fontSize: '14px' }}>בחר/י הכל</label>
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
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px' }}
                />
                <textarea
                  placeholder="תוכן ההודעה..."
                  value={importantMessage}
                  onChange={(e) => setImportantMessage(e.target.value)}
                  rows={4}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
              <button
                type="button"
                onClick={handleSendImportant}
                disabled={sending || selectedResearcherIds.length === 0 || !importantMessage.trim()}
                style={{
                  padding: '8px 20px',
                  background: sending || selectedResearcherIds.length === 0 || !importantMessage.trim() ? '#ccc' : '#28a745',
                  color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px',
                  cursor: sending || selectedResearcherIds.length === 0 || !importantMessage.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? 'שולח...' : `שלח${selectedResearcherIds.length > 1 ? ` (${selectedResearcherIds.length} חוקרים)` : ''}`}
              </button>
            </div>
          )}

          {/* ── Admin: incoming tab ── */}
          {activeTab === 'incoming' && (
            <div>
              <h2 style={{ marginTop: 0 }}>הודעות נכנסות מחוקרים</h2>
              {incomingLoading && <p style={{ color: '#888' }}>טוען...</p>}
              {!incomingLoading && incomingMessages.length === 0 && (
                <p style={{ color: '#888' }}>אין הודעות נכנסות</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incomingMessages.map((m) => {
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
                      {/* Header row */}
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

                      {/* Thread conversation */}
                      {isExpanded && <ThreadView thread={m} isAdminSide={true} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RESEARCHER VIEW (Gmail-style sidebar layout) ────────────────────────────
  const sidebarItems = [
    { key: 'all',     label: 'תיבת התראות והודעות', count: unreadCount,               countColor: '#c0392b' },
    { key: 'outbox',  label: 'דואר יוצא',   count: unreadRepliesCount,        countColor: '#c0392b' },
    { key: 'deleted', label: 'אשפה',        count: trashedNotifications.length, countColor: '#868e96' },
  ];

  const contentTitle = {
    all:     'תיבת התראות והודעות',
    outbox:  'דואר יוצא',
    deleted: 'אשפה',
    compose: 'הודעה חדשה לרשות'
  }[activeTab];

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
              {activeTab === 'deleted' && trashedNotifications.length > 0 && (
                <button
                  onClick={async () => {
                    const batch = writeBatch(db);
                    trashedNotifications.forEach((n) => batch.delete(doc(db, 'notifications', n.id)));
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
                {!loading && activeNotifications.length === 0 && <p style={{ color: '#888', textAlign: 'right' }}>אין התראות להצגה</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeNotifications.map((n) => <NotificationCard key={n.id} n={n} />)}
                </div>
              </div>
            )}

            {/* ── אשפה ── */}
            {activeTab === 'deleted' && (
              <div>
                {trashedNotifications.length === 0 && <p style={{ color: '#888', textAlign: 'right' }}>האשפה ריקה</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              </div>
            )}

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
            {activeTab === 'outbox' && (
              <div>
                {outboxLoading && <p style={{ color: '#888', textAlign: 'right' }}>טוען...</p>}
                {!outboxLoading && outboxMessages.length === 0 && <p style={{ color: '#888', textAlign: 'right' }}>לא שלחת הודעות עדיין</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {outboxMessages.map((m) => {
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
                          style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}
                          onClick={() => handleExpandThread(m.id, m)}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                              {hasNewReply && (
                                <span style={{
                                  fontSize: '11px', background: '#1a56db', color: 'white',
                                  borderRadius: '8px', padding: '2px 8px'
                                }}>
                                  תגובה חדשה
                                </span>
                              )}
                              {m.title}
                            </div>
                            {!isExpanded && (
                              <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                                {m.message.length > 100 ? m.message.slice(0, 100) + '...' : m.message}
                              </div>
                            )}
                            <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                              <span style={{ color: m.read ? '#2e7d32' : '#868e96' }}>
                                {m.read ? '✓ נקרא' : 'ממתין לקריאה'}
                              </span>
                              {replyCount > 0 && <span>{replyCount} תגובות</span>}
                              <span>{formatDate(m.createdAt)}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, paddingTop: '2px' }}>
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
          </div>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{ width: '210px', flexShrink: 0, padding: '20px 12px', background: '#f6f8fc', order: -1 }}>

            {/* Compose button */}
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
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
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '9px 16px',
                      background: isActive ? '#d3e3fd' : 'transparent',
                      color: isActive ? '#1a56db' : '#444',
                      fontWeight: isActive ? 700 : 400,
                      border: 'none', borderRadius: '20px 0 0 20px',
                      cursor: 'pointer', fontSize: '14px',
                      textAlign: 'right', marginBottom: '2px',
                      transition: 'background 0.1s'
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
