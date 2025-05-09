
'use client';

import { useEffect, useState, useCallback } from 'react';
import ImageUploadForm from '@/components/lorcana-lens/ImageUploadForm';
import CardSearchControl from '@/components/lorcana-lens/CardSearchControl';
import AlignmentControls, { type AlignmentSettings } from '@/components/lorcana-lens/AlignmentControls';
import ImageComparisonView, { type ImageSelection } from '@/components/lorcana-lens/ImageComparisonView';
import { getAllLorcanaCards, type AllCards, type LorcanaCard } from '@/services/lorcana-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Edit3, ZoomInIcon, Focus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
// Removed 'Image' from 'next/image' as it's no longer used for the logo here.
// If other images still use it, it should be kept. For now, assuming only logo was 'next/image'.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LorcanaLensLogo from '@/components/lorcana-lens/LorcanaLensLogo';


const initialAlignment: AlignmentSettings = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
};

const LORCANA_CARD_ASPECT_RATIO = 1468 / 2048; // width / height
const COMPARISON_VIEW_MAX_WIDTH = 448; // from max-w-md (28rem * 16px/rem)
const COMPARISON_VIEW_ASPECT_RATIO = 7 / 10; // from aspect-[7/10]
const COMPARISON_VIEW_HEIGHT = COMPARISON_VIEW_MAX_WIDTH / COMPARISON_VIEW_ASPECT_RATIO;


export type ComparisonMode = 'full' | 'detail';
export type SelectionTarget = 'uploaded' | 'original' | null;

const calculateDisplayedDimensions = (naturalW: number, naturalH: number, containerW: number, containerH: number) => {
  const imgAspect = naturalW / naturalH;
  const containerAspect = containerW / containerH;
  let dispW, dispH;
  if (imgAspect > containerAspect) { // Image is wider than container
    dispW = containerW;
    dispH = containerW / imgAspect;
  } else { // Image is taller or same aspect
    dispH = containerH;
    dispW = containerH * imgAspect;
  }
  return { dispW, dispH };
};


