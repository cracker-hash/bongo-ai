import { 
  User, 
  Settings, 
  CreditCard, 
  LogOut, 
  HelpCircle,
  Crown,
  Link as LinkIcon,
  Image as ImageIcon,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ProfileDropdown() {
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast({ description: 'Logged out successfully' });
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAuthModal(true)}
        className="gap-2"
      >
        <User className="h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
          <Avatar className="h-8 w-8 border border-border cursor-pointer hover:ring-2 ring-primary transition-all">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'W'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card border-border">
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 p-1">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
                {user.name?.charAt(0).toUpperCase() || 'W'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {/* Quick Actions */}
        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <User className="h-4 w-4" />
          <span>Profile Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => navigate('/library')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <Library className="h-4 w-4" />
          <span>My Library</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/gallery')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <ImageIcon className="h-4 w-4" />
          <span>Image Gallery</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Subscription */}
        <DropdownMenuItem 
          onClick={() => navigate('/pricing')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <Crown className="h-4 w-4 text-yellow-500" />
          <div className="flex-1">
            <span>Subscription</span>
            <span className="ml-2 text-xs text-muted-foreground">Free</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/dashboard')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <CreditCard className="h-4 w-4" />
          <span>Usage & Billing</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Connected Accounts */}
        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <LinkIcon className="h-4 w-4" />
          <span>Connected Accounts</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Help & Logout */}
        <DropdownMenuItem 
          onClick={() => navigate('/support')}
          className="gap-3 py-2.5 cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={handleLogout}
          className="gap-3 py-2.5 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
