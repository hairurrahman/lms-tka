import { useEffect, useRef, useState } from 'react';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  setUserPassword,
  getKelasList,
  createKelas,
  updateKelas,
  deleteKelas,
  getSchoolSettings,
  updateSchoolSettings,
  exportContentBackup,
  importContentBackup,
  type ContentBackup,
} from '@/services/dataStore';
import { getSavedFirebaseConfig, setFirebaseConfigAndReload, clearFirebaseConfigAndReload, type FirebaseProjectConfig } from '@/lib/firebase';
import type { AppUser, Kelas, SchoolSettings } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Save, X, Users, Search, KeyRound, Eye, EyeOff, School as SchoolIcon, Layers, Database, Download, Upload, Flame, AlertTriangle } from 'lucide-react';

export function AdminUsersPage() {
  const { toast } = useToast();

  // ---------- Guru ----------
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [filter, setFilter] = useState('');
  const [newName, setNewName] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addShowPassword, setAddShowPassword] = useState(false);

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherData, setEditTeacherData] = useState<Partial<AppUser>>({});

  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ---------- Kelas ----------
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [newKelasName, setNewKelasName] = useState('');
  const [newKelasGuruId, setNewKelasGuruId] = useState('');
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);
  const [editKelasData, setEditKelasData] = useState<Partial<Kelas>>({});

  // ---------- Pengaturan Sekolah ----------
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({ name: '' });
  const [schoolNameDraft, setSchoolNameDraft] = useState('');
  const [schoolLogoDraft, setSchoolLogoDraft] = useState<string | undefined>(undefined);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);

  // ---------- Firebase (ganti project) ----------
  const currentFirebaseConfig = getSavedFirebaseConfig();
  const [firebaseConfigText, setFirebaseConfigText] = useState('');
  const [savingFirebase, setSavingFirebase] = useState(false);

  // ---------- Backup & Restore konten ----------
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = 400;
          if (width > height && width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
          else if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas ctx null'));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const webpDataUrl = await processImage(file);
      setSchoolLogoDraft(webpDataUrl);
      toast({ title: 'Berhasil', description: 'Logo siap disimpan' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal memproses logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const refresh = async () => {
    const allUsers = await getAllUsers();
    setTeachers(allUsers.filter((u) => u.role === 'guru'));
    setKelasList(await getKelasList());
    const settings = await getSchoolSettings();
    setSchoolSettings(settings);
    setSchoolNameDraft(settings.name);
    setSchoolLogoDraft(settings.logo);
  };

  useEffect(() => {
    refresh();
  }, []);

  // ---------- Guru handlers ----------
  const handleAddTeacher = async () => {
    if (!newName.trim() || addPassword.length < 6) return;
    try {
      await createUser({
        name: newName.trim(),
        role: 'guru',
        avatar: '👩‍🏫',
      }, addPassword.trim());
      toast({ title: 'Guru ditambahkan', description: newName });
      setNewName(''); setAddPassword('');
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal menambah guru', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveEditTeacher = async (id: string) => {
    try {
      await updateUser(id, editTeacherData);
      toast({ title: 'Data guru diperbarui' });
      setEditingTeacherId(null); setEditTeacherData({});
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal memperbarui guru', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`Hapus guru "${name}"? Kelas yang diampunya akan kehilangan pengampu.`)) return;
    try {
      await deleteUser(id);
      toast({ title: 'Guru dihapus' });
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal menghapus guru', description: e.message, variant: 'destructive' });
    }
  };

  const handleChangePassword = async (teacher: AppUser) => {
    if (newPassword.length < 6) {
      toast({ title: 'Password terlalu pendek', description: 'Minimal 6 karakter.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Password tidak cocok', description: 'Pastikan konfirmasi password sama.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      await setUserPassword(teacher.id, newPassword);
      toast({ title: 'Password Berhasil Diubah', description: `Password untuk "${teacher.name}" telah diperbarui.` });
      setChangingPasswordId(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast({ title: 'Gagal Mengubah Password', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  // ---------- Kelas handlers ----------
  const handleAddKelas = async () => {
    if (!newKelasName.trim()) return;
    try {
      await createKelas({ name: newKelasName.trim(), guruId: newKelasGuruId || undefined });
      toast({ title: 'Kelas ditambahkan' });
      setNewKelasName(''); setNewKelasGuruId('');
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal menambah kelas', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveEditKelas = async (id: string) => {
    try {
      await updateKelas(id, editKelasData);
      toast({ title: 'Kelas diperbarui' });
      setEditingKelasId(null); setEditKelasData({});
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal memperbarui kelas', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteKelas = async (id: string, name: string) => {
    if (!window.confirm(`Hapus kelas "${name}"? Siswa di kelas ini tidak akan bisa dikelola sampai dipindahkan ke kelas lain.`)) return;
    try {
      await deleteKelas(id);
      toast({ title: 'Kelas dihapus' });
      refresh();
    } catch (e: any) {
      toast({ title: 'Gagal menghapus kelas', description: e.message, variant: 'destructive' });
    }
  };

  // ---------- Pengaturan Sekolah handler ----------
  const handleSaveSchool = async () => {
    setSavingSchool(true);
    try {
      const updated = await updateSchoolSettings({ name: schoolNameDraft.trim(), logo: schoolLogoDraft });
      setSchoolSettings(updated);
      toast({ title: 'Pengaturan sekolah disimpan' });
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    } finally {
      setSavingSchool(false);
    }
  };

  // ---------- Firebase handlers ----------
  const parseFirebaseConfigText = (raw: string): FirebaseProjectConfig | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Accept either strict JSON or the JS snippet Firebase Console gives
    // (const firebaseConfig = { apiKey: "...", ... };) by extracting just
    // the {...} object body and quoting bare keys before JSON.parse.
    const braceStart = trimmed.indexOf('{');
    const braceEnd = trimmed.lastIndexOf('}');
    if (braceStart === -1 || braceEnd === -1) return null;
    let objText = trimmed.slice(braceStart, braceEnd + 1);
    // Quote bare keys, but ONLY when they directly follow "{" or "," (i.e.
    // they're really a key) — not anywhere inside a string value. Firebase's
    // appId looks like "1:308982245604:web:abc123", which also contains
    // "word:" patterns; a naive global replace would corrupt it.
    objText = objText.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
    objText = objText.replace(/,(\s*})/g, '$1'); // trailing comma before }
    try {
      const parsed = JSON.parse(objText);
      if (!parsed.apiKey || !parsed.projectId || !parsed.appId) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const handleSaveFirebaseConfig = () => {
    const parsed = parseFirebaseConfigText(firebaseConfigText);
    if (!parsed) {
      toast({ title: 'Config tidak valid', description: 'Tempel seluruh objek firebaseConfig dari Firebase Console (minimal ada apiKey, projectId, appId).', variant: 'destructive' });
      return;
    }
    if (!window.confirm(`Ganti ke project Firebase "${parsed.projectId}"? Halaman akan dimuat ulang dan Anda perlu login lagi (data lama di project sebelumnya TIDAK terhapus, hanya tidak lagi tersambung).`)) return;
    setSavingFirebase(true);
    setFirebaseConfigAndReload(parsed);
  };

  const handleDisconnectFirebase = () => {
    if (!window.confirm('Putuskan koneksi dari project Firebase ini dan kembali ke mode demo (data contoh)? Anda bisa sambungkan project lain kapan saja.')) return;
    clearFirebaseConfigAndReload();
  };

  // ---------- Backup & Restore handlers ----------
  const handleExportBackup = async () => {
    setExportingBackup(true);
    try {
      const backup = await exportContentBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-materi-soal-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup berhasil diunduh', description: `${backup.subjects.length} mapel, ${backup.materials.length} materi, ${backup.quizzes.length} kuis.` });
    } catch (e: any) {
      toast({ title: 'Gagal membuat backup', description: e.message, variant: 'destructive' });
    } finally {
      setExportingBackup(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Memulihkan backup akan MENIMPA Mapel, Bab, Materi, dan Bank Soal yang ID-nya sama dengan isi file ini. Lanjutkan?')) {
      e.target.value = '';
      return;
    }
    setImportingBackup(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ContentBackup;
      if (!data.subjects || !data.quizzes) throw new Error('Format file backup tidak dikenali.');
      await importContentBackup(data);
      toast({ title: 'Backup berhasil dipulihkan', description: `${data.subjects.length} mapel, ${data.materials?.length ?? 0} materi, ${data.quizzes.length} kuis.` });
    } catch (e: any) {
      toast({ title: 'Gagal memulihkan backup', description: e.message, variant: 'destructive' });
    } finally {
      setImportingBackup(false);
      e.target.value = '';
    }
  };

  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const filteredTeachers = teachers.filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" /> Manajemen Sistem
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola akun guru, daftar kelas, dan pengaturan sekolah.
        </p>
      </div>

      <Tabs defaultValue="guru">
        <TabsList className="grid w-full grid-cols-5 max-w-[700px]">
          <TabsTrigger value="guru">Guru</TabsTrigger>
          <TabsTrigger value="kelas">Kelas</TabsTrigger>
          <TabsTrigger value="sekolah">Sekolah</TabsTrigger>
          <TabsTrigger value="firebase">Firebase</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        {/* ================= TAB GURU ================= */}
        <TabsContent value="guru" className="space-y-6 mt-6">
          <Card className="border-2 rounded-3xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold">
                <Plus className="h-5 w-5 text-primary" /> Tambah Guru Baru
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Lengkap</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama guru" />
                  <p className="text-[11px] text-muted-foreground">Untuk tampilan saja (daftar guru, pilihan pengampu kelas, dsb).</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Password</Label>
                  <div className="relative">
                    <Input
                      type={addShowPassword ? 'text' : 'password'}
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setAddShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {addShowPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Minimal 6 karakter. Ini yang dipakai guru untuk login (cukup password, tanpa nama) — wajib beda dari password staf lain.</p>
                </div>
              </div>
              <Button
                onClick={handleAddTeacher}
                disabled={!newName.trim() || addPassword.length < 6}
                className="font-bold w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah Guru
              </Button>
            </CardContent>
          </Card>

          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama guru..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeachers.map((u) => {
              const isEditing = editingTeacherId === u.id;
              const ownedKelas = kelasList.filter((k) => k.guruId === u.id);
              return (
                <Card key={u.id} className="border-2 rounded-3xl relative overflow-hidden hover-elevate transition-all">
                  <div className="absolute top-0 w-full h-2 bg-warning" />
                  <CardContent className="p-5 pt-6 space-y-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editTeacherData.name ?? u.name}
                          onChange={(e) => setEditTeacherData((d) => ({ ...d, name: e.target.value }))}
                          placeholder="Nama Lengkap"
                        />
                        <p className="text-[11px] text-muted-foreground">Nama hanya untuk tampilan, tidak memengaruhi login.</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEditTeacher(u.id)} className="flex-1"><Save className="h-3.5 w-3.5 mr-1" /> Simpan</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingTeacherId(null); setEditTeacherData({}); }}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-2xl">
                          {u.avatar.startsWith('data:') ? <img src={u.avatar} className="h-full w-full rounded-xl object-cover shadow-sm" alt="" /> : u.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate" title={u.name}>{u.name}</div>
                          {ownedKelas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ownedKelas.map(k => (
                                <span key={k.id} className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">Kelas {k.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex gap-2 pt-2 border-t mt-2 border-border/50">
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setEditingTeacherId(u.id); setEditTeacherData({}); setChangingPasswordId(null); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                          onClick={() => {
                            if (changingPasswordId === u.id) {
                              setChangingPasswordId(null); setNewPassword(''); setConfirmPassword('');
                            } else {
                              setChangingPasswordId(u.id); setEditingTeacherId(null); setNewPassword(''); setConfirmPassword('');
                            }
                          }}
                        >
                          <KeyRound className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTeacher(u.id, u.name)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {!isEditing && changingPasswordId === u.id && (
                      <div className="mt-2 p-3 rounded-2xl bg-muted/50 border border-border space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <KeyRound className="h-3.5 w-3.5 text-primary" /> Ubah Password
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Password Baru (min. 6 karakter)</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Password baru..."
                              className="pr-9 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(v => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Konfirmasi Password</Label>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru..."
                            className="text-sm"
                          />
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-[11px] text-destructive font-semibold">⚠ Password tidak cocok</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 text-xs"
                            disabled={savingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                            onClick={() => handleChangePassword(u)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {savingPassword ? 'Menyimpan...' : 'Simpan Password'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => { setChangingPasswordId(null); setNewPassword(''); setConfirmPassword(''); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ================= TAB KELAS ================= */}
        <TabsContent value="kelas" className="space-y-6 mt-6">
          <Card className="border-2 rounded-3xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold">
                <Layers className="h-5 w-5 text-primary" /> Tambah Kelas Baru
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Kelas</Label>
                  <Input value={newKelasName} onChange={(e) => setNewKelasName(e.target.value)} placeholder="Contoh: 6A" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Guru Pengampu</Label>
                  <Select value={newKelasGuruId || undefined} onValueChange={setNewKelasGuruId}>
                    <SelectTrigger><SelectValue placeholder="Pilih guru (opsional)" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddKelas} disabled={!newKelasName.trim()} className="font-bold">
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kelasList.map((k) => {
              const isEditing = editingKelasId === k.id;
              return (
                <Card key={k.id} className="border-2 rounded-3xl relative overflow-hidden">
                  <CardContent className="p-5 pt-6 space-y-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editKelasData.name ?? k.name}
                          onChange={(e) => setEditKelasData((d) => ({ ...d, name: e.target.value }))}
                          placeholder="Nama Kelas"
                        />
                        <Select
                          value={editKelasData.guruId ?? k.guruId ?? ''}
                          onValueChange={(v) => setEditKelasData((d) => ({ ...d, guruId: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                          <SelectContent>
                            {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEditKelas(k.id)} className="flex-1"><Save className="h-3.5 w-3.5 mr-1" /> Simpan</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingKelasId(null); setEditKelasData({}); }}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Layers className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">Kelas {k.name}</div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {k.guruId ? `Pengampu: ${teacherMap[k.guruId]?.name ?? 'Guru tidak diketahui'}` : 'Belum ada pengampu'}
                          </div>
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex gap-2 pt-2 border-t mt-2 border-border/50">
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setEditingKelasId(k.id); setEditKelasData({}); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteKelas(k.id, k.name)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ================= TAB SEKOLAH ================= */}
        <TabsContent value="sekolah" className="space-y-6 mt-6">
          <Card className="border-2 rounded-3xl">
            <CardContent className="p-5 space-y-4 max-w-lg">
              <div className="flex items-center gap-2 font-bold">
                <SchoolIcon className="h-5 w-5 text-primary" /> Pengaturan Sekolah
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Sekolah</Label>
                <Input value={schoolNameDraft} onChange={(e) => setSchoolNameDraft(e.target.value)} placeholder="Contoh: SDN 1 Pasean" />
                <p className="text-[11px] text-muted-foreground">Nama ini akan tampil di halaman login dan navbar.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Logo Sekolah</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={handleSchoolLogoUpload} disabled={uploadingLogo} className="text-xs" />
                  {schoolLogoDraft && (
                    <div className="h-12 w-12 bg-muted rounded-xl shrink-0 overflow-hidden border border-border">
                      <img src={schoolLogoDraft} className="h-full w-full object-cover" alt="Logo" />
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleSaveSchool} disabled={savingSchool || uploadingLogo || !schoolNameDraft.trim()} className="font-bold">
                <Save className="h-4 w-4 mr-1" /> {savingSchool ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB FIREBASE ================= */}
        <TabsContent value="firebase" className="space-y-6 mt-6">
          <Card className="border-2 rounded-3xl">
            <CardContent className="p-5 space-y-4 max-w-xl">
              <div className="flex items-center gap-2 font-bold">
                <Flame className="h-5 w-5 text-primary" /> Project Firebase
              </div>
              <p className="text-sm text-muted-foreground">
                Aplikasi ini bisa dipakai banyak sekolah dari 1 build yang sama — tiap sekolah tinggal
                menyambungkan project Firebase miliknya sendiri di sini. Mengganti project berarti
                aplikasi pindah ke database yang sama sekali berbeda (akun & data sekolah saat ini
                tidak ikut pindah — gunakan tab Backup untuk memindahkan Mapel/Materi/Soal).
              </p>

              {currentFirebaseConfig && (
                <div className="rounded-2xl bg-muted/50 border border-border p-3 text-sm">
                  <div className="font-bold">Tersambung ke:</div>
                  <div className="font-mono text-xs mt-1">{currentFirebaseConfig.projectId}</div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Tempel config Firebase (dari Firebase Console → Project Settings)</Label>
                <Textarea
                  value={firebaseConfigText}
                  onChange={(e) => setFirebaseConfigText(e.target.value)}
                  placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};'}
                  className="font-mono text-xs min-h-[160px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tempel apa adanya (boleh bentuk kode seperti di atas atau JSON) — cukup ada apiKey, projectId, dan appId.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveFirebaseConfig} disabled={savingFirebase || !firebaseConfigText.trim()} className="font-bold">
                  <Flame className="h-4 w-4 mr-1" /> Sambungkan Project Ini
                </Button>
                {currentFirebaseConfig && (
                  <Button variant="outline" onClick={handleDisconnectFirebase} className="text-destructive hover:bg-destructive/10">
                    Putuskan & Kembali ke Mode Demo
                  </Button>
                )}
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/10 border border-warning/30 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0 mt-0.5" />
                <span>
                  Pastikan Firestore Database sudah dibuat (mode Production) di project itu, dan
                  rules-nya sudah di-deploy. Tidak perlu mengaktifkan apa pun di menu Authentication —
                  aplikasi ini tidak memakainya sama sekali.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB BACKUP & RESTORE ================= */}
        <TabsContent value="backup" className="space-y-6 mt-6">
          <Card className="border-2 rounded-3xl">
            <CardContent className="p-5 space-y-4 max-w-xl">
              <div className="flex items-center gap-2 font-bold">
                <Database className="h-5 w-5 text-primary" /> Backup & Restore Materi dan Soal
              </div>
              <p className="text-sm text-muted-foreground">
                Mencakup Mapel, Bab, Materi, dan Bank Soal saja — tidak termasuk akun guru/siswa,
                nilai, kelas, maupun pengaturan sekolah (itu khusus tiap sekolah).
              </p>

              <div className="space-y-2">
                <div className="font-bold text-sm">Backup (Ekspor)</div>
                <Button onClick={handleExportBackup} disabled={exportingBackup} variant="outline" className="font-bold">
                  <Download className="h-4 w-4 mr-1" /> {exportingBackup ? 'Menyiapkan...' : 'Unduh Backup (.json)'}
                </Button>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="font-bold text-sm">Restore (Impor)</div>
                <input
                  ref={restoreFileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleRestoreFile}
                  disabled={importingBackup}
                  className="hidden"
                />
                <Button onClick={() => restoreFileInputRef.current?.click()} disabled={importingBackup} className="font-bold">
                  <Upload className="h-4 w-4 mr-1" /> {importingBackup ? 'Memulihkan...' : 'Pilih File Backup...'}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Pakai ini di sekolah/project Firebase baru untuk langsung mengisi Mapel, Materi, dan
                  Bank Soal dari backup sekolah lain, tanpa input ulang dari nol.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
