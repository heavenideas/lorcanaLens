
'use client';

import { useEffect, useState, useCallback } from 'react';
import ImageUploadForm from '@/components/lorcana-lens/ImageUploadForm';
import CardSearchControl from '@/components/lorcana-lens/CardSearchControl';
import AlignmentControls, { type AlignmentSettings } from '@/components/lorcana-lens/AlignmentControls';
import ImageComparisonView from '@/components/lorcana-lens/ImageComparisonView';
import { getAllLorcanaCards, type AllCards, type LorcanaCard } from '@/services/lorcana-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Pointer, ZoomInIcon } from 'lucide-react'; 
import { useToast } from "@/hooks/use-toast";
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


export type ComparisonMode = 'full' | 'detail';
export type PointSelectionMode = 'uploaded' | 'original' | null;


// Calculates how an image with naturalW x naturalH dimensions
// would be displayed (object-fit: contain) within a containerW x containerH box.
const calculateDisplayedDimensions = (naturalW: number, naturalH: number, containerW: number, containerH: number) => {
  if (naturalW === 0 || naturalH === 0) return { dispW: 0, dispH: 0 };
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
  const [pointSelectionMode, setPointSelectionMode] = useState<PointSelectionMode>(null);
  
  const [mainViewPanOffset, setMainViewPanOffset] = useState({ x: 0, y: 0 });
  const [mainViewZoomLevel, setMainViewZoomLevel] = useState(1);


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
    setMainViewPanOffset({ x: 0, y: 0 }); 
    setMainViewZoomLevel(1); 
  };

  const handlePointSelected = (
    target: 'uploaded' | 'original',
    point: { x: number; y: number }, 
    viewDimensions: { width: number; height: number },
    currentAlignmentState: AlignmentSettings, 
    currentPanOffsetState: { x: number; y: number }, 
    currentZoomLevelState: number 
  ) => {
    if (target === 'uploaded') {
      if (!uploadedImageDimensions || !originalImageNaturalDimensions) return;

      const s_fit_orig = Math.min(originalImageNaturalDimensions.width / uploadedImageDimensions.width, originalImageNaturalDimensions.height / uploadedImageDimensions.height);
      const Eff_uw = uploadedImageDimensions.width * s_fit_orig;
      const Eff_uh = uploadedImageDimensions.height * s_fit_orig;
      
      const { dispW: Disp_Eff_uw, dispH: Disp_Eff_uh } = calculateDisplayedDimensions(Eff_uw, Eff_uh, viewDimensions.width, viewDimensions.height);

      const R_rad = currentAlignmentState.rotate * Math.PI / 180;
      const cosR = Math.cos(R_rad);
      const sinR = Math.sin(R_rad);

      const dx_in_frame_unrotated = (point.x - 0.5) * Disp_Eff_uw * currentAlignmentState.scaleX;
      const dy_in_frame_unrotated = (point.y - 0.5) * Disp_Eff_uh * currentAlignmentState.scaleY;
      
      const v_target_x_view = dx_in_frame_unrotated * cosR - dy_in_frame_unrotated * sinR;
      const v_target_y_view = dx_in_frame_unrotated * sinR + dy_in_frame_unrotated * cosR;

      const newUploadedAlignmentOffsetX = currentAlignmentState.offsetX - v_target_x_view;
      const newUploadedAlignmentOffsetY = currentAlignmentState.offsetY - v_target_y_view;
      
      setAlignment(prev => ({
        ...prev,
        offsetX: parseFloat(newUploadedAlignmentOffsetX.toFixed(2)),
        offsetY: parseFloat(newUploadedAlignmentOffsetY.toFixed(2)),
      }));
      toast({ title: "Uploaded Image Centered", description: "Adjusted alignment to center on your selected point." });

    } else if (target === 'original') {
      if (!originalImageNaturalDimensions) return;

      const { dispW: Disp_N_ow, dispH: Disp_N_oh } = calculateDisplayedDimensions(
        originalImageNaturalDimensions.width,
        originalImageNaturalDimensions.height,
        viewDimensions.width,
        viewDimensions.height
      );

      const dx_in_frame_orig_at_zoom1 = (point.x - 0.5) * Disp_N_ow;
      const dy_in_frame_orig_at_zoom1 = (point.y - 0.5) * Disp_N_oh;
      
      // newMainPanX/Y are the target pan values for the main viewport, in screen (zoomed) pixels
      const newMainPanX = -dx_in_frame_orig_at_zoom1 * currentZoomLevelState;
      const newMainPanY = -dy_in_frame_orig_at_zoom1 * currentZoomLevelState;

      // Old main viewport pan values, in screen (zoomed) pixels
      const oldMainPanX = currentPanOffsetState.x;
      const oldMainPanY = currentPanOffsetState.y;

      // Change in pan in screen pixels
      const deltaPanX_screen = newMainPanX - oldMainPanX;
      const deltaPanY_screen = newMainPanY - oldMainPanY;

      // Convert this change in screen pan to a change in unzoomed coordinates.
      // This is how much Image A's world effectively shifted.
      // currentZoomLevelState cannot be 0 due to existing component constraints (min zoom 0.5).
      const delta_unzoomed_tx = deltaPanX_screen / currentZoomLevelState;
      const delta_unzoomed_ty = deltaPanY_screen / currentZoomLevelState;

      // Adjust Image A's alignment to compensate for the main view's pan.
      // currentAlignmentState.offsetX/Y are in unzoomed pixels.
      const newUploadedAlignmentOffsetX = currentAlignmentState.offsetX - delta_unzoomed_tx;
      const newUploadedAlignmentOffsetY = currentAlignmentState.offsetY - delta_unzoomed_ty;
      
      setAlignment(prev => ({
        ...prev,
        offsetX: parseFloat(newUploadedAlignmentOffsetX.toFixed(2)),
        offsetY: parseFloat(newUploadedAlignmentOffsetY.toFixed(2)),
      }));
      
      // Set the new pan for the main view
      setMainViewPanOffset({
        x: parseFloat(newMainPanX.toFixed(2)),
        y: parseFloat(newMainPanY.toFixed(2)),
      });
      toast({ title: "Original Image Centered", description: "Adjusted view pan. Uploaded image position compensated." });
    }
    setPointSelectionMode(null); 
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
                pointSelectionMode={null} 
                onPointSelected={() => {}} 
                uploadedImageNaturalDimensions={uploadedImageDimensions}
                originalImageNaturalDimensions={originalImageNaturalDimensions}
                panOffset={mainViewPanOffset}
                zoomLevel={mainViewZoomLevel}
                onPanOffsetChange={setMainViewPanOffset}
                onZoomLevelChange={setMainViewZoomLevel}
              />
            </TabsContent>
            <TabsContent value="detail">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><ZoomInIcon className="mr-2 h-6 w-6" />Detail Comparison Setup</CardTitle>
                  <CardDescription>Click a button below, then click a point on the corresponding image to center the view on that point. Use alignment controls to fine-tune.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                      variant={pointSelectionMode === 'uploaded' ? "default" : "outline"}
                      onClick={() => setPointSelectionMode('uploaded')}
                      disabled={!uploadedImage}
                    >
                      <Pointer className="mr-2 h-4 w-4"/> 
                      Set Center on Your Image
                    </Button>
                    <Button 
                      variant={pointSelectionMode === 'original' ? "default" : "outline"}
                      onClick={() => setPointSelectionMode('original')}
                      disabled={!originalCard}
                    >
                      <Pointer className="mr-2 h-4 w-4"/> 
                      Set Center on Original
                    </Button>
                  </div>
                  
                  {pointSelectionMode && (
                    <p className="text-sm text-accent text-center animate-pulse">
                      Click on the {pointSelectionMode === 'uploaded' ? 'uploaded (left/top)' : 'original (right/bottom)'} image below to select the new center point.
                    </p>
                  )}
                </CardContent>
              </Card>
              <ImageComparisonView
                uploadedImage={uploadedImage}
                originalCardImage={originalCard?.images.full || null}
                alignment={alignment} // Pass the page-level alignment state
                comparisonMode="detail"
                pointSelectionMode={pointSelectionMode}
                onPointSelected={handlePointSelected} // Pass the updated handler
                uploadedImageNaturalDimensions={uploadedImageDimensions}
                originalImageNaturalDimensions={originalImageNaturalDimensions}
                panOffset={mainViewPanOffset} // Pass the page-level panOffset
                zoomLevel={mainViewZoomLevel} // Pass the page-level zoomLevel
                onPanOffsetChange={setMainViewPanOffset}
                onZoomLevelChange={setMainViewZoomLevel}
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
