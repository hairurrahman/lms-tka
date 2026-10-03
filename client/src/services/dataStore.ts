// Unified data layer. In production, calls go to Firestore.
// In DEMO_MODE, they hit in-memory mock data so the UI works offline.
//
// Replace the demo branches with production-ready Firestore calls as shown
// in the comments. Example signatures match `firebase/firestore` v10.

import { DEMO_MODE, db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

/** SHA-256 hash of a plaintext password (hex string). There is no backend
 *  server here, so this is a pragmatic step up from plaintext — not a
 *  substitute for real server-verified authentication. See the note in
 *  firestore.rules about the security tradeoffs of this NISN/no-Firebase-Auth
 *  design. */
export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(plain);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

import {
  MOCK_BADGES,
  MOCK_CHAPTERS,
  MOCK_COMMENTS,
  MOCK_MATERIALS,
  MOCK_POSTS,
  MOCK_QUIZZES,
  MOCK_SCORES,
  MOCK_SUBJECTS,
  MOCK_USERS,
  type AppUser,
  type Badge,
  type Chapter,
  type Comment,
  type Material,
  type Post,
  type Quiz,
  type Score,
  type StudentAnswer,
  type Subject,
  type Subtopic,
  type Topic,
  type SchoolSettings,
  type Kelas,
  MOCK_SCHOOL_SETTINGS,
  MOCK_KELAS,
} from '@/lib/mockData';

// ---------- Mutable in-memory store (DEMO MODE) ----------
const store = {
  users: [...MOCK_USERS],
  subjects: [...MOCK_SUBJECTS],
  chapters: [...MOCK_CHAPTERS],
  materials: [...MOCK_MATERIALS],
  quizzes: [...MOCK_QUIZZES],
  scores: [...MOCK_SCORES],
  badges: [...MOCK_BADGES],
  posts: [...MOCK_POSTS],
  comments: [...MOCK_COMMENTS],
  schoolSettings: { ...MOCK_SCHOOL_SETTINGS },
  kelas: [...MOCK_KELAS],
};

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((fn) => fn());
}
export function subscribe(fn: Listener): Unsubscribe {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- School settings (single school: name + logo) ----------
const SCHOOL_SETTINGS_DOC_ID = 'school';

export async function getSchoolSettings(): Promise<SchoolSettings> {
  if (DEMO_MODE || !db) return { ...store.schoolSettings };
  const snap = await getDoc(doc(db, 'settings', SCHOOL_SETTINGS_DOC_ID));
  if (!snap.exists()) return { name: 'SekolahSeru' };
  return snap.data() as SchoolSettings;
}

export async function updateSchoolSettings(data: Partial<SchoolSettings>): Promise<SchoolSettings> {
  if (DEMO_MODE || !db) {
    store.schoolSettings = { ...store.schoolSettings, ...data };
    notify();
    return { ...store.schoolSettings };
  }
  await setDoc(doc(db, 'settings', SCHOOL_SETTINGS_DOC_ID), data, { merge: true });
  return getSchoolSettings();
}

// ---------- Kelas (classes) ----------
export async function getKelasList(): Promise<Kelas[]> {
  if (DEMO_MODE || !db) return [...store.kelas];
  const snap = await getDocs(collection(db, 'kelas'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Kelas, 'id'>), id: d.id }));
}

export async function createKelas(data: Omit<Kelas, 'id'>): Promise<Kelas> {
  if (DEMO_MODE || !db) {
    const k: Kelas = { ...data, id: uid() };
    store.kelas.push(k);
    notify();
    return k;
  }
  const ref = await addDoc(collection(db, 'kelas'), data);
  return { ...data, id: ref.id };
}

export async function updateKelas(id: string, data: Partial<Omit<Kelas, 'id'>>): Promise<void> {
  if (DEMO_MODE || !db) {
    const idx = store.kelas.findIndex((k) => k.id === id);
    if (idx >= 0) store.kelas[idx] = { ...store.kelas[idx], ...data };
    notify();
    return;
  }
  await updateDoc(doc(db, 'kelas', id), data);
}

