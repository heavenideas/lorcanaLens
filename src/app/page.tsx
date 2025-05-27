
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
  pivot: null, // Added pivot
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

      // Calculate effective display dimensions of the uploaded image if it were scaled to match the original's aspect ratio for fitting logic
      // This part seems complex and might need to be re-evaluated based on how transform-origin affects things.
      // For now, we assume point.x and point.y are normalized click coordinates on the *currently displayed* (transformed) uploaded image.
      // We want to translate the image such that this clicked point (in its transformed state) moves to the center of the viewport.
      
      const s_fit_orig = Math.min(
        (originalImageNaturalDimensions.width * currentAlignmentState.scaleX) / uploadedImageDimensions.width,
        (originalImageNaturalDimensions.height * currentAlignmentState.scaleY) / uploadedImageDimensions.height
      );

      const Eff_uw = uploadedImageDimensions.width * s_fit_orig ;
      const Eff_uh = uploadedImageDimensions.height * s_fit_orig ;
      
      const { dispW: Disp_Eff_uw, dispH: Disp_Eff_uh } = calculateDisplayedDimensions(Eff_uw, Eff_uh, viewDimensions.width, viewDimensions.height);

      const R_rad = currentAlignmentState.rotate * Math.PI / 180;
      const cosR = Math.cos(R_rad);
      const sinR = Math.sin(R_rad);

      // Determine the pivot's position in the uploaded image's untransformed, unscaled space (normalized 0-1)
      const pivotX_norm = currentAlignmentState.pivot ? currentAlignmentState.pivot.x : 0.5;
      const pivotY_norm = currentAlignmentState.pivot ? currentAlignmentState.pivot.y : 0.5;

      // Click point relative to the pivot point in normalized coordinates of the *scaled* image
      const dx_from_pivot_norm_scaled = (point.x - pivotX_norm) * currentAlignmentState.scaleX;
      const dy_from_pivot_norm_scaled = (point.y - pivotY_norm) * currentAlignmentState.scaleY;

      // Convert normalized-scaled-from-pivot distances to view pixels (based on effective display of uploaded image)
      const dx_from_pivot_view = dx_from_pivot_norm_scaled * Disp_Eff_uw;
      const dy_from_pivot_view = dy_from_pivot_norm_scaled * Disp_Eff_uh;
      
      // Rotate these view-pixel distances
      const v_target_x_view_rotated = dx_from_pivot_view * cosR - dy_from_pivot_view * sinR;
      const v_target_y_view_rotated = dx_from_pivot_view * sinR + dy_from_pivot_view * cosR;

      // The current offsets are from the pivot. We want to adjust them so v_target (the clicked point) is at 0,0 in view space *relative to the pivot's screen position*.
      // This means we want to shift the image by -v_target_x_view_rotated and -v_target_y_view_rotated.
      // These are pixel offsets.
      const newUploadedAlignmentOffsetX = currentAlignmentState.offsetX - v_target_x_view_rotated;
      const newUploadedAlignmentOffsetY = currentAlignmentState.offsetY - v_target_y_view_rotated;
      
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

      // point.x, point.y are normalized click coords on the original image display.
      // dx/dy are distances from the center of the original image display to the click point, in *unzoomed view pixels*.
      const dx_in_frame_orig_at_zoom1 = (point.x - 0.5) * Disp_N_ow;
      const dy_in_frame_orig_at_zoom1 = (point.y - 0.5) * Disp_N_oh;
      
      // We want the main view to pan so that this clicked point (dx_in_frame_orig_at_zoom1, dy_in_frame_orig_at_zoom1 from center)
      // becomes the new center of the viewport.
      // So, the new pan offset should be the negative of these values, scaled by zoom.
      const newMainPanX = -dx_in_frame_orig_at_zoom1 * currentZoomLevelState;
      const newMainPanY = -dy_in_frame_orig_at_zoom1 * currentZoomLevelState;

      // Calculate the change in the main view's pan, in *unzoomed* pixels.
      // This is how much the "world" effectively shifted from the perspective of the uploaded image.
      const delta_unzoomed_tx = (newMainPanX - currentPanOffsetState.x) / currentZoomLevelState;
      const delta_unzoomed_ty = (newMainPanY - currentPanOffsetState.y) / currentZoomLevelState;

      // Adjust the uploaded image's alignment offset to compensate for this "world" shift.
      // Its current offsetX/Y are relative to its pivot (or center if no pivot).
      const newUploadedAlignmentOffsetX = currentAlignmentState.offsetX - delta_unzoomed_tx;
      const newUploadedAlignmentOffsetY = currentAlignmentState.offsetY - delta_unzoomed_ty;
      
      setAlignment(prev => ({
        ...prev,
        offsetX: parseFloat(newUploadedAlignmentOffsetX.toFixed(2)),
        offsetY: parseFloat(newUploadedAlignmentOffsetY.toFixed(2)),
      }));
      
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
                alignment={alignment} 
                comparisonMode="detail"
                pointSelectionMode={pointSelectionMode}
                onPointSelected={handlePointSelected} 
                uploadedImageNaturalDimensions={uploadedImageDimensions}
                originalImageNaturalDimensions={originalImageNaturalDimensions}
                panOffset={mainViewPanOffset} 
                zoomLevel={mainViewZoomLevel} 
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
