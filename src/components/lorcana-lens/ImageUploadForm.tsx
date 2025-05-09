
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadFormProps {
  onImageUpload: (imageDataUrl: string) => void;
  currentImage: string | null;
}

const ImageUploadForm: React.FC<ImageUploadFormProps> = ({ onImageUpload, currentImage }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false); // This state is local if cropper is part of this form
  const { toast } = useToast();

  useEffect(() => {
    // If a current image is passed (e.g. from parent state after crop), set it as preview
    if (currentImage) {
      setPreviewUrl(currentImage);
      setSelectedFile(null); // Clear file selection as we are using the currentImage
    }
  }, [currentImage]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (e.g., JPG, PNG, WEBP).",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        // Instead of directly calling onImageUpload, we might trigger a crop modal or just use this for preview
        // For now, let's assume direct use or crop is handled elsewhere / or we pass this to a cropper.
      };
      reader.readAsDataURL(file);
    }
  };

  // This would be called after cropping is done, or if no cropping, on submit
  const handleFinalImage = (imageDataUrl: string) => {
    onImageUpload(imageDataUrl);
    // Toast message is handled in page.tsx or similar parent after image processing
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (previewUrl) { // This previewUrl could be from initial upload or after a crop
      handleFinalImage(previewUrl);
    } else {
       toast({
        title: "No Image Selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      });
    }
  };
  
  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onImageUpload(''); // Notify parent that image is cleared
     toast({
        title: "Image Cleared",
        description: "You can now upload a new image.",
      });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><UploadCloud className="mr-2 h-6 w-6" /> Upload Your Card</CardTitle>
        <CardDescription>Select an image of your card (JPG, PNG, WEBP, max 10MB).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!previewUrl && (
            <div>
              <Label htmlFor="card-image-upload" className="mb-2 block text-sm font-medium">Card Image</Label>
              <Input
                id="card-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
          )}

          {previewUrl && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium mb-1">Preview:</p>
              <div className="relative group">
                <img 
                    data-ai-hint="card preview" 
                    src={previewUrl} 
                    alt="Uploaded card preview" 
                    className="max-w-full h-auto rounded-md border shadow-sm max-h-64 object-contain mx-auto" 
                />
                <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={handleClearImage} 
                    className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity"
                    aria-label="Clear image"
                    type="button"
                >
                    <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Submit button is only relevant if we are not auto-processing or have a crop step */}
          {/* If using a cropper, the cropper's "confirm" would call handleFinalImage */}
          {/* If no cropper, this button confirms the initial upload for comparison */}
          {previewUrl && !currentImage && ( // Show button if preview exists and it's not already the "currentImage" from parent
             <Button type="submit" className="w-full" disabled={!selectedFile && !previewUrl}>
                <CheckCircle className="mr-2 h-4 w-4" /> Load This Image
            </Button>
          )}
           {previewUrl && currentImage && previewUrl === currentImage && (
            <p className="text-sm text-green-600 flex items-center justify-center"><CheckCircle className="mr-2 h-4 w-4" /> Image loaded.</p>
           )}
        </form>
      </CardContent>
    </Card>
  );
};

export default ImageUploadForm;

    