export async function deleteKelas(id: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.kelas = store.kelas.filter((k) => k.id !== id);
    notify();
    return;
  }
  await deleteDoc(doc(db, 'kelas', id));
}

/** All siswa in the classes assigned to this guru (empty if guru has no class). */
export async function getStudentsForGuru(guruId: string): Promise<AppUser[]> {
  const [allUsers, kelasList] = await Promise.all([getAllUsers(), getKelasList()]);
  const myKelasIds = new Set(kelasList.filter((k) => k.guruId === guruId).map((k) => k.id));
  return allUsers.filter((u) => u.role === 'siswa' && u.kelasId && myKelasIds.has(u.kelasId));
}

// ---------- Subjects ----------
export async function getSubjects(): Promise<Subject[]> {
  if (DEMO_MODE || !db) return [...store.subjects];
  const snap = await getDocs(collection(db, 'subjects'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Subject, 'id'>), id: d.id }));
}

export async function createSubject(data: Omit<Subject, 'id'>): Promise<Subject> {
  if (DEMO_MODE || !db) {
    const s: Subject = { ...data, id: uid() };
    store.subjects.push(s);
    notify();
    return s;
  }
  const ref = await addDoc(collection(db, 'subjects'), data);
  return { ...data, id: ref.id };
}

export async function updateSubject(id: string, data: Partial<Omit<Subject, 'id'>>): Promise<void> {
  if (DEMO_MODE || !db) {
    const idx = store.subjects.findIndex((s) => s.id === id);
    if (idx >= 0) store.subjects[idx] = { ...store.subjects[idx], ...data };
    notify();
    return;
  }
  await updateDoc(doc(db, 'subjects', id), data);
}

export async function deleteSubject(id: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.subjects = store.subjects.filter((s) => s.id !== id);
    store.chapters = store.chapters.filter((c) => c.subjectId !== id);
    store.materials = store.materials.filter((m) => m.subjectId !== id);
    notify();
    return;
  }
  await deleteDoc(doc(db, 'subjects', id));
}

// ---------- Chapters (nested) ----------
export async function getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
  if (DEMO_MODE || !db) {
    return store.chapters.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order);
  }
  const q = query(collection(db, 'chapters'), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ ...(d.data() as Omit<Chapter, 'id'>), id: d.id }));
  return data.sort((a, b) => a.order - b.order);
}

export async function getAllChapters(): Promise<Chapter[]> {
  if (DEMO_MODE || !db) return [...store.chapters];
  const snap = await getDocs(collection(db, 'chapters'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Chapter, 'id'>), id: d.id }));
}

export async function createChapter(data: Omit<Chapter, 'id' | 'topics'> & { topics?: Topic[] }): Promise<Chapter> {
  const chapter: Chapter = { ...data, id: uid(), topics: data.topics ?? [] };
  if (DEMO_MODE || !db) {
    store.chapters.push(chapter);
    notify();
    return chapter;
  }
  const ref = await addDoc(collection(db, 'chapters'), chapter);
  return { ...chapter, id: ref.id };
}

export async function updateChapter(id: string, data: Partial<Chapter>): Promise<void> {
  if (DEMO_MODE || !db) {
    const idx = store.chapters.findIndex((c) => c.id === id);
    if (idx >= 0) store.chapters[idx] = { ...store.chapters[idx], ...data };
    notify();
    return;
  }
  await updateDoc(doc(db, 'chapters', id), data);
}

export async function deleteChapter(id: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.chapters = store.chapters.filter((c) => c.id !== id);
    notify();
    return;
  }
  await deleteDoc(doc(db, 'chapters', id));
}

