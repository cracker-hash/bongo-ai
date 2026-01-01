// Image Gallery Hook - Supabase Integration
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  chatId: string | null;
  createdAt: Date;
}

export function useImageGallery() {
  const { user, isAuthenticated } = useAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's generated images
  const loadImages = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setImages((data || []).map(img => ({
        id: img.id,
        url: img.url,
        prompt: img.prompt,
        chatId: img.chat_id,
        createdAt: new Date(img.created_at),
      })));
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Save a generated image
  const saveImage = useCallback(async (url: string, prompt: string, chatId?: string): Promise<string | null> => {
    if (!isAuthenticated || !user) return null;

    try {
      const { data, error } = await supabase
        .from('generated_images')
        .insert({
          user_id: user.id,
          url,
          prompt,
          chat_id: chatId || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Add to local state
      const newImage: GeneratedImage = {
        id: data.id,
        url,
        prompt,
        chatId: chatId || null,
        createdAt: new Date(),
      };
      setImages(prev => [newImage, ...prev]);
      
      toast.success('Image saved to gallery');
      return data.id;
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save image');
      return null;
    }
  }, [isAuthenticated, user]);

  // Delete an image
  const deleteImage = useCallback(async (imageId: string) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      loadImages();
    } else {
      setImages([]);
    }
  }, [isAuthenticated, loadImages]);

  return {
    images,
    isLoading,
    loadImages,
    saveImage,
    deleteImage,
  };
}
