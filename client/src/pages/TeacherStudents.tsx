import { useEffect, useMemo, useState } from 'react';
import {
  getAllUsers,
  getAllScores,
  getSubjects,
  getBadges,
  resetStudentProgress,
  getKelasList,
  createUser,
  updateUser,
  deleteUser,
  getStudentsForGuru,
} from '@/services/dataStore';
import type { AppUser, Score, Subject, Badge as BadgeType, Kelas } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, TrendingUp, Trophy, RotateCcw, ChevronDown, ChevronUp, Plus, Pencil, Save, X, Trash2, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function TeacherStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<AppUser[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [filter, setFilter] = useState('');

  // tambah siswa
  const [newName, setNewName] = useState('');
  const [newNisn, setNewNisn] = useState('');
  const [newKelasId, setNewKelasId] = useState('');

  // edit siswa
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AppUser>>({});

  // Classes this teacher is allowed to manage students in. Admin sees all classes.
  const myKelas = useMemo(() => {
    if (user?.role === 'administrator') return kelasList;
    return kelasList.filter((k) => k.guruId === user?.id);
  }, [kelasList, user]);

  const refresh = async () => {
    let studs: AppUser[];
    if (user?.role === 'guru') {
      studs = await getStudentsForGuru(user.id);
    } else {
      const allUsers = await getAllUsers();
      studs = allUsers.filter((u) => u.role === 'siswa');
    }
    setStudents(studs);

    let allScrs = await getAllScores();
    if (user?.role === 'guru') {
      const studIds = new Set(studs.map(s => s.id));
      allScrs = allScrs.filter(s => studIds.has(s.userId));
    }
    setScores(allScrs);

    setSubjects(await getSubjects());
    setBadges(await getBadges());
    const kls = await getKelasList();
    setKelasList(kls);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!newKelasId && myKelas.length > 0) setNewKelasId(myKelas[0].id);
  }, [myKelas, newKelasId]);

  const handleAddStudent = async () => {
    if (!newName.trim() || !newNisn.trim() || !newKelasId) return;
    try {
      const kelas = kelasList.find((k) => k.id === newKelasId);
      await createUser({
        name: newName.trim(),
        nisn: newNisn.trim(),
        role: 'siswa',
        kelasId: newKelasId,
        kelas: kelas?.name,
        avatar: '🙂',
      });
      toast({ title: 'Siswa ditambahkan', description: newName });
      setNewName(''); setNewNisn('');
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal menambah siswa', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const patch: Partial<AppUser> = { ...editData };
      if (patch.kelasId) {
        patch.kelas = kelasList.find((k) => k.id === patch.kelasId)?.name;
      }
      await updateUser(id, patch);
      toast({ title: 'Data siswa diperbarui' });
      setEditingId(null); setEditData({});
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal memperbarui', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Hapus siswa "${name}"? Data progres belajarnya juga akan kehilangan referensi.`)) return;
    try {
      await deleteUser(id);
      toast({ title: 'Siswa dihapus' });
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' });
    }
  };

  const handleReset = async (studentId: string, name: string) => {
    const ok = window.confirm(`Apakah Anda yakin ingin me-reset progres belajar untuk "${name}"?\n\nTindakan ini akan menghapus semua nilai kuis, poin, dan lencana (badge) siswa tersebut secara permanen.`);
    if (!ok) return;

    try {
      await resetStudentProgress(studentId);
      toast({ title: 'Progres Direset', description: `Progres belajar untuk "${name}" telah dibersihkan.` });
      refresh();
    } catch (err: any) {
      toast({ title: 'Gagal Me-reset', description: err.message, variant: 'destructive' });
    }
  };

  const badgeMap = Object.fromEntries(badges.map((b) => [b.id, b]));
  const kelasMap = Object.fromEntries(kelasList.map((k) => [k.id, k]));

  const rows = useMemo(() => {
    return students
      .filter((s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || (s.nisn ?? '').includes(filter))
      .map((s) => {
        const sScores = scores.filter((x) => x.userId === s.id);
        const avg =
          sScores.length === 0
            ? 0
            : Math.round((sScores.reduce((a, x) => a + x.correct / x.total, 0) / sScores.length) * 100);
        const perSubject = subjects.map((sub) => {
          const sub_scores = sScores.filter((x) => x.subjectId === sub.id);
          const count = sub_scores.length;
          const avgSub =
            count === 0
              ? 0
              : Math.round((sub_scores.reduce((a, x) => a + x.correct / x.total, 0) / count) * 100);
          return { subject: sub, count, avg: avgSub, scores: sub_scores };
        });
        return { student: s, avg, quizCount: sScores.length, perSubject };
      })
      .sort((a, b) => b.student.points - a.student.points);
  }, [students, scores, subjects, filter]);

  const noKelasAvailable = user?.role === 'guru' && myKelas.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold">Manajemen Siswa</h1>
        <p className="text-muted-foreground mt-1">
          Kelola data siswa dan pantau kemajuan belajarnya di semua mata pelajaran.
        </p>
      </div>

      {noKelasAvailable ? (
        <Card className="border-2 rounded-3xl border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Anda belum ditugaskan sebagai pengampu kelas mana pun. Hubungi admin untuk menetapkan kelas Anda terlebih dahulu.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 rounded-3xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <Plus className="h-5 w-5 text-primary" /> Tambah Siswa Baru
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Nama Lengkap</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama siswa" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NISN</Label>
                <Input value={newNisn} onChange={(e) => setNewNisn(e.target.value)} placeholder="Nomor Induk Siswa Nasional" inputMode="numeric" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kelas</Label>
                <Select value={newKelasId} onValueChange={setNewKelasId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {myKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleAddStudent}
              disabled={!newName.trim() || !newNisn.trim() || !newKelasId}
              className="font-bold w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Siswa
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau NISN siswa..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
          data-testid="input-search-student"
        />
      </div>

      <div className="grid gap-3">
        {rows.map(({ student: s, avg, quizCount, perSubject }) => {
          const isEditing = editingId === s.id;
          return (
          <Card key={s.id} className="border-2 rounded-3xl" data-testid={`student-card-${s.id}`}>
            <CardContent className="p-5">
              {isEditing ? (
                <div className="space-y-2 mb-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={editData.name ?? s.name}
                      onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Nama Lengkap"
                    />
                    <Input
                      value={editData.nisn ?? s.nisn ?? ''}
                      onChange={(e) => setEditData((d) => ({ ...d, nisn: e.target.value }))}
                      placeholder="NISN"
                    />
                    <Select
                      value={editData.kelasId ?? s.kelasId ?? ''}
                      onValueChange={(v) => setEditData((d) => ({ ...d, kelasId: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                      <SelectContent>
                        {myKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(s.id)}><Save className="h-3.5 w-3.5 mr-1" /> Simpan</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData({}); }}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center">
                  {s.avatar.startsWith('data:') ? <img src={s.avatar} className="h-full w-full rounded-full object-cover shadow-sm" alt="" /> : <div className="text-4xl">{s.avatar}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> Kelas {kelasMap[s.kelasId ?? '']?.name ?? s.kelas ?? '-'} • NISN {s.nisn ?? '-'}
                  </div>
                </div>
                <StatPill icon={<Trophy className="h-4 w-4" />} value={s.points} label="Poin" />
                <StatPill icon={<TrendingUp className="h-4 w-4" />} value={`${avg}%`} label="Rata-rata" />
                <StatPill icon={<Users className="h-4 w-4" />} value={quizCount} label="Kuis" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(s.id); setEditData({}); }} title="Edit Siswa" data-testid={`btn-edit-${s.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(s.id, s.name)}
                    className="rounded-2xl border-warning/40 hover:bg-warning/10 flex items-center gap-1.5 shrink-0"
                    title="Reset Progres Belajar Siswa"
                    data-testid={`btn-reset-progress-${s.id}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteStudent(s.id, s.name)}
                    title="Hapus Siswa"
                    data-testid={`btn-delete-${s.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {perSubject.map((p) => (
                  <SubjectProgressCard key={p.subject.id} p={p} />
                ))}
              </div>
              {s.badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.badges.map((bid) => (
                    <span
                      key={bid}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold"
                    >
                      <span>{badgeMap[bid]?.emoji}</span>
                      {badgeMap[bid]?.name}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2">
      <div className="text-primary">{icon}</div>
      <div>
        <div className="font-extrabold leading-tight">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SubjectProgressCard({ p }: { p: { subject: Subject; count: number; avg: number; scores: Score[] } }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <div 
        className={`flex items-center justify-between text-sm font-bold ${p.count > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={() => p.count > 0 && setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-1.5">
          <span>{p.subject.emoji}</span> <span>{p.subject.name}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className={p.avg >= 80 ? 'text-secondary' : p.avg >= 60 ? 'text-warning-foreground' : 'text-muted-foreground'}>
            {p.count === 0 ? '—' : `${p.avg}%`}
          </span>
          {p.count > 0 && (
            isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${p.subject.color}`} style={{ width: `${p.avg}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{p.count} kuis dikerjakan</div>
      
      {p.count > 0 && isOpen && (
        <div className="mt-2 space-y-1 pt-1">
          {p.scores.map((score) => (
            <div key={score.id} className="text-[10px] bg-background border border-border rounded-lg px-2 py-1.5 flex justify-between items-center gap-2">
              <span className="truncate flex-1 font-medium text-foreground">{score.quizTitle || 'Kuis'}</span>
              <span className="font-extrabold text-primary shrink-0">{Math.round((score.correct / score.total) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