// ---------- Topics & Subtopics (nested inside chapters) ----------
export async function addTopic(chapterId: string, title: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const ch = store.chapters.find((c) => c.id === chapterId);
    if (ch) ch.topics.push({ id: uid(), title, subtopics: [] });
    notify();
    return;
  }
  // Firestore: ambil, push, update
  const ref = doc(db, 'chapters', chapterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const chapter = snap.data() as Chapter;
  chapter.topics = [...(chapter.topics || []), { id: uid(), title, subtopics: [] }];
  await updateDoc(ref, { topics: chapter.topics });
}

export async function updateTopic(chapterId: string, topicId: string, title: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const ch = store.chapters.find((c) => c.id === chapterId);
    if (ch) {
      const t = ch.topics.find((x) => x.id === topicId);
      if (t) t.title = title;
    }
    notify();
    return;
  }
  const ref = doc(db, 'chapters', chapterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const chapter = snap.data() as Chapter;
  chapter.topics = chapter.topics.map((t) => (t.id === topicId ? { ...t, title } : t));
  await updateDoc(ref, { topics: chapter.topics });
}

export async function deleteTopic(chapterId: string, topicId: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const ch = store.chapters.find((c) => c.id === chapterId);
    if (ch) ch.topics = ch.topics.filter((t) => t.id !== topicId);
    notify();
    return;
  }
  const ref = doc(db, 'chapters', chapterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const chapter = snap.data() as Chapter;
  chapter.topics = chapter.topics.filter((t) => t.id !== topicId);
  await updateDoc(ref, { topics: chapter.topics });
}

export async function addSubtopic(chapterId: string, topicId: string, title: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const ch = store.chapters.find((c) => c.id === chapterId);
    if (ch) {
      const t = ch.topics.find((x) => x.id === topicId);
      if (t) t.subtopics.push({ id: uid(), title });
    }
    notify();
    return;
  }
  const ref = doc(db, 'chapters', chapterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const chapter = snap.data() as Chapter;
  chapter.topics = chapter.topics.map((t) =>
    t.id === topicId ? { ...t, subtopics: [...t.subtopics, { id: uid(), title }] } : t,
  );
  await updateDoc(ref, { topics: chapter.topics });
}

export async function updateSubtopic(chapterId: string, topicId: string, subtopicId: string, title: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const ch = store.chapters.find((c) => c.id === chapterId);
    if (ch) {
      const t = ch.topics.find((x) => x.id === topicId);
      if (t) {
        const s = t.subtopics.find((x) => x.id === subtopicId);
        if (s) s.title = title;
      }
    }
    notify();
    return;
  }
  const ref = doc(db, 'chapters', chapterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const chapter = snap.data() as Chapter;
  chapter.topics = chapter.topics.map((t) =>
    t.id === topicId
      ? { ...t, subtopics: t.subtopics.map((s) => (s.id === subtopicId ? { ...s, title } : s)) }
      : t,
  );
  await updateDoc(ref, { topics: chapter.topics });
}

export async function deleteSubtopic(chapterId: string, topicId: string, subtopicId: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const ch = store.chapters.find((c) => c.id === chapterId);
    if (ch) {
      const t = ch.topics.find((x) => x.id === topicId);
      if (t) t.subtopics = t.subtopics.filter((s) => s.id !== subtopicId);
    }
    notify();
    return;
  }
  const ref = doc(db, 'chapters', chapterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const chapter = snap.data() as Chapter;
  chapter.topics = chapter.topics.map((t) =>
    t.id === topicId ? { ...t, subtopics: t.subtopics.filter((s) => s.id !== subtopicId) } : t,
  );
  await updateDoc(ref, { topics: chapter.topics });
}

