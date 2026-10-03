import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { updateUser } from '@/services/dataStore';
import { Camera, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ProfileSettings({ children }: { children: React.ReactNode }) {
  const { user, changeOwnCredentials } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [editingCreds, setEditingCreds] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  if (!user) return <>{children}</>;

  const processImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIMENSION = 400;
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          canvas.width = width;
          canvas.height = height;
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

  const handleSaveCreds = async () => {
    if (!currentPassword.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Masukkan password saat ini untuk verifikasi.' });
      return;
    }
    if (!usernameDraft.trim() && !newPassword.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Isi username baru dan/atau password baru.' });
      return;
    }
    setSavingCreds(true);
    try {
      await changeOwnCredentials({
        newUsername: usernameDraft.trim() || undefined,
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim() || undefined,
      });
      toast({ title: 'Berhasil', description: 'Kredensial login diperbarui.' });
      setEditingCreds(false);
      setUsernameDraft(''); setCurrentPassword(''); setNewPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: err.message });
    } finally {
      setSavingCreds(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const webpDataUrl = await processImage(file);
      await updateUser(user.id, { avatar: webpDataUrl });
      toast({ title: 'Berhasil', description: 'Foto profil diperbarui' });
      setTimeout(() => window.location.reload(), 500); 
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal memproses gambar' });
    } finally {
      setUploading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Pengaturan Profil</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted border-4 border-primary/20 flex items-center justify-center">
              {user.avatar.startsWith('data:') ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl">{user.avatar}</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} disabled={uploading} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" size="sm" className="rounded-xl">
                <Camera className="mr-2 h-4 w-4" /> Ganti Foto (WebP)
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nama Lengkap</Label>
            <div className="font-bold">{user.name}</div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Peran</Label>
            <div className="font-bold capitalize">{user.role} {user.kelas ? `- Kelas ${user.kelas}` : ''}</div>
          </div>

          {(user.role === 'administrator' || user.role === 'guru') && (
            <div className="space-y-2 pt-3 border-t border-border">
              {!editingCreds ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl w-full"
                  onClick={() => { setEditingCreds(true); setUsernameDraft(user.username ?? ''); }}
                >
                  <KeyRound className="mr-2 h-4 w-4" /> {user.role === 'administrator' ? 'Ubah Username / Password Admin' : 'Ubah Password'}
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <KeyRound className="h-4 w-4 text-primary" /> {user.role === 'administrator' ? 'Ubah Username & Password' : 'Ubah Password'}
                  </div>
                  {user.role === 'administrator' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Username baru (kosongkan jika tidak diubah)</Label>
                    <Input value={usernameDraft} onChange={(e) => setUsernameDraft(e.target.value)} placeholder={user.username ?? 'admin'} />
                  </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Password baru (kosongkan jika tidak diubah)</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="pr-9"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password saat ini (wajib, untuk verifikasi)</Label>
                    <Input
                      type={showPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Password admin saat ini"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={savingCreds} onClick={handleSaveCreds}>
                      {savingCreds ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingCreds(false); setUsernameDraft(''); setCurrentPassword(''); setNewPassword(''); }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
