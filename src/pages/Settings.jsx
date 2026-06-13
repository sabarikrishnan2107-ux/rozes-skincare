import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell, Download, Moon, RotateCcw, Save, Sun, Trash2, Upload, User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { downloadJSON } from '@/utils/exporters';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    base44.settings.get()
      .then((s) => setAlertEmail(s?.alert_email || ''))
      .catch(() => {});
  }, []);

  const saveProfile = async () => {
    await updateProfile({ name, email });
    toast.success('Profile saved');
  };

  const saveAlertEmail = async () => {
    setSavingAlert(true);
    try {
      const s = await base44.settings.update({ alert_email: alertEmail.trim() });
      setAlertEmail(s?.alert_email || '');
      toast.success(
        alertEmail.trim() ? 'Alert email saved' : 'Alert email cleared',
        { description: alertEmail.trim()
            ? `Stock alerts will be sent to ${s.alert_email}`
            : 'Alerts will go to your profile email.' }
      );
    } catch (err) {
      toast.error('Could not save alert email', { description: err.message });
    } finally {
      setSavingAlert(false);
    }
  };

  const backup = async () => {
    try {
      const data = await base44.admin.exportAll();
      downloadJSON(data, `rozes-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success('Backup downloaded');
    } catch (err) {
      toast.error('Backup failed', { description: err.message });
    }
  };

  const restore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        await base44.admin.importAll(data);
        toast.success('Restore complete', { description: 'Reloading…' });
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        toast.error('Invalid backup file', { description: err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const doReset = async () => {
    try {
      await base44.utils.resetDemo();
      toast.success('Demo data restored');
      setConfirmReset(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error('Reset failed', { description: err.message });
    }
  };

  const doWipe = async () => {
    try {
      await base44.admin.wipe();
      toast.warning('All data cleared');
      setConfirmWipe(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error('Wipe failed', { description: err.message });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, theme, and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear in the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary text-2xl font-heading font-semibold text-primary-foreground shadow-sm">
              {(name || 'A').slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dn">Display name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="dn" className="pl-9" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveProfile} className="mt-5"><Save className="h-4 w-4" /> Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock alerts</CardTitle>
          <CardDescription>Where low-stock, out-of-stock, and mismatch emails are sent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 sm:max-w-md">
            <Label htmlFor="alertEmail">Alert email</Label>
            <div className="relative">
              <Bell className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="alertEmail"
                type="email"
                className="pl-9"
                placeholder="alerts@example.com"
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to use your profile email ({user?.email || '—'}).
            </p>
          </div>
          <Button onClick={saveAlertEmail} disabled={savingAlert} className="mt-5">
            <Save className="h-4 w-4" /> {savingAlert ? 'Saving…' : 'Save alert email'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Pick a theme that matches your light.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <ThemeOption label="Light" active={theme === 'light'} onClick={() => setTheme('light')}
              icon={Sun} preview="bg-gradient-to-br from-cream-50 to-pink-100"
              previewStyle={{ background: 'linear-gradient(135deg, #fdfaf6, #fbeae3)' }} />
            <ThemeOption label="Dark" active={theme === 'dark'} onClick={() => setTheme('dark')}
              icon={Moon}
              previewStyle={{ background: 'linear-gradient(135deg, #2a2222, #1a1414)' }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup & restore</CardTitle>
          <CardDescription>Export or import all products, sales, and settings.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={backup}><Download className="h-4 w-4" /> Download backup (JSON)</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={restore} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Restore from backup</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Irreversible actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <div>
              <div className="text-sm font-medium">Reset to demo data</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Replaces products and sales with the sample dataset.</div>
            </div>
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div>
              <div className="text-sm font-medium">Wipe all data</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Removes every product, sale, and notification. Cannot be undone.</div>
            </div>
            <Button variant="destructive" onClick={() => setConfirmWipe(true)}>
              <Trash2 className="h-4 w-4" /> Wipe
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset to demo data?</DialogTitle>
            <DialogDescription>Your current products and sales will be replaced with sample data.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button onClick={doReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmWipe} onOpenChange={setConfirmWipe}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Wipe everything?</DialogTitle>
            <DialogDescription>This permanently deletes all products, sales, and notifications.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmWipe(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doWipe}>Wipe all data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ThemeOption({ label, active, onClick, icon: Icon, previewStyle }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-3 text-left transition',
        active ? 'border-primary ring-4 ring-primary/10' : 'border-input hover:border-primary/60'
      )}
    >
      <div className="mb-3 h-20 rounded-lg" style={previewStyle} />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{label}</span>
        {active && <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-primary">Active</span>}
      </div>
    </button>
  );
}