export default function LorcanaLensPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalCard, setOriginalCard] = useState<LorcanaCard | null>(null);
  const [alignment, setAlignment] = useState<AlignmentSettings>(initialAlignment);
  const [allCardsData, setAllCardsData] = useState<AllCards | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [errorLoadingCards, setErrorLoadingCards] = useState<string | null>(null);
  
  const [uploadedImageDimensions, setUploadedImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [originalImageNaturalDimensions, setOriginalImageNaturalDimensions] = useState<{width: number, height: number} | null>(null);

  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('full');
  const [currentSelectionTarget, setCurrentSelectionTarget] = useState<SelectionTarget>(null);
  const [uploadedImageSelection, setUploadedImageSelection] = useState<ImageSelection | null>(null);
  const [originalImageSelection, setOriginalImageSelection] = useState<ImageSelection | null>(null);


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
    setUploadedImageSelection(null); // Reset selection on new image
    toast({
      title: "Image Loaded",
      description: "Your card image is ready for alignment.",
    });
  };

  const handleCardSelect = (card: LorcanaCard) => {
    setOriginalCard(card);
    setOriginalImageSelection(null); // Reset selection on new card
    if (card?.images.full) {
      const img = new window.Image();
      img.onload = () => {
        setOriginalImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = card.images.full;
    } else {
      setOriginalImageNaturalDimensions(null);
    }
  };

  const handleAlignmentChange = (newAlignment: AlignmentSettings) => {
    setAlignment(newAlignment);
  };
  
  const handleResetAlignment = () => {
    setAlignment(initialAlignment);
  };

  const handleSelectionComplete = (target: 'uploaded' | 'original', selection: ImageSelection) => {
    if (target === 'uploaded') {
      setUploadedImageSelection(selection);
    } else {
      setOriginalImageSelection(selection);
    }
    setCurrentSelectionTarget(null); // End selection mode
    toast({
      title: "Area Selected",
      description: `Selected area on ${target === 'uploaded' ? 'your image' : 'the original card'}.`,
    });
  };

  const handleAlignSelectionCenters = () => {
    if (!uploadedImageSelection || !originalImageSelection || !uploadedImageDimensions || !originalImageNaturalDimensions) {
      toast({
        title: "Alignment Error",
        description: "Please select areas on both images and ensure images are loaded.",
        variant: "destructive",
      });
      return;
    }

    const N_ow = originalImageNaturalDimensions.width;
    const N_oh = originalImageNaturalDimensions.height;
    const N_uw = uploadedImageDimensions.width;
    const N_uh = uploadedImageDimensions.height;

    // Dimensions of images as displayed by NextImage within the comparison view container due to object-fit:contain
    const { dispW: Disp_N_ow, dispH: Disp_N_oh } = calculateDisplayedDimensions(N_ow, N_oh, COMPARISON_VIEW_MAX_WIDTH, COMPARISON_VIEW_HEIGHT);

    const origSelX_norm = originalImageSelection.x + originalImageSelection.width / 2;
    const origSelY_norm = originalImageSelection.y + originalImageSelection.height / 2;
    // Vector from original image's center to its selection's center, in view pixels
    const delta_ox_view = (origSelX_norm - 0.5) * Disp_N_ow;
    const delta_oy_view = (origSelY_norm - 0.5) * Disp_N_oh;
    
    // For uploaded image, NextImage base props are original's natural dimensions.
    // This means NextImage internally scales uploaded image to fit within N_ow x N_oh box.
    const s_upld_internal_fit_to_orig_dims = Math.min(N_ow / N_uw, N_oh / N_uh);
    const I_uw_eff = N_uw * s_upld_internal_fit_to_orig_dims; // Effective "natural" width for NextImage's layout
    const I_uh_eff = N_uh * s_upld_internal_fit_to_orig_dims; // Effective "natural" height

    // Then this I_uw_eff x I_uh_eff box is scaled by NextImage (layout="fill") to fit COMPARISON_VIEW_MAX_WIDTH x COMPARISON_VIEW_HEIGHT
    const { dispW: Disp_I_uw, dispH: Disp_I_uh } = calculateDisplayedDimensions(I_uw_eff, I_uh_eff, COMPARISON_VIEW_MAX_WIDTH, COMPARISON_VIEW_HEIGHT);
    // Disp_I_uw and Disp_I_uh are the displayed sizes if alignment.scaleX/Y = 1

    const upldSelX_norm = uploadedImageSelection.x + uploadedImageSelection.width / 2;
    const upldSelY_norm = uploadedImageSelection.y + uploadedImageSelection.height / 2;

    const R_rad = alignment.rotate * Math.PI / 180;
    const cosR = Math.cos(R_rad);
    const sinR = Math.sin(R_rad);

    // Vector from uploaded image's center to its selection's center,
    // in view pixels, after alignment.scaleX/Y and alignment.rotate
    const v_dx_unrotated = (upldSelX_norm - 0.5) * Disp_I_uw * alignment.scaleX;
    const v_dy_unrotated = (upldSelY_norm - 0.5) * Disp_I_uh * alignment.scaleY;

    const V_x = v_dx_unrotated * cosR - v_dy_unrotated * sinR;
    const V_y = v_dx_unrotated * sinR + v_dy_unrotated * cosR;

    const newOffsetX = delta_ox_view - V_x;
    const newOffsetY = delta_oy_view - V_y;

    setAlignment(prev => ({
      ...prev,
      offsetX: parseFloat(newOffsetX.toFixed(2)), // Keep precision reasonable
      offsetY: parseFloat(newOffsetY.toFixed(2)),
    }));

    toast({
      title: "Centers Aligned",
      description: "The selection centers have been mathematically aligned. Adjust further if needed.",
    });
  };


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 text-center">
         <div className="flex items-center justify-center mb-2">
          <LorcanaLensLogo className="w-16 h-16 rounded-lg mr-4" />
          <h1 className="text-4xl font-bold text-primary">Lorcana Lens</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Spot fakes by comparing your Lorcana cards with official images.
        </p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <ImageUploadForm onImageUpload={handleImageUpload} currentImage={uploadedImage} />
          
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

          {uploadedImage && originalCard && (
             <AlignmentControls 
              alignment={alignment} 
              onAlignmentChange={handleAlignmentChange} 
              onReset={handleResetAlignment}
              uploadedImageDimensions={uploadedImageDimensions}
              originalCardAspectRatio={LORCANA_CARD_ASPECT_RATIO}
              uploadedImageSrc={uploadedImage}
              originalCardImageSrc={originalCard?.images.full || null}
            />
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <Tabs value={comparisonMode} onValueChange={(value) => setComparisonMode(value as ComparisonMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full">Full Comparison</TabsTrigger>
              <TabsTrigger value="detail">Detail Comparison</TabsTrigger>
            </TabsList>
            <TabsContent value="full">
              <ImageComparisonView
                uploadedImage={uploadedImage}
                originalCardImage={originalCard?.images.full || null}
                alignment={alignment}
                comparisonMode="full"
                currentSelectionTarget={null}
                uploadedImageSelection={null}
                originalImageSelection={null}
                onSelectionComplete={() => {}}
                uploadedImageNaturalDimensions={uploadedImageDimensions}
                originalImageNaturalDimensions={originalImageNaturalDimensions}
              />
            </TabsContent>
            <TabsContent value="detail">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><ZoomInIcon className="mr-2 h-6 w-6" />Detail Comparison Setup</CardTitle>
                  <CardDescription>Select areas on both images to focus your comparison. Use alignment controls to match them, or try auto-aligning centers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant={currentSelectionTarget === 'uploaded' ? "default" : "outline"}
                      onClick={() => setCurrentSelectionTarget('uploaded')}
                      disabled={!uploadedImage || (!!uploadedImageSelection && currentSelectionTarget !== 'uploaded')}
                    >
                      <Edit3 className="mr-2 h-4 w-4"/> 
                      {uploadedImageSelection ? "Reselect on Your Image" : "Select on Your Image"}
                    </Button>
                    <Button 
                      variant={currentSelectionTarget === 'original' ? "default" : "outline"}
                      onClick={() => setCurrentSelectionTarget('original')}
                      disabled={!originalCard || (!!originalImageSelection && currentSelectionTarget !== 'original')}
                    >
                      <Edit3 className="mr-2 h-4 w-4"/> 
                      {originalImageSelection ? "Reselect on Original" : "Select on Original"}
                    </Button>
                  </div>
                  {uploadedImageSelection && originalImageSelection && (
                    <Button
                      onClick={handleAlignSelectionCenters}
                      variant="outline"
                      className="w-full"
                    >
                      <Focus className="mr-2 h-4 w-4" /> Align Selection Centers
                    </Button>
                  )}
                  {currentSelectionTarget && (
                    <p className="text-sm text-accent text-center animate-pulse">
                      Click and drag on the image below to select the area for {currentSelectionTarget === 'uploaded' ? 'your image' : 'the original card'}.
                    </p>
                  )}
                  {uploadedImageSelection && (
                    <p className="text-xs text-muted-foreground">
                      Your Image Selection: X: {uploadedImageSelection.x.toFixed(2)}, Y: {uploadedImageSelection.y.toFixed(2)}, W: {uploadedImageSelection.width.toFixed(2)}, H: {uploadedImageSelection.height.toFixed(2)}
                       <Button variant="link" size="sm" className="p-0 h-auto ml-2" onClick={() => setUploadedImageSelection(null)}>Clear</Button>
                    </p>
                  )}
                  {originalImageSelection && (
                    <p className="text-xs text-muted-foreground">
                      Original Card Selection: X: {originalImageSelection.x.toFixed(2)}, Y: {originalImageSelection.y.toFixed(2)}, W: {originalImageSelection.width.toFixed(2)}, H: {originalImageSelection.height.toFixed(2)}
                      <Button variant="link" size="sm" className="p-0 h-auto ml-2" onClick={() => setOriginalImageSelection(null)}>Clear</Button>
                    </p>
                  )}
                </CardContent>
              </Card>
              <ImageComparisonView
                uploadedImage={uploadedImage}
                originalCardImage={originalCard?.images.full || null}
                alignment={alignment}
                comparisonMode="detail"
                currentSelectionTarget={currentSelectionTarget}
                uploadedImageSelection={uploadedImageSelection}
                originalImageSelection={originalImageSelection}
                onSelectionComplete={handleSelectionComplete}
                uploadedImageNaturalDimensions={uploadedImageDimensions}
                originalImageNaturalDimensions={originalImageNaturalDimensions}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Lorcana Lens. Not affiliated with Disney or Ravensburger.</p>
        <p>Card data sourced from the Similcana project.</p>
      </footer>
    </div>
  );
}
