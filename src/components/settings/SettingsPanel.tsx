import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Bell, User, Save, Volume2, Play, Camera, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import wiserLogo from '@/assets/wiser-ai-logo.png';
import { ELEVENLABS_VOICES, getVoiceSettings, saveVoiceSettings, speak, stopSpeaking } from '@/lib/textToSpeech';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Theme = 'dark' | 'light' | 'system';

interface SettingsPanelProps {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [theme, setTheme] = useState<Theme>('dark');
  const [notifications, setNotifications] = useState({ chatResponses: true, updates: false, newsletter: false });
  const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('wiser_theme') as Theme | null;
    if (stored) setTheme(stored === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (user) { 
      setDisplayName(user.name || ''); 
      setEmail(user.email || ''); 
      setAvatarUrl(user.avatar || null);
    }
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

    const testText = "Hello! I am Wiser AI, your intelligent assistant created in Tanzania.";
    
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ description: 'Profile photo updated!' });
    } catch (error: any) {
      toast({ description: error.message || 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) { toast({ description: 'Please sign in', variant: 'destructive' }); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName, name: displayName } });
      if (error) throw error;
      toast({ description: 'Profile updated' });
    } catch { toast({ description: 'Failed to update profile', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === voiceSettings.voiceId);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border/50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src={wiserLogo} alt="Wiser AI" className="h-6 w-6" />
          <h2 className="text-lg font-semibold text-sidebar-foreground">Settings</h2>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Profile Photo Section */}
          {isAuthenticated && (
            <Card className="bg-sidebar-accent/30 border-sidebar-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-sidebar-foreground">
                  <Camera className="h-4 w-4" />
                  Profile Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border-2 border-primary/20">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-sidebar-foreground/50" />
                      )}
                    </div>
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Theme */}
          <Card className="bg-sidebar-accent/30 border-sidebar-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-sidebar-foreground">
                <Sun className="h-4 w-4" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as Theme[]).map(t => (
                  <Button 
                    key={t} 
                    variant={theme === t ? 'default' : 'outline'} 
                    size="sm"
                    className="flex flex-col items-center gap-1 h-auto py-2" 
                    onClick={() => handleThemeChange(t)}
                  >
                    {t === 'light' ? <Sun className="h-4 w-4" /> : t === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    <span className="text-xs capitalize">{t}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card className="bg-sidebar-accent/30 border-sidebar-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-sidebar-foreground">
                <Volume2 className="h-4 w-4" />
                Voice Settings
              </CardTitle>
              <CardDescription className="text-xs">Text-to-speech with ElevenLabs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Voice Output</Label>
                <Switch checked={voiceSettings.enabled} onCheckedChange={(v) => handleVoiceChange('enabled', v)} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs">Use ElevenLabs</Label>
                <Switch checked={voiceSettings.useElevenLabs} onCheckedChange={(v) => handleVoiceChange('useElevenLabs', v)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Voice</Label>
                <Select value={voiceSettings.voiceId} onValueChange={(v) => handleVoiceChange('voiceId', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>
                      {selectedVoice?.name || 'Select'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ELEVENLABS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id} className="text-xs">
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Speed</Label>
                  <span className="text-xs text-muted-foreground">{voiceSettings.speed.toFixed(1)}x</span>
                </div>
                <Slider 
                  value={[voiceSettings.speed]} 
                  min={0.5} 
                  max={2} 
                  step={0.1} 
                  onValueChange={([v]) => handleVoiceChange('speed', v)} 
                />
              </div>

              <Button 
                variant="outline" 
                size="sm"
                className="w-full" 
                onClick={handleTestVoice}
                disabled={!voiceSettings.enabled}
              >
                <Play className="h-3 w-3 mr-2" />
                {isTestingVoice ? 'Stop' : 'Test Voice'}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-sidebar-accent/30 border-sidebar-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-sidebar-foreground">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries({ chatResponses: 'Chat Responses', updates: 'Product Updates', newsletter: 'Newsletter' }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-xs">{label}</Label>
                  <Switch checked={notifications[key as keyof typeof notifications]} onCheckedChange={(v) => handleNotificationChange(key as any, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Account */}
          {isAuthenticated && (
            <Card className="bg-sidebar-accent/30 border-sidebar-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-sidebar-foreground">
                  <User className="h-4 w-4" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Display Name</Label>
                  <Input 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Email</Label>
                  <Input value={email} disabled className="h-8 text-sm bg-muted" />
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" className="w-full gradient-bg">
                  <Save className="h-3 w-3 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* App Info */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={wiserLogo} alt="Wiser AI" className="h-6 w-6" />
              <span className="text-sm font-medium text-sidebar-foreground">Wiser AI</span>
            </div>
            <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">Made in Tanzania by Tito Oscar Mwaisengela</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}