// ---------- Materials ----------
export async function getMaterialsBySubject(subjectId: string): Promise<Material[]> {
  if (DEMO_MODE || !db) return store.materials.filter((m) => m.subjectId === subjectId);
  const q = query(collection(db, 'materials'), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ ...(d.data() as Omit<Material, 'id'>), id: d.id }));
  return data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getMaterial(id: string): Promise<Material | null> {
  if (DEMO_MODE || !db) return store.materials.find((m) => m.id === id) ?? null;
  const snap = await getDoc(doc(db, 'materials', id));
  return snap.exists() ? ({ ...(snap.data() as Omit<Material, 'id'>), id: snap.id }) : null;
}

export async function getAllMaterials(): Promise<Material[]> {
  if (DEMO_MODE || !db) return [...store.materials];
  const snap = await getDocs(collection(db, 'materials'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Material, 'id'>), id: d.id }));
}

export async function createMaterial(data: Omit<Material, 'id' | 'createdAt'>): Promise<Material> {
  if (DEMO_MODE || !db) {
    const m: Material = { ...data, id: uid(), createdAt: Date.now() };
    store.materials.unshift(m);
    notify();
    return m;
  }
  const ref = await addDoc(collection(db, 'materials'), { ...data, createdAt: serverTimestamp() });
  return { ...data, id: ref.id, createdAt: Date.now() };
}

export async function updateMaterial(id: string, data: Partial<Omit<Material, 'id' | 'createdAt'>>): Promise<void> {
  if (DEMO_MODE || !db) {
    const idx = store.materials.findIndex((m) => m.id === id);
    if (idx >= 0) store.materials[idx] = { ...store.materials[idx], ...data };
    notify();
    return;
  }
  await updateDoc(doc(db, 'materials', id), data);
}

export async function deleteMaterial(id: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.materials = store.materials.filter((m) => m.id !== id);
    store.quizzes = store.quizzes.filter((q) => q.materialId !== id);
    notify();
    return;
  }
  await deleteDoc(doc(db, 'materials', id));
}

// ---------- Quizzes ----------
export async function getQuizzesByMaterial(materialId: string): Promise<Quiz[]> {
  if (DEMO_MODE || !db) return store.quizzes.filter((q) => q.materialId === materialId);
  const q = query(collection(db, 'quizzes'), where('materialId', '==', materialId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Quiz, 'id'>), id: d.id }));
}

export async function getAllQuizzes(): Promise<Quiz[]> {
  if (DEMO_MODE || !db) return [...store.quizzes];
  const snap = await getDocs(collection(db, 'quizzes'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Quiz, 'id'>), id: d.id }));
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  if (DEMO_MODE || !db) return store.quizzes.find((q) => q.id === id) ?? null;
  const snap = await getDoc(doc(db, 'quizzes', id));
  return snap.exists() ? ({ ...(snap.data() as Omit<Quiz, 'id'>), id: snap.id }) : null;
}

export async function createQuiz(data: Omit<Quiz, 'id'>): Promise<Quiz> {
  if (DEMO_MODE || !db) {
    const q: Quiz = { ...data, id: uid() };
    store.quizzes.push(q);
    notify();
    return q;
  }
  const ref = await addDoc(collection(db, 'quizzes'), data);
  return { ...data, id: ref.id };
}

export async function updateQuiz(id: string, data: Partial<Omit<Quiz, 'id'>>): Promise<void> {
  if (DEMO_MODE || !db) {
    const idx = store.quizzes.findIndex((q) => q.id === id);
    if (idx >= 0) store.quizzes[idx] = { ...store.quizzes[idx], ...data } as Quiz;
    notify();
    return;
  }
  await updateDoc(doc(db, 'quizzes', id), data);
}

export async function deleteQuiz(id: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.quizzes = store.quizzes.filter((q) => q.id !== id);
    notify();
    return;
  }
  await deleteDoc(doc(db, 'quizzes', id));
}

