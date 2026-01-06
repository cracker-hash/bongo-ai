import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Image as ImageIcon, 
  Folder, 
  Search, 
  ArrowLeft,
  Upload,
  Grid,
  List,
  Filter,
  Clock,
  Star,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface LibraryItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'project' | 'template';
  createdAt: Date;
  size?: string;
  starred?: boolean;
  thumbnail?: string;
}

// Mock data - will be replaced with real data from Supabase
const mockItems: LibraryItem[] = [
  { id: '1', name: 'Marketing Presentation.pptx', type: 'document', createdAt: new Date(), size: '2.4 MB' },
  { id: '2', name: 'Website Mockup', type: 'image', createdAt: new Date(), size: '1.2 MB', thumbnail: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200' },
  { id: '3', name: 'E-commerce App', type: 'project', createdAt: new Date(), starred: true },
  { id: '4', name: 'Landing Page Template', type: 'template', createdAt: new Date() },
];

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-5 w-5 text-blue-500" />,
  image: <ImageIcon className="h-5 w-5 text-green-500" />,
  project: <Folder className="h-5 w-5 text-primary" />,
  template: <Grid className="h-5 w-5 text-purple-500" />,
};

export default function Library() {
  const { isAuthenticated, setShowAuthModal } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');

  const filteredItems = mockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    return matchesSearch && matchesTab;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Folder className="h-20 w-20 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Your Library</h2>
          <p className="text-muted-foreground mb-6">
            Sign in to access your saved documents, images, projects and templates.
          </p>
          <Button onClick={() => setShowAuthModal(true)} className="gradient-bg">
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Library</h1>
              <p className="text-muted-foreground">
                Manage your files, projects, and templates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Files</TabsTrigger>
            <TabsTrigger value="document">Documents</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="project">Projects</TabsTrigger>
            <TabsTrigger value="template">Templates</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Upload files or create projects to get started'}
            </p>
            <Button onClick={() => navigate('/chat')}>
              Go to Chat
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="group cursor-pointer hover:ring-2 ring-primary transition-all overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted flex items-center justify-center relative">
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="scale-150">
                        {typeIcons[item.type]}
                      </div>
                    )}
                    {item.starred && (
                      <Star className="absolute top-2 right-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary">Open</Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {format(item.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="group cursor-pointer hover:ring-2 ring-primary transition-all"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    {typeIcons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="capitalize">{item.type}</span>
                      {item.size && <span>• {item.size}</span>}
                      <span>• {format(item.createdAt, 'MMM d, yyyy')}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.starred && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
