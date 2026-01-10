import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, imageUrl, style, aspectRatio, numImages = 1 } = await req.json();
    const FREEPIK_API_KEY = Deno.env.get('FREEPIK_API_KEY');

    if (!FREEPIK_API_KEY) {
      throw new Error('FREEPIK_API_KEY is not configured');
    }

    const headers = {
      'x-freepik-api-key': FREEPIK_API_KEY,
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'generate-image': {
        // Freepik Mystic - AI Image Generation
        console.log('Generating image with Freepik Mystic:', prompt);
        
        const response = await fetch('https://api.freepik.com/v1/ai/mystic', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt,
            negative_prompt: 'blurry, low quality, distorted, ugly',
            num_images: numImages,
            image: {
              size: aspectRatio === '16:9' ? 'landscape_16_9' : aspectRatio === '9:16' ? 'portrait_9_16' : 'square_1_1',
            },
            styling: {
              style: style || 'photo',
              color: 'vibrant',
              framing: 'portrait',
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Mystic error:', errorText);
          throw new Error('Failed to generate image');
        }

        const data = await response.json();
        result = {
          type: 'image-generation',
          images: data.data?.map((img: any) => img.base64) || [],
          message: 'Images generated successfully!',
        };
        break;
      }

      case 'edit-image': {
        // Freepik Image Editor - Reimagine
        console.log('Editing image with Freepik:', prompt);
        
        const response = await fetch('https://api.freepik.com/v1/ai/reimagine', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageUrl,
            prompt,
            creativity: 0.5,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Reimagine error:', errorText);
          throw new Error('Failed to edit image');
        }

        const data = await response.json();
        result = {
          type: 'image-edit',
          images: data.data?.map((img: any) => img.base64) || [],
          message: 'Image edited successfully!',
        };
        break;
      }

      case 'generate-icon': {
        // Freepik Icon Generator
        console.log('Generating icon with Freepik:', prompt);
        
        const response = await fetch('https://api.freepik.com/v1/ai/icon-generator', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt,
            num_images: numImages,
            style: style || 'flat',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Icon error:', errorText);
          throw new Error('Failed to generate icon');
        }

        const data = await response.json();
        result = {
          type: 'icon-generation',
          images: data.data?.map((img: any) => img.base64) || [],
          message: 'Icons generated successfully!',
        };
        break;
      }

      case 'generate-video': {
        // Freepik Video Generator (Image to Video)
        console.log('Generating video with Freepik:', prompt);
        
        const response = await fetch('https://api.freepik.com/v1/ai/image-to-video', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageUrl,
            prompt: prompt || 'Animate this image with smooth motion',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Video error:', errorText);
          throw new Error('Failed to generate video');
        }

        const data = await response.json();
        
        // Video generation is async - poll for result
        const taskId = data.data?.task_id;
        if (taskId) {
          // Poll for completion
          let attempts = 0;
          while (attempts < 60) { // Max 5 minutes
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const statusResponse = await fetch(`https://api.freepik.com/v1/ai/image-to-video/${taskId}`, {
              method: 'GET',
              headers,
            });
            
            const statusData = await statusResponse.json();
            
            if (statusData.data?.status === 'completed') {
              result = {
                type: 'video-generation',
                videoUrl: statusData.data.video_url,
                message: 'Video generated successfully!',
              };
              break;
            } else if (statusData.data?.status === 'failed') {
              throw new Error('Video generation failed');
            }
            
            attempts++;
          }
          
          if (!result) {
            throw new Error('Video generation timed out');
          }
        }
        break;
      }

      case 'classify-image': {
        // Freepik Image Classifier
        console.log('Classifying image with Freepik');
        
        const response = await fetch('https://api.freepik.com/v1/ai/image-classifier', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageUrl,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Classifier error:', errorText);
          throw new Error('Failed to classify image');
        }

        const data = await response.json();
        result = {
          type: 'image-classification',
          classifications: data.data,
          message: 'Image classified successfully!',
        };
        break;
      }

      case 'search-stock': {
        // Freepik Stock Content Search
        console.log('Searching stock content with Freepik:', prompt);
        
        const response = await fetch(`https://api.freepik.com/v1/resources?locale=en-US&page=1&limit=20&term=${encodeURIComponent(prompt)}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Stock search error:', errorText);
          throw new Error('Failed to search stock content');
        }

        const data = await response.json();
        result = {
          type: 'stock-search',
          resources: data.data?.map((item: any) => ({
            id: item.id,
            title: item.title,
            thumbnail: item.preview?.url || item.image?.source?.url,
            type: item.type,
            downloadUrl: item.download_url,
          })) || [],
          message: 'Stock content found!',
        };
        break;
      }

      case 'upscale-image': {
        // Freepik Image Upscaler
        console.log('Upscaling image with Freepik');
        
        const response = await fetch('https://api.freepik.com/v1/ai/upscaler', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageUrl,
            scale: 2,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Upscaler error:', errorText);
          throw new Error('Failed to upscale image');
        }

        const data = await response.json();
        result = {
          type: 'image-upscale',
          image: data.data?.base64,
          message: 'Image upscaled successfully!',
        };
        break;
      }

      case 'remove-background': {
        // Freepik Background Remover
        console.log('Removing background with Freepik');
        
        const response = await fetch('https://api.freepik.com/v1/ai/background-remover', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageUrl,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik Background Remover error:', errorText);
          throw new Error('Failed to remove background');
        }

        const data = await response.json();
        result = {
          type: 'background-removal',
          image: data.data?.base64,
          message: 'Background removed successfully!',
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Freepik AI error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