// ---------- Scores ----------
export async function submitScore(data: Omit<Score, 'id' | 'completedAt'>): Promise<Score> {
  const score: Score = { ...data, id: uid(), completedAt: Date.now() };
  if (DEMO_MODE || !db) {
    const existingIdx = store.scores.findIndex((s) => s.userId === data.userId && s.quizId === data.quizId);
    let oldPoints = 0;
    if (existingIdx >= 0) {
      oldPoints = store.scores[existingIdx].points || 0;
      store.scores.splice(existingIdx, 1);
    }
    store.scores.unshift(score);
    const user = store.users.find((u) => u.id === data.userId);
    if (user) user.points = (user.points || 0) - oldPoints + data.points;
    notify();
    return score;
  }
  
  const activeDb = db;
  const q = query(collection(activeDb, 'scores'), where('userId', '==', data.userId), where('quizId', '==', data.quizId));
  const snap = await getDocs(q);
  
  let oldPoints = 0;
  if (!snap.empty) {
    const deletePromises = snap.docs.map((d) => {
      const oldData = d.data() as Score;
      oldPoints += (oldData.points || 0);
      return deleteDoc(doc(activeDb, 'scores', d.id));
    });
    await Promise.all(deletePromises);
  }

  const ref = await addDoc(collection(activeDb, 'scores'), { ...data, completedAt: serverTimestamp() });
  
  const pointDiff = data.points - oldPoints;
  if (pointDiff !== 0) {
    await updateDoc(doc(activeDb, 'users', data.userId), { points: increment(pointDiff) });
  }
  
  return { ...score, id: ref.id };
}

export async function resetStudentProgress(studentId: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.scores = store.scores.filter((s) => s.userId !== studentId);
    const user = store.users.find((u) => u.id === studentId);
    if (user) {
      user.points = 0;
      user.badges = [];
    }
    notify();
    return;
  }
  const activeDb = db;
  const q = query(collection(activeDb, 'scores'), where('userId', '==', studentId));
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((d) => deleteDoc(doc(activeDb, 'scores', d.id)));
  await Promise.all(deletePromises);
  await updateDoc(doc(activeDb, 'users', studentId), {
    points: 0,
    badges: []
  });
}

export async function getScoresByUser(userId: string): Promise<Score[]> {
  if (DEMO_MODE || !db) return store.scores.filter((s) => s.userId === userId);
  const q = query(collection(db, 'scores'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ ...(d.data() as Omit<Score, 'id'>), id: d.id }));
  return data.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
}

export async function getAllScores(): Promise<Score[]> {
  if (DEMO_MODE || !db) return [...store.scores];
  const snap = await getDocs(collection(db, 'scores'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Score, 'id'>), id: d.id }));
}

// ---------- Essay grading ----------
export async function getPendingEssayScores(): Promise<Score[]> {
  if (DEMO_MODE || !db) {
    return store.scores.filter((s) => s.hasPendingGrading);
  }
  const q = query(collection(db, 'scores'), where('hasPendingGrading', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Score, 'id'>), id: d.id }));
}

