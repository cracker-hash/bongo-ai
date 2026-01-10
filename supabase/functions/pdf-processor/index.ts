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
    const { action, fileBase64, fileName, fileType, formFields, outputFormat } = await req.json();
    const PDFCO_API_KEY = Deno.env.get('PDFCO_API_KEY');

    if (!PDFCO_API_KEY) {
      throw new Error('PDFCO_API_KEY is not configured');
    }

    const headers = {
      'x-api-key': PDFCO_API_KEY,
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'read-pdf': {
        // Extract text from PDF using PDF.co
        console.log('Reading PDF:', fileName);

        // First upload the file
        const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: fileName || 'document.pdf',
            file: fileBase64,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PDF');
        }

        const uploadData = await uploadResponse.json();
        const fileUrl = uploadData.url;

        // Convert PDF to text
        const convertResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: fileUrl,
            inline: true,
            pages: '', // All pages
            ocrEnabled: true, // Enable OCR for scanned docs
          }),
        });

        if (!convertResponse.ok) {
          throw new Error('Failed to extract text from PDF');
        }

        const convertData = await convertResponse.json();

        result = {
          type: 'pdf-read',
          text: convertData.body || '',
          pageCount: convertData.pageCount || 1,
          message: 'PDF text extracted successfully!',
        };
        break;
      }

      case 'fill-pdf': {
        // Fill PDF form fields
        console.log('Filling PDF form:', fileName);

        // Upload the file
        const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: fileName || 'form.pdf',
            file: fileBase64,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PDF');
        }

        const uploadData = await uploadResponse.json();
        const fileUrl = uploadData.url;

        // Get form fields first
        const fieldsResponse = await fetch('https://api.pdf.co/v1/pdf/info/fields', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: fileUrl,
          }),
        });

        const fieldsData = await fieldsResponse.json();
        console.log('Form fields found:', fieldsData.fields?.length || 0);

        // Fill the form
        const fillResponse = await fetch('https://api.pdf.co/v1/pdf/edit/add', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: fileUrl,
            annotations: Object.entries(formFields || {}).map(([name, value]) => ({
              fieldName: name,
              fieldValue: value,
            })),
          }),
        });

        if (!fillResponse.ok) {
          throw new Error('Failed to fill PDF form');
        }

        const fillData = await fillResponse.json();

        // Download the filled PDF
        if (fillData.url) {
          const downloadResponse = await fetch(fillData.url);
          const pdfBuffer = await downloadResponse.arrayBuffer();
          const base64Pdf = base64Encode(pdfBuffer);

          result = {
            type: 'pdf-filled',
            pdfBase64: base64Pdf,
            fields: fieldsData.fields || [],
            message: 'PDF form filled successfully!',
          };
        }
        break;
      }

      case 'get-form-fields': {
        // Get available form fields in a PDF
        console.log('Getting PDF form fields:', fileName);

        // Upload the file
        const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: fileName || 'form.pdf',
            file: fileBase64,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PDF');
        }

        const uploadData = await uploadResponse.json();

        // Get form fields
        const fieldsResponse = await fetch('https://api.pdf.co/v1/pdf/info/fields', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: uploadData.url,
          }),
        });

        if (!fieldsResponse.ok) {
          throw new Error('Failed to get form fields');
        }

        const fieldsData = await fieldsResponse.json();

        result = {
          type: 'pdf-fields',
          fields: fieldsData.fields || [],
          message: `Found ${fieldsData.fields?.length || 0} form fields`,
        };
        break;
      }

      case 'write-pdf': {
        // Create/write PDF from text or HTML
        console.log('Creating PDF');

        const response = await fetch('https://api.pdf.co/v1/pdf/convert/from/html', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            html: fileBase64, // Can be HTML content
            name: fileName || 'document.pdf',
            inline: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create PDF');
        }

        const data = await response.json();

        // Download the created PDF
        if (data.url) {
          const downloadResponse = await fetch(data.url);
          const pdfBuffer = await downloadResponse.arrayBuffer();
          const base64Pdf = base64Encode(pdfBuffer);

          result = {
            type: 'pdf-created',
            pdfBase64: base64Pdf,
            message: 'PDF created successfully!',
          };
        }
        break;
      }

      case 'merge-pdfs': {
        // Merge multiple PDFs
        console.log('Merging PDFs');

        // fileBase64 should be an array of base64 encoded PDFs
        const pdfUrls: string[] = [];
        
        for (const pdf of (fileBase64 as string[])) {
          const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: 'document.pdf',
              file: pdf,
            }),
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            pdfUrls.push(uploadData.url);
          }
        }

        const mergeResponse = await fetch('https://api.pdf.co/v1/pdf/merge2', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            urls: pdfUrls,
            name: fileName || 'merged.pdf',
          }),
        });

        if (!mergeResponse.ok) {
          throw new Error('Failed to merge PDFs');
        }

        const mergeData = await mergeResponse.json();

        if (mergeData.url) {
          const downloadResponse = await fetch(mergeData.url);
          const pdfBuffer = await downloadResponse.arrayBuffer();
          const base64Pdf = base64Encode(pdfBuffer);

          result = {
            type: 'pdf-merged',
            pdfBase64: base64Pdf,
            message: 'PDFs merged successfully!',
          };
        }
        break;
      }

      case 'pdf-to-image': {
        // Convert PDF pages to images
        console.log('Converting PDF to images');

        const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: fileName || 'document.pdf',
            file: fileBase64,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PDF');
        }

        const uploadData = await uploadResponse.json();

        const convertResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/png', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: uploadData.url,
            pages: '0-9', // First 10 pages
          }),
        });

        if (!convertResponse.ok) {
          throw new Error('Failed to convert PDF to images');
        }

        const convertData = await convertResponse.json();

        result = {
          type: 'pdf-to-images',
          images: convertData.urls || [],
          message: 'PDF converted to images successfully!',
        };
        break;
      }

      case 'extract-tables': {
        // Extract tables from PDF
        console.log('Extracting tables from PDF');

        const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: fileName || 'document.pdf',
            file: fileBase64,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PDF');
        }

        const uploadData = await uploadResponse.json();

        const extractResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/csv', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: uploadData.url,
            pages: '',
          }),
        });

        if (!extractResponse.ok) {
          throw new Error('Failed to extract tables');
        }

        const extractData = await extractResponse.json();

        result = {
          type: 'pdf-tables',
          csvUrl: extractData.url,
          message: 'Tables extracted successfully!',
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
    console.error('PDF Processor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
