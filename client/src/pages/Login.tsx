import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MOCK_USERS, type SchoolSettings } from '@/lib/mockData';
import { getSchoolSettings } from '@/services/dataStore';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { signIn, signInWithNisn, loginAsDemo, demoMode } = useAuth();
  const [tab, setTab] = useState<'siswa' | 'staf'>('siswa');
  const [nisn, setNisn] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState<SchoolSettings>({ name: 'TKA Seru' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getSchoolSettings()
      .then(setSchool)
      .catch((err) => {
        console.error('Gagal mengambil pengaturan sekolah:', err);
      });
  }, []);

  const handleSiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithNisn(nisn);
    } catch (err: any) {
      setError(err?.message ?? 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  const handleStafSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(password);
    } catch (err: any) {
      setError(err?.message ?? 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  const demoStudents = MOCK_USERS.filter((u) => u.role === 'siswa').slice(0, 3);
  const demoTeacher = MOCK_USERS.find((u) => u.role === 'guru');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 items-center">
        {/* Left: brand */}
        <div className="text-center md:text-left space-y-5">
          <div className="inline-flex items-center gap-2 bg-gradient-sunrise text-white px-4 py-2 rounded-full text-sm font-bold shadow-playful">
            {school.logo ? (
              <img src={school.logo} alt="Logo Sekolah" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {school.name}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Selamat Datang{' '}
            <span className="inline-block text-primary" style={{
              backgroundImage: 'linear-gradient(135deg, hsl(28 95% 58%), hsl(350 78% 60%))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              paddingBottom: '0.15em',
            }}>TKA Seru</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto md:mx-0">
            Kuasai seluruh materi TKA hanya dalam satu platform! Pertajam kemampuanmu dengan simulasi kuis interaktif, koleksi achievement badges sebagai bukti progresmu, dan pantau posisi sainganmu di leaderboard. Persiapan ujian jadi lebih kompetitif dan terukur!
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto md:mx-0">
            <FeatureChip emoji="📚" label="Materi TKA" />
            <FeatureChip emoji="🎮" label="Kuis Seru" />
            <FeatureChip emoji="🏆" label="Leaderboard" />
          </div>
        </div>

        {/* Right: form */}
        <Card className="border-2 shadow-playful rounded-3xl">
          <CardContent className="p-6 md:p-8">
            <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setError(null); }}>
              <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                <TabsTrigger value="siswa" data-testid="tab-siswa">Siswa</TabsTrigger>
                <TabsTrigger value="staf" data-testid="tab-staf">Guru / Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="siswa">
                <form onSubmit={handleSiswaSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nisn">NISN</Label>
                    <Input
                      id="nisn"
                      data-testid="input-nisn"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      placeholder="Masukkan NISN kamu"
                      required
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground">Cukup masukkan NISN, tidak perlu kata sandi.</p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription data-testid="text-error">{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full h-11 text-base font-bold" disabled={busy} data-testid="button-submit-siswa">
                    {busy ? 'Sebentar...' : 'Masuk 🚀'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="staf">
                <form onSubmit={handleStafSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <p className="text-xs text-muted-foreground -mt-0.5 mb-1">
                      Cukup masukkan password Anda — tidak perlu nama atau username. (Admin default: <span className="font-mono font-semibold">admin123</span>)
                    </p>
                    <div className="relative">
                      <Input
                        id="password"
                        data-testid="input-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription data-testid="text-error">{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full h-11 text-base font-bold" disabled={busy} data-testid="button-submit-staf">
                    {busy ? 'Sebentar...' : 'Masuk 🚀'}
                  </Button>
                </form>
              </TabsContent>
              </Tabs>

              {demoMode && (
                <div className="mt-6 pt-5 border-t border-border">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center">
                    🎮 Coba tanpa daftar — pilih akun demo
                  </div>
                  <div className="grid gap-2">
                    {demoStudents.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => loginAsDemo(u.id)}
                        data-testid={`button-demo-${u.id}`}
                        className="flex items-center gap-3 rounded-xl border-2 border-border p-3 text-left hover-elevate active-elevate-2 transition-colors"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                          {u.avatar.startsWith('data:') ? <img src={u.avatar} className="h-full w-full rounded-full object-cover shadow-sm" alt="" /> : <span className="text-3xl">{u.avatar}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{u.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Siswa • Kelas {u.kelas} • ⭐ {u.points} poin
                          </div>
                        </div>
                      </button>
                    ))}
                    {demoTeacher && (
                      <button
                        type="button"
                        onClick={() => loginAsDemo(demoTeacher.id)}
                        data-testid={`button-demo-${demoTeacher.id}`}
                        className="flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 text-left hover-elevate active-elevate-2 transition-colors"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                          {demoTeacher.avatar.startsWith('data:') ? <img src={demoTeacher.avatar} className="h-full w-full rounded-full object-cover shadow-sm" alt="" /> : <span className="text-3xl">{demoTeacher.avatar}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{demoTeacher.name}</div>
                          <div className="text-xs text-muted-foreground">Guru — buka dasbor pengajar</div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureChip({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-card border-2 border-border p-3 shadow-sm">
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-bold text-foreground/80">{label}</span>
    </div>
  );
}