export async function gradeEssayAnswers(
  scoreId: string,
  grades: { questionId: string; manualScore: number; teacherFeedback?: string }[],
  teacherId: string,
): Promise<void> {
  if (DEMO_MODE || !db) {
    const sc = store.scores.find((s) => s.id === scoreId);
    if (!sc) return;
    let totalManual = 0;
    sc.answers = sc.answers.map((a) => {
      const g = grades.find((x) => x.questionId === a.questionId);
      if (g) {
        totalManual += g.manualScore;
        return {
          ...a,
          manualScore: g.manualScore,
          teacherFeedback: g.teacherFeedback,
          gradedAt: Date.now(),
          gradedBy: teacherId,
        };
      }
      return a;
    });
    sc.manualPoints = totalManual;
    sc.points = sc.autoPoints + totalManual;
    // masih ada essay yang belum dinilai?
    sc.hasPendingGrading = sc.answers.some((a) => a.type === 'essay' && (a.manualScore === null || a.manualScore === undefined));
    // Tambah selisih points ke user
    const user = store.users.find((u) => u.id === sc.userId);
    if (user) {
      user.points += totalManual;
    }
    notify();
    return;
  }
  // Firestore path
  const ref = doc(db, 'scores', scoreId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const sc = snap.data() as Score;
  let totalManual = 0;
  const newAnswers: StudentAnswer[] = sc.answers.map((a) => {
    const g = grades.find((x) => x.questionId === a.questionId);
    if (g) {
      totalManual += g.manualScore;
      return { ...a, manualScore: g.manualScore, teacherFeedback: g.teacherFeedback, gradedAt: Date.now(), gradedBy: teacherId };
    }
    return a;
  });
  const pending = newAnswers.some((a) => a.type === 'essay' && (a.manualScore === null || a.manualScore === undefined));
  await updateDoc(ref, {
    answers: newAnswers,
    manualPoints: totalManual,
    points: sc.autoPoints + totalManual,
    hasPendingGrading: pending,
  });
  await updateDoc(doc(db, 'users', sc.userId), { points: increment(totalManual) });
}

// ---------- Users / Leaderboard ----------
export async function getUser(id: string): Promise<AppUser | null> {
  if (DEMO_MODE || !db) return store.users.find((u) => u.id === id) ?? null;
  const snap = await getDoc(doc(db, 'users', id));
  return snap.exists() ? ({ ...(snap.data() as Omit<AppUser, 'id'>), id: snap.id }) : null;
}

export async function updateUser(id: string, data: Partial<Omit<AppUser, 'id'>>): Promise<void> {
  if (DEMO_MODE || !db) {
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx >= 0) store.users[idx] = { ...store.users[idx], ...data } as AppUser;
    notify();
    return;
  }
  await updateDoc(doc(db, 'users', id), data);
}

/** Set (or reset) a guru/administrator's password. No Firebase Auth involved —
 *  just stores a new hash directly on their Firestore document. */
export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
  const hashed = await hashPassword(newPassword);
  if (await isStaffPasswordTaken(hashed, userId)) {
    throw new Error('Password ini sudah dipakai staf lain. Karena login sekarang hanya pakai password, tiap orang wajib punya password yang berbeda.');
  }
  if (DEMO_MODE || !db) {
    const idx = store.users.findIndex((u) => u.id === userId);
    if (idx >= 0) store.users[idx] = { ...store.users[idx], password: hashed };
    notify();
    return;
  }
  await updateDoc(doc(db, 'users', userId), { password: hashed });
}

/** Guru & Administrator now log in with PASSWORD ONLY (no name/username
 *  needed) — the password itself is looked up across all staff accounts, so
 *  it must stay unique per person (enforced in createUser/setUserPassword
 *  below). Returns the matching user, or null if nothing (or more than one,
 *  which shouldn't happen given the uniqueness check) matches. */
export async function verifyStaffLogin(password: string): Promise<AppUser | null> {
  if (!password) return null;
  const hashed = await hashPassword(password);
  const all = await getAllUsers();
  const matches = all.filter((u) => (u.role === 'guru' || u.role === 'administrator') && u.password === hashed);
  return matches.length === 1 ? matches[0] : null;
}

/** True if some OTHER guru/administrator already uses this exact password. */
async function isStaffPasswordTaken(hashedPassword: string, excludeUserId?: string): Promise<boolean> {
  const all = await getAllUsers();
  return all.some(
    (u) => (u.role === 'guru' || u.role === 'administrator') && u.id !== excludeUserId && u.password === hashedPassword
  );
}

/** Create a siswa (NISN, no password), guru (Name + password), or
 *  administrator (username + password). No Firebase Auth is involved for
 *  any role — everything is a plain Firestore document. `password` is
 *  required for guru/administrator and gets hashed before storing. */
