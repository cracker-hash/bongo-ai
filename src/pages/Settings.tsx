import { useState, useEffect } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Bell, User, Trash2, Save, Volume2, Play, Shield, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import wiserLogo from '@/assets/bongo-ai-logo.png';
import { ELEVENLABS_VOICES, getVoiceSettings, saveVoiceSettings, speak, stopSpeaking } from '@/lib/textToSpeech';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Theme = 'dark' | 'light' | 'system';

export default function Settings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  
  const [theme, setTheme] = useState<Theme>('dark');
  const [notifications, setNotifications] = useState({ chatResponses: true, updates: false, newsletter: false });
  const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wiser_theme') as Theme | null;
    if (stored) setTheme(stored === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (user) { setDisplayName(user.name || ''); setEmail(user.email || ''); }
  }, [user]);

  useEffect(() => {
    const stored = localStorage.getItem('wiser_notifications');
    if (stored) try { setNotifications(JSON.parse(stored)); } catch {}
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('light', !prefersDark);
      localStorage.setItem('wiser_theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.toggle('light', newTheme === 'light');
      localStorage.setItem('wiser_theme', newTheme);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem('wiser_notifications', JSON.stringify(updated));
    toast({ description: 'Notification preferences saved' });
  };

  const handleVoiceChange = <K extends keyof typeof voiceSettings>(key: K, value: typeof voiceSettings[K]) => {
    const updated = { ...voiceSettings, [key]: value };
    setVoiceSettings(updated);
    saveVoiceSettings(updated);
  };

  const handleTestVoice = () => {
    if (isTestingVoice) {
      stopSpeaking();
      setIsTestingVoice(false);
      return;
    }

    const testText = "Hello! I am Wiser AI, your intelligent assistant created in Tanzania. Habari! I can speak clearly in both English and Swahili.";
    
    speak({
      text: testText,
      voice: voiceSettings.voiceId,
      rate: voiceSettings.speed,
      useElevenLabs: voiceSettings.useElevenLabs,
      onStart: () => setIsTestingVoice(true),
      onEnd: () => setIsTestingVoice(false),
      onError: (error) => {
        setIsTestingVoice(false);
        toast({ description: error.message || 'Voice test failed', variant: 'destructive' });
      }
    });
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) { toast({ description: 'Please sign in', variant: 'destructive' }); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
      if (error) throw error;
      toast({ description: 'Profile updated' });
    } catch { toast({ description: 'Failed to update profile', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === voiceSettings.voiceId);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-3">
            <img src={wiserLogo} alt="Wiser AI" className="h-8 w-8" />
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Theme */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5" />Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {(['light', 'dark', 'system'] as Theme[]).map(t => (
                <Button key={t} variant={theme === t ? 'default' : 'outline'} className="flex flex-col items-center gap-2 h-auto py-4" onClick={() => handleThemeChange(t)}>
                  {t === 'light' ? <Sun className="h-6 w-6" /> : t === 'dark' ? <Moon className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                  <span className="text-sm capitalize">{t}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Volume2 className="h-5 w-5" />Voice Settings</CardTitle>
            <CardDescription>Configure text-to-speech with ElevenLabs for natural voice output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Voice */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Voice Output</Label>
                <p className="text-sm text-muted-foreground">Enable AI voice responses</p>
              </div>
              <Switch checked={voiceSettings.enabled} onCheckedChange={(v) => handleVoiceChange('enabled', v)} />
            </div>
            
            <Separator />

            {/* Use ElevenLabs */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Use ElevenLabs</Label>
                <p className="text-sm text-muted-foreground">High-quality AI voices with Swahili support</p>
              </div>
              <Switch checked={voiceSettings.useElevenLabs} onCheckedChange={(v) => handleVoiceChange('useElevenLabs', v)} />
            </div>

            <Separator />

            {/* Voice Selection */}
            <div className="space-y-3">
              <Label>Voice</Label>
              <Select value={voiceSettings.voiceId} onValueChange={(v) => handleVoiceChange('voiceId', v)}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedVoice ? `${selectedVoice.name} - ${selectedVoice.description}` : 'Select a voice'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ELEVENLABS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speed Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Speech Speed</Label>
                <span className="text-sm text-muted-foreground">{voiceSettings.speed.toFixed(1)}x</span>
              </div>
              <Slider 
                value={[voiceSettings.speed]} 
                min={0.5} 
                max={2} 
                step={0.1} 
                onValueChange={([v]) => handleVoiceChange('speed', v)} 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>

            <Separator />

            {/* Test Voice */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleTestVoice}
              disabled={!voiceSettings.enabled}
            >
              <Play className="h-4 w-4 mr-2" />
              {isTestingVoice ? 'Stop Test' : 'Test Voice'}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries({ chatResponses: 'Chat Responses', updates: 'Product Updates', newsletter: 'Newsletter' }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch checked={notifications[key as keyof typeof notifications]} onCheckedChange={(v) => handleNotificationChange(key as any, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Account</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {isAuthenticated ? (
              <>
                <div className="space-y-2"><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={email} disabled className="bg-muted" /></div>
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gradient-bg"><Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save'}</Button>
                <Separator />
                <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-destructive">Delete Account</p><p className="text-sm text-muted-foreground">Permanently delete your account</p></div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Delete</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Account?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8"><User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground mb-4">Sign in to manage your account</p><Button onClick={() => navigate('/')} className="gradient-bg">Go to Sign In</Button></div>
            )}
          </CardContent>
        </Card>

        <Card><CardContent className="py-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><img src={wiserLogo} alt="Wiser AI" className="h-10 w-10" /><div><p className="font-medium">Wiser AI</p><p className="text-sm text-muted-foreground">Version 1.0.0</p></div></div><p className="text-xs text-muted-foreground">Made with ❤️ in Tanzania by Tito Oscar Mwaisengela</p></div></CardContent></Card>
      </main>
    </div>
  );
}
