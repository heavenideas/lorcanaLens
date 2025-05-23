
'use client';

import { useEffect, useState, useCallback } from 'react';
import ImageUploadForm from '@/components/lorcana-lens/ImageUploadForm';
import CardSearchControl from '@/components/lorcana-lens/CardSearchControl';
import AlignmentControls, { type AlignmentSettings } from '@/components/lorcana-lens/AlignmentControls';
import ImageComparisonView from '@/components/lorcana-lens/ImageComparisonView';
import { getAllLorcanaCards, type AllCards, type LorcanaCard } from '@/services/lorcana-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

const initialAlignment: AlignmentSettings = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
};

const LORCANA_CARD_ASPECT_RATIO = 1468 / 2048;

export default function LorcanaLensPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalCard, setOriginalCard] = useState<LorcanaCard | null>(null);
  const [alignment, setAlignment] = useState<AlignmentSettings>(initialAlignment);
  const [allCardsData, setAllCardsData] = useState<AllCards | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [errorLoadingCards, setErrorLoadingCards] = useState<string | null>(null);
  
  const [uploadedImageDimensions, setUploadedImageDimensions] = useState<{width: number, height: number} | null>(null);

  const { toast } = useToast();

  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    setErrorLoadingCards(null);
    try {
      const data = await getAllLorcanaCards();
      if (data.cards.length === 0) {
        setErrorLoadingCards("No card data found. The source might be temporarily unavailable.");
        toast({
          title: "Card Data Error",
          description: "Could not load card data. Please try again later.",
          variant: "destructive",
        });
      }
      setAllCardsData(data);
    } catch (error) {
      console.error('Failed to load card data:', error);
      setErrorLoadingCards('Failed to load card data. Please check your connection and try again.');
       toast({
          title: "Failed to Load Cards",
          description: "There was an error fetching the Lorcana card database. Please try refreshing.",
          variant: "destructive",
        });
    } finally {
      setIsLoadingCards(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleImageUpload = (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);

    const img = new window.Image();
    img.onload = () => {
      setUploadedImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageDataUrl;
    
    setAlignment(initialAlignment); 
    toast({
      title: "Image Loaded",
      description: "Your card image is ready for alignment.",
    });
  };


  const handleCardSelect = (card: LorcanaCard) => {
    setOriginalCard(card);
  };

  const handleAlignmentChange = (newAlignment: AlignmentSettings) => {
    setAlignment(newAlignment);
  };
  
  const handleResetAlignment = () => {
    setAlignment(initialAlignment);
  };


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 text-center">
         <div className="flex items-center justify-center mb-2">
          <Image data-ai-hint="logo app" src="https://picsum.photos/seed/lorcalenslogo/64/64" alt="Lorcana Lens Logo" width={64} height={64} className="rounded-lg mr-4" />
          <h1 className="text-4xl font-bold text-primary">Lorcana Lens</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Spot fakes by comparing your Lorcana cards with official images.
        </p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <ImageUploadForm onImageUpload={handleImageUpload} />
          
          {isLoadingCards && (
            <Card>
              <CardHeader><CardTitle>Loading Card Database...</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center h-48">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}
          {errorLoadingCards && !isLoadingCards && (
             <Card>
              <CardHeader><CardTitle className="text-destructive">Error Loading Cards</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-center">
                <p>{errorLoadingCards}</p>
                <Button onClick={fetchCards} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
              </CardContent>
            </Card>
          )}
          {!isLoadingCards && !errorLoadingCards && allCardsData && (
            <CardSearchControl allCardsData={allCardsData} onCardSelect={handleCardSelect} selectedOriginalCard={originalCard} />
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          {uploadedImage && originalCard && (
            <AlignmentControls 
              alignment={alignment} 
              onAlignmentChange={handleAlignmentChange} 
              onReset={handleResetAlignment}
              uploadedImageDimensions={uploadedImageDimensions}
              originalCardAspectRatio={LORCANA_CARD_ASPECT_RATIO}
            />
          )}
          <ImageComparisonView
            uploadedImage={uploadedImage}
            originalCardImage={originalCard?.images.full || null}
            alignment={alignment}
          />
        </div>
      </main>

      <footer className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Lorcana Lens. Not affiliated with Disney or Ravensburger.</p>
        <p>Card data sourced from the Similcana project.</p>
      </footer>
    </div>
  );
}
```
  </change>
  <change>
    <file>src/components/lorcana-lens/ImageCropperModal.tsx</file>
    <description>Delete