export async function createUser(
  data: Omit<AppUser, 'id' | 'points' | 'badges' | 'streakDays' | 'password'>,
  password?: string
): Promise<AppUser> {
  const hashed = password ? await hashPassword(password) : undefined;
  if (hashed && (data.role === 'guru' || data.role === 'administrator') && (await isStaffPasswordTaken(hashed))) {
    throw new Error('Password ini sudah dipakai staf lain. Karena login sekarang hanya pakai password, tiap orang wajib punya password yang berbeda.');
  }
  const newUser: AppUser = {
    ...data,
    id: uid(),
    password: hashed,
    points: 0,
    badges: [],
    streakDays: 0,
  };

  if (DEMO_MODE || !db) {
    store.users.push(newUser);
    notify();
    return newUser;
  }

  const toSave: Record<string, unknown> = {
    name: newUser.name,
    role: newUser.role,
    avatar: newUser.avatar,
    points: 0,
    badges: [],
    streakDays: 0,
  };
  if (newUser.role === 'siswa') {
    toSave.nisn = newUser.nisn ?? null;
    toSave.kelas = newUser.kelas ?? null;
    toSave.kelasId = newUser.kelasId ?? null;
  } else {
    // guru or administrator
    toSave.password = hashed ?? null;
    if (newUser.role === 'administrator') toSave.username = newUser.username ?? null;
  }

  const ref = await addDoc(collection(db, 'users'), toSave);
  return { ...newUser, id: ref.id };
}

/** Look up a siswa by NISN for login (no password involved). */
export async function getUserByNisn(nisn: string): Promise<AppUser | null> {
  if (DEMO_MODE || !db) {
    return store.users.find((u) => u.role === 'siswa' && u.nisn === nisn) ?? null;
  }
  const q = query(collection(db, 'users'), where('role', '==', 'siswa'), where('nisn', '==', nisn));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...(d.data() as Omit<AppUser, 'id'>), id: d.id };
}

export async function deleteUser(id: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.users = store.users.filter((u) => u.id !== id);
    notify();
    return;
  }
  // Menghapus data doc di Firestore. Akun Auth asli butuh Admin SDK di backend.
  await deleteDoc(doc(db, 'users', id));
}

export async function getAllUsers(): Promise<AppUser[]> {
  if (DEMO_MODE || !db) return [...store.users];
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<AppUser, 'id'>), id: d.id }));
}

export async function getLeaderboard(limitCount = 10): Promise<AppUser[]> {
  if (DEMO_MODE || !db) {
    return store.users
      .filter((u) => u.role === 'siswa')
      .sort((a, b) => b.points - a.points)
      .slice(0, limitCount);
  }
  const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ ...(d.data() as Omit<AppUser, 'id'>), id: d.id }));
  return data.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, limitCount);
}

export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  if (DEMO_MODE || !db) {
    const u = store.users.find((x) => x.id === userId);
    if (u && !u.badges.includes(badgeId)) {
      u.badges.push(badgeId);
      notify();
    }
    return;
  }
  await updateDoc(doc(db, 'users', userId), { badges: arrayUnion(badgeId) });
}

// ---------- Badges ----------
export async function getBadges(): Promise<Badge[]> {
  if (DEMO_MODE || !db) return [...store.badges];
  const snap = await getDocs(collection(db, 'badges'));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Badge, 'id'>), id: d.id }));
}

// ---------- Discussions ----------
export async function getPostsBySubject(subjectId: string): Promise<Post[]> {
  if (DEMO_MODE || !db) {
    return store.posts
      .filter((p) => p.subjectId === subjectId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  const q = query(collection(db, 'discussions'), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'id'>), id: d.id }));
  return data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createPost(data: Omit<Post, 'id' | 'createdAt' | 'commentCount'>): Promise<Post> {
  const post: Post = { ...data, id: uid(), createdAt: Date.now(), commentCount: 0 };
  if (DEMO_MODE || !db) {
    store.posts.unshift(post);
    notify();
    return post;
  }
  const ref = await addDoc(collection(db, 'discussions'), {
    ...data,
    createdAt: serverTimestamp(),
    commentCount: 0,
  });
  return { ...post, id: ref.id };
}

