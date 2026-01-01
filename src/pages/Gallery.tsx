// Image Gallery Page
import { useState } from 'react';
import { useImageGallery } from '@/hooks/useImageGallery';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2, Image as ImageIcon, X, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Gallery() {
  const { images, isLoading, deleteImage } = useImageGallery();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const selectedImageData = images.find(img => img.id === selectedImage);

  const handleDownload = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `wiser-ai-${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view your gallery</h2>
          <p className="text-muted-foreground mb-4">Your generated images will appear here</p>
          <Button onClick={() => navigate('/')}>Go to Chat</Button>
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Image Gallery</h1>
              <p className="text-muted-foreground">
                {images.length} generated image{images.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No images yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate images in chat using "Generate an image: [description]"
            </p>
            <Button onClick={() => navigate('/')}>Start Generating</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
              <Card 
                key={image.id} 
                className="group overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                onClick={() => setSelectedImage(image.id)}
              >
                <CardContent className="p-0 relative">
                  <img 
                    src={image.url} 
                    alt={image.prompt}
                    className="aspect-square object-cover w-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-sm line-clamp-2 mb-2">{image.prompt}</p>
                    <p className="text-white/70 text-xs">
                      {format(image.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Image Details</DialogTitle>
          </DialogHeader>
          {selectedImageData && (
            <div className="space-y-4">
              <img 
                src={selectedImageData.url} 
                alt={selectedImageData.prompt}
                className="w-full rounded-lg"
              />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Prompt:</strong> {selectedImageData.prompt}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generated {format(selectedImageData.createdAt, 'MMMM d, yyyy at h:mm a')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleDownload(selectedImageData.url, selectedImageData.prompt)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        deleteImage(selectedImageData.id);
                        setSelectedImage(null);
                      }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