export async function deletePost(postId: string): Promise<void> {
  if (DEMO_MODE || !db) {
    store.posts = store.posts.filter((p) => p.id !== postId);
    store.comments = store.comments.filter((c) => c.postId !== postId);
    notify();
    return;
  }
  await deleteDoc(doc(db, 'discussions', postId));
}

export async function getComments(postId: string): Promise<Comment[]> {
  if (DEMO_MODE || !db) {
    return store.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }
  const q = query(
    collection(db, 'discussions', postId, 'comments'),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Comment, 'id'>), id: d.id }));
}

export async function createComment(data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
  const comment: Comment = { ...data, id: uid(), createdAt: Date.now() };
  if (DEMO_MODE || !db) {
    store.comments.push(comment);
    const post = store.posts.find((p) => p.id === data.postId);
    if (post) post.commentCount += 1;
    notify();
    return comment;
  }
  const ref = await addDoc(collection(db, 'discussions', data.postId, 'comments'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'discussions', data.postId), { commentCount: increment(1) });
  return { ...comment, id: ref.id };
}

// ---------- Helpers ----------
export { DEMO_MODE };

// Example of a live Firestore subscription — used once you enable Firebase.
// Replace a get* call with this pattern when you want real-time updates.
export function subscribeLeaderboard(cb: (users: AppUser[]) => void, limitCount = 10): Unsubscribe {
  if (DEMO_MODE || !db) {
    cb(store.users.filter((u) => u.role === 'siswa').sort((a, b) => b.points - a.points).slice(0, limitCount));
    return subscribe(() =>
      cb(store.users.filter((u) => u.role === 'siswa').sort((a, b) => b.points - a.points).slice(0, limitCount)),
    );
  }
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'siswa'),
    orderBy('points', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...(d.data() as Omit<AppUser, 'id'>), id: d.id })));
  });
}

// ---------- Content backup / restore (Mapel, Bab, Materi, Bank Soal) ----------
// Used so an admin can export all learning content from one school's
// Firebase project and re-import it into a brand new school's project,
// instead of recreating everything by hand. Deliberately scoped to CONTENT
// only — it never touches users, scores, kelas, or school settings, which
// are specific to each school.
export interface ContentBackup {
  version: 1;
  exportedAt: string;
  subjects: Subject[];
  chapters: Chapter[];
  materials: Material[];
  quizzes: Quiz[];
}

export async function exportContentBackup(): Promise<ContentBackup> {
  const [subjects, chapters, materials, quizzes] = await Promise.all([
    getSubjects(),
    getAllChapters(),
    getAllMaterials(),
    getAllQuizzes(),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), subjects, chapters, materials, quizzes };
}

/** Restores a content backup. Each item is written back with its ORIGINAL id,
 *  so importing the same backup twice just overwrites (safe to re-run), and
 *  materi/soal that reference each other (materialId, subjectId, etc.) stay
 *  linked correctly as long as the whole backup is restored together. */
export async function importContentBackup(data: ContentBackup): Promise<void> {
  if (DEMO_MODE || !db) {
    store.subjects = [...data.subjects];
    store.chapters = [...data.chapters];
    store.materials = [...data.materials];
    store.quizzes = [...data.quizzes];
    notify();
    return;
  }
  const ops: Promise<unknown>[] = [];
  for (const s of data.subjects) { const { id, ...rest } = s; ops.push(setDoc(doc(db, 'subjects', id), rest)); }
  for (const c of data.chapters) { const { id, ...rest } = c; ops.push(setDoc(doc(db, 'chapters', id), rest)); }
  for (const m of data.materials) { const { id, ...rest } = m; ops.push(setDoc(doc(db, 'materials', id), rest)); }
  for (const q of data.quizzes) { const { id, ...rest } = q; ops.push(setDoc(doc(db, 'quizzes', id), rest)); }
  await Promise.all(ops);
}
