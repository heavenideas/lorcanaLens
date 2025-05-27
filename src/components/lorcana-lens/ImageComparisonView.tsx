
'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Search, Maximize, Minimize, Wand2, LayersIcon, ImageOff as ImageIcon } from 'lucide-react';
import type { AlignmentSettings } from './AlignmentControls';
import { Label } from '@/components/ui/label';
import type { ComparisonMode, PointSelectionMode } from '@/app/page';


interface ImageComparisonViewProps {
  uploadedImage: string | null;
  originalCardImage: string | null;
  alignment: AlignmentSettings;
  comparisonMode: ComparisonMode;
  pointSelectionMode: PointSelectionMode;
  onPointSelected: (
    target: 'uploaded' | 'original',
    point: { x: number; y: number }, // Normalized click coordinates on the image itself
    viewDimensions: { width: number; height: number },
    currentAlignment: AlignmentSettings,
    currentPanOffset: { x: number; y: number },
    currentZoomLevel: number
  ) => void;
  uploadedImageNaturalDimensions: {width: number, height: number} | null;
  originalImageNaturalDimensions: {width: number, height: number} | null;
  panOffset: { x: number; y: number };
  zoomLevel: number;
  onPanOffsetChange: (offset: { x: number; y: number }) => void;
  onZoomLevelChange: (level: number) => void;
}

const ImageComparisonView: React.FC<ImageComparisonViewProps> = ({
  uploadedImage,
  originalCardImage,
  alignment,
  comparisonMode,
  pointSelectionMode,
  onPointSelected,
  uploadedImageNaturalDimensions,
  originalImageNaturalDimensions,
  panOffset,
  zoomLevel,
  onPanOffsetChange,
  onZoomLevelChange,
}) => {
  const [sliderValue, setSliderValue] = useState(50);
  const [localPanOffset, setLocalPanOffset] = useState({ x: 0, y: 0 });
  const [localZoomLevel, setLocalZoomLevel] = useState(1);
  
  const currentPanOffset = comparisonMode === 'detail' ? panOffset : localPanOffset;
  const currentZoomLevel = comparisonMode === 'detail' ? zoomLevel : localZoomLevel;
  const setCurrentPanOffset = comparisonMode === 'detail' ? onPanOffsetChange : setLocalPanOffset;
  const setCurrentZoomLevel = comparisonMode === 'detail' ? onZoomLevelChange : setLocalZoomLevel;


  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const [isDifferenceMode, setIsDifferenceMode] = useState(false);
  const differenceCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isPotentialClick, setIsPotentialClick] = useState(false);
  const mouseDownCoordsRef = useRef<{x: number, y: number} | null>(null);

  const originalImageRef = useRef<HTMLImageElement>(null);
  const uploadedImageRef = useRef<HTMLImageElement>(null);

  const [originalImageError, setOriginalImageError] = useState(false);
  const [uploadedImageError, setUploadedImageError] = useState(false);

  // Initialize dprValue safely for client-side rendering
  const [dprValue, setDprValue] = useState(1);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDprValue(window.devicePixelRatio || 1);
    }
  }, []);


  useEffect(() => {
    setOriginalImageError(false); 
    setUploadedImageError(false);
  }, [originalCardImage, uploadedImage]);


  const handleZoomIn = () => setCurrentZoomLevel(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setCurrentZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  const resetZoomPan = () => {
    setCurrentZoomLevel(1);
    setCurrentPanOffset({ x: 0, y: 0 });
  };

  const getRenderedImageDetails = useCallback((imageRef: React.RefObject<HTMLImageElement>, naturalDimensions: {width: number, height: number} | null) => {
    if (!imageRef.current || !comparisonContainerRef.current || !naturalDimensions) return null;

    const imgElement = imageRef.current;
    const containerRect = comparisonContainerRef.current.getBoundingClientRect();
    
    // Get the actual displayed dimensions from the element, considering object-fit: contain
    // imgElement.getBoundingClientRect() already gives the displayed dimensions after object-fit
    const imgRect = imgElement.getBoundingClientRect();
    
    return {
      screenX: imgRect.left - containerRect.left, // Position relative to the container
      screenY: imgRect.top - containerRect.top,
      screenWidth: imgRect.width,
      screenHeight: imgRect.height,
      naturalWidth: naturalDimensions.width,
      naturalHeight: naturalDimensions.height,
    };
  }, []);


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pointSelectionMode && comparisonContainerRef.current && !isDifferenceMode) {
      setIsPotentialClick(true);
      mouseDownCoordsRef.current = {x: e.clientX, y: e.clientY};
      e.preventDefault();
      return; 
    }
    
    if (currentZoomLevel > 1 || (currentPanOffset.x !== 0 || currentPanOffset.y !== 0)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - currentPanOffset.x, y: e.clientY - currentPanOffset.y });
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPotentialClick && pointSelectionMode && comparisonContainerRef.current && mouseDownCoordsRef.current) {
      const dx = Math.abs(e.clientX - mouseDownCoordsRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownCoordsRef.current.y);

      if (dx < 5 && dy < 5) { // Threshold for differentiating click from drag
        const containerRect = comparisonContainerRef.current.getBoundingClientRect();
        // Click coordinates relative to the comparison container (viewport)
        const view_click_x = e.clientX - containerRect.left;
        const view_click_y = e.clientY - containerRect.top;

        // Determine which image element and its natural dimensions we are targeting
        const targetImageRef = pointSelectionMode === 'original' ? originalImageRef : uploadedImageRef;
        const targetNaturalDimensions = pointSelectionMode === 'original' ? originalImageNaturalDimensions : uploadedImageNaturalDimensions;
        
        const imgDetails = getRenderedImageDetails(targetImageRef, targetNaturalDimensions);

        if (imgDetails && imgDetails.screenWidth > 0 && imgDetails.screenHeight > 0) {
          // Click coordinates relative to the top-left of the *displayed image content*
          // (after object-fit:contain and any transforms like pan/zoom on the main image area)
          let click_on_img_x = view_click_x - imgDetails.screenX;
          let click_on_img_y = view_click_y - imgDetails.screenY;

          if (pointSelectionMode === 'uploaded') {
            // For the uploaded image, transforms (scale, rotate, translate) are applied.
            // We need to map the click on the *transformed* image back to its *untransformed, unscaled* normalized coordinates.
            // This requires reversing the transformations. This is complex.
            // A simpler approach: onPointSelected receives normalized coordinates relative to the *bounding box* of the displayed image.
            // The parent component (page.tsx) then uses these, along with current alignment, to calculate adjustments.
            // The `imgDetails.screenX/Y/Width/Height` are for the *overall slot* the image occupies after `object-fit: contain`.
            // If the image is transformed (scaled/rotated by `alignment`), the `uploadedImageRef.current.getBoundingClientRect()` might be more direct for the *transformed* bounds.
            // However, `getRenderedImageDetails` should ideally give the bounds of the *visible image area*.
          
            // For now, assume `imgDetails` correctly reflects the displayed area of the target image.
            // The `point` for 'uploaded' should be normalized relative to its *own* untransformed space.
            // `getRenderedImageDetails` for `uploadedImageRef` should give us the screen position and size of the transformed image.
            // The click is `view_click_x`, `view_click_y`.
            // We need to find what normalized point on the *original* uploaded image corresponds to this click.
            // This step might be too complex here and is handled in page.tsx's `handlePointSelected`.
            // Here, we just provide the normalized click on the visible image.
          }
          
          // Normalized click coordinates on the *visible, displayed* image (could be original or transformed uploaded)
          const norm_x = click_on_img_x / imgDetails.screenWidth;
          const norm_y = click_on_img_y / imgDetails.screenHeight;
          
          const clamped_norm_x = Math.max(0, Math.min(1, norm_x));
          const clamped_norm_y = Math.max(0, Math.min(1, norm_y));

          if (comparisonContainerRef.current) {
            onPointSelected(
              pointSelectionMode,
              { x: clamped_norm_x, y: clamped_norm_y },
              { width: comparisonContainerRef.current.clientWidth, height: comparisonContainerRef.current.clientHeight },
              alignment, 
              currentPanOffset, 
              currentZoomLevel 
            );
          }
        }
      }
    }
    
    setIsPotentialClick(false);
    mouseDownCoordsRef.current = null;
    setIsPanning(false);
    if (comparisonContainerRef.current) {
        let cursorStyle = 'default';
        if (pointSelectionMode && !isDifferenceMode) cursorStyle = 'crosshair';
        else if (currentZoomLevel > 1 || (currentPanOffset.x !== 0 || currentPanOffset.y !== 0)) cursorStyle = 'grab';
        comparisonContainerRef.current.style.cursor = cursorStyle;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPotentialClick && mouseDownCoordsRef.current) {
        const dx = Math.abs(e.clientX - mouseDownCoordsRef.current.x);
        const dy = Math.abs(e.clientY - mouseDownCoordsRef.current.y);
        if (dx >= 5 || dy >= 5) { 
            setIsPotentialClick(false); // No longer a click, could be a pan
            if (pointSelectionMode) { 
              // If in point selection mode, drag doesn't turn into a pan
            } else if (currentZoomLevel > 1 || (currentPanOffset.x !== 0 || currentPanOffset.y !== 0)) {
                // If not in point selection, and draggable, start panning
                setIsPanning(true);
                setPanStart({ x: e.clientX - currentPanOffset.x, y: e.clientY - currentPanOffset.y });
                if (comparisonContainerRef.current) comparisonContainerRef.current.style.cursor = 'grabbing';
            }
        }
    }

    if (isPanning && comparisonContainerRef.current) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      setCurrentPanOffset({ x: newX, y: newY });
    }
  };
  
  useEffect(() => {
    const el = comparisonContainerRef.current;
    const onMouseLeave = (e: MouseEvent) => {
      if (isPotentialClick) { 
         handleMouseUp(e as unknown as React.MouseEvent<HTMLDivElement>);
      } else if (isPanning) {
         setIsPanning(false);
      }
       if (el) {
        let cursorStyle = 'default';
        if (pointSelectionMode && !isDifferenceMode) cursorStyle = 'crosshair';
        else if (currentZoomLevel > 1 || (currentPanOffset.x !== 0 || currentPanOffset.y !== 0)) cursorStyle = 'grab';
        el.style.cursor = cursorStyle;
      }
    };

    if (el) {
      el.addEventListener('mouseleave', onMouseLeave);
      let cursorStyle = 'default';
      if (pointSelectionMode && !isDifferenceMode) cursorStyle = 'crosshair';
      else if (currentZoomLevel > 1 || (currentPanOffset.x !== 0 || currentPanOffset.y !== 0)) cursorStyle = 'grab';
      el.style.cursor = cursorStyle;
      
      return () => {
        el.removeEventListener('mouseleave', onMouseLeave);
      };
    }
  }, [isPanning, currentZoomLevel, currentPanOffset, pointSelectionMode, isDifferenceMode, isPotentialClick, handleMouseUp]);


  useEffect(() => {
    if (!isDifferenceMode || !differenceCanvasRef.current || !uploadedImage || !originalCardImage) {
      return;
    }
    const canvas = differenceCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const originalImg = new window.Image();
    const uploadedImg = new window.Image();
    let originalLoaded = false, uploadedLoaded = false;
    let loadError = false;

    const drawDifference = () => {
      if (!canvas.parentElement) return;
      if (loadError) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // const dpr = window.devicePixelRatio || 1; // dprValue is now a state
          ctx.font = `${14 * dprValue}px Arial`;
          ctx.fillStyle = "hsl(var(--destructive-foreground))";
          ctx.textAlign = "center";
          ctx.fillText("Error loading one or both images for difference.", canvas.width / (2 * dprValue), canvas.height / (2 * dprValue));
          return;
      }
      if (!originalLoaded || !uploadedLoaded || !originalImageNaturalDimensions || !uploadedImageNaturalDimensions) return;

      const container = canvas.parentElement;
      // const dpr = window.devicePixelRatio || 1; // dprValue is now a state
      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;

      canvas.width = displayWidth * dprValue;
      canvas.height = displayHeight * dprValue;
      ctx.setTransform(dprValue, 0, 0, dprValue, 0, 0); // Scale context for HiDPI

      ctx.clearRect(0, 0, displayWidth, displayHeight);
      
      // Function to calculate drawing parameters for object-fit: contain
      const getDrawParams = (naturalW: number, naturalH: number, cW: number, cH: number) => {
        const imgAspect = naturalW / naturalH;
        const canvasAspect = cW / cH;
        let drawW, drawH, dX, dY;
        if (imgAspect > canvasAspect) { // Image is wider
            drawW = cW;
            drawH = cW / imgAspect;
        } else { // Image is taller or same aspect
            drawH = cH;
            drawW = cH * imgAspect;
        }
        dX = (cW - drawW) / 2;
        dY = (cH - drawH) / 2;
        return { x: dX, y: dY, width: drawW, height: drawH };
      };

      // Draw original image
      const origParams = getDrawParams(originalImageNaturalDimensions.width, originalImageNaturalDimensions.height, displayWidth, displayHeight);
      ctx.drawImage(originalImg, origParams.x, origParams.y, origParams.width, origParams.height);
      
      // Prepare to draw uploaded image transformed
      ctx.save();
      
      // The transform origin for the uploaded image in "difference mode" should visually match how it's displayed.
      // The `alignment.pivot` is normalized (0-1). We apply transforms relative to the *center* of the canvas space
      // for uploaded image, and its internal transform-origin is handled by how we draw it.
      const upldDrawParams = getDrawParams(uploadedImageNaturalDimensions.width, uploadedImageNaturalDimensions.height, displayWidth, displayHeight);

      // Center of the canvas where uploaded image will be conceptually centered before its own transforms
      const canvasCenterX = upldDrawParams.x + upldDrawParams.width / 2;
      const canvasCenterY = upldDrawParams.y + upldDrawParams.height / 2;

      ctx.translate(canvasCenterX, canvasCenterY); // Move to center of where uploaded image will be drawn
      ctx.translate(alignment.offsetX, alignment.offsetY); // Apply user's pixel offset
      ctx.rotate(alignment.rotate * Math.PI / 180); // Apply user's rotation
      ctx.scale(alignment.scaleX, alignment.scaleY); // Apply user's scale

      // If pivot is defined, adjust translate so pivot point is aligned with canvasCenterX, canvasCenterY before other transforms
      // This is complex because pivot is normalized on the image, not the canvas.
      // The transform-origin is effectively handled by applying translations relative to the pivot.
      // The alignment.pivot defines the (0-1) point in the *uploaded image itself* that is the center of scale/rotation.
      // So, before scaling/rotating, we need to translate the image so this pivot point is at (0,0) in the current context,
      // then scale/rotate, then translate back.
      
      let pivotTx = 0;
      let pivotTy = 0;
      if (alignment.pivot) {
        pivotTx = - (alignment.pivot.x - 0.5) * upldDrawParams.width;
        pivotTy = - (alignment.pivot.y - 0.5) * upldDrawParams.height;
      }
      ctx.translate(pivotTx, pivotTy); // Translate so pivot is at origin for scale/rotate
      
      // Draw uploaded image, centered at (0,0) of current transformed context
      // (which was upldDrawParams.x + upldDrawParams.width / 2, etc.)
      ctx.drawImage(uploadedImg, -upldDrawParams.width / 2, -upldDrawParams.height / 2, upldDrawParams.width, upldDrawParams.height);
      
      ctx.restore(); // Restore to state before drawing uploaded image (i.e., original image still there)

      // Now, apply difference blending. We need to redraw the original image in a temporary canvas,
      // and the transformed uploaded image in another, then blend.
      // Simpler: get image data, transform uploaded image data, then diff pixel by pixel.
      // Even simpler (but less accurate if transforms are complex): use globalCompositeOperation
      // We need to draw the transformed uploaded image again, but this time with 'difference'
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = displayWidth * dprValue;
      tempCanvas.height = displayHeight * dprValue;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return;
      tempCtx.setTransform(dprValue, 0, 0, dprValue, 0, 0);


      tempCtx.save();
      tempCtx.translate(canvasCenterX, canvasCenterY);
      tempCtx.translate(alignment.offsetX, alignment.offsetY);
      tempCtx.rotate(alignment.rotate * Math.PI / 180);
      tempCtx.scale(alignment.scaleX, alignment.scaleY);
      tempCtx.translate(pivotTx, pivotTy);
      tempCtx.drawImage(uploadedImg, -upldDrawParams.width / 2, -upldDrawParams.height / 2, upldDrawParams.width, upldDrawParams.height);
      tempCtx.restore();
      
      // Apply 'difference' blending to the main canvas
      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight); // Draw the transformed uploaded image with difference
      
      ctx.globalCompositeOperation = 'source-over'; // Reset for next draws
    };

    originalImg.onload = () => { originalLoaded = true; drawDifference(); };
    uploadedImg.onload = () => { uploadedLoaded = true; drawDifference(); };
    const onError = () => {
      loadError = true;
      drawDifference();
    };
    originalImg.onerror = onError;
    uploadedImg.onerror = onError;
    
    originalImg.crossOrigin = "anonymous"; // Attempt to avoid tainted canvas if images are from different origins
    uploadedImg.crossOrigin = "anonymous"; // Data URLs should be fine
    originalImg.src = originalCardImage; 
    uploadedImg.src = uploadedImage;


    const resizeObserver = new ResizeObserver(drawDifference);
    if(canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    return () => {
      resizeObserver.disconnect();
    };

  }, [isDifferenceMode, uploadedImage, originalCardImage, alignment, originalImageNaturalDimensions, uploadedImageNaturalDimensions, dprValue]);


  if (!uploadedImage || !originalCardImage) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6" />Comparison Area</CardTitle>
          <CardDescription>Upload your card and select an original to start comparing.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96 bg-muted/30 rounded-md">
          <p className="text-muted-foreground">Awaiting images...</p>
        </CardContent>
      </Card>
    );
  }
  
  const transformOrigin = alignment.pivot 
    ? `${alignment.pivot.x * 100}% ${alignment.pivot.y * 100}%` 
    : 'center center';

  const uploadedImageStyle: React.CSSProperties = {
    transform: `scale(${alignment.scaleX}, ${alignment.scaleY}) translate(${alignment.offsetX}px, ${alignment.offsetY}px) rotate(${alignment.rotate}deg)`,
    transformOrigin: transformOrigin,
    transition: 'transform 0.2s ease-out', // Ensure this matches or is appropriate
    width: '100%', 
    height: '100%',
    objectFit: 'contain', // This is crucial for NextImage's layout="fill" behavior
  };

  const imageContainerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `scale(${currentZoomLevel}) translate(${currentPanOffset.x / currentZoomLevel}px, ${currentPanOffset.y / currentZoomLevel}px)`,
    transformOrigin: 'top left', 
    transition: isPanning ? 'none' : 'transform 0.1s linear', 
  };
  

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6" /> Image Comparison</CardTitle>
        <CardDescription>
          {comparisonMode === 'full' ? 'Slide to compare. Use zoom and pan for detailed inspection. Toggle difference mode to highlight variations.' : 'Use buttons above to set center points on images. Slide to compare details.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center items-center space-x-2 mb-4">
          <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out" disabled={currentZoomLevel <= 0.5}>
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in" disabled={currentZoomLevel >= 5}>
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetZoomPan} aria-label="Reset zoom and pan">
            {currentZoomLevel === 1 && currentPanOffset.x === 0 && currentPanOffset.y === 0 ? <Maximize className="h-5 w-5" /> : <Minimize className="h-5 w-5" />}
          </Button>
          <Button 
            variant={isDifferenceMode ? "secondary" : "outline"} 
            size="icon" 
            onClick={() => setIsDifferenceMode(!isDifferenceMode)} 
            aria-label={isDifferenceMode ? "Disable difference mode" : "Enable difference mode"}
            title={isDifferenceMode ? "Disable Difference Mode" : "Enable Difference Mode"}
          >
            <LayersIcon className="h-5 w-5" />
          </Button>
        </div>

        <div
          ref={comparisonContainerRef}
          className="relative w-full aspect-[7/10] max-w-md mx-auto overflow-hidden rounded-lg shadow-lg border bg-muted select-none"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {isDifferenceMode ? (
             <canvas
              ref={differenceCanvasRef}
              className="w-full h-full" // Canvas itself takes full container size
              style={{ // Transforms apply to the canvas drawing space for zoom/pan
                transform: `scale(${currentZoomLevel}) translate(${currentPanOffset.x / currentZoomLevel}px, ${currentPanOffset.y / currentZoomLevel}px)`,
                transformOrigin: 'top left',
                transition: isPanning ? 'none' : 'transform 0.1s linear',
                // imageRendering: 'pixelated', // or 'crisp-edges' if preferred for pixel art
              }}
            />
          ) : (
            // Container for both images, this is what gets panned/zoomed
            <div
              className="absolute inset-0" 
              style={imageContainerStyle}
            >
              {/* Original Image - Base Layer */}
              <div className="absolute inset-0">
                {originalImageError ? (
                  <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground" title="Original image error">
                    <ImageIcon className="w-16 h-16" /> <span className="ml-2">Original image failed to load.</span>
                  </div>
                ) : (
                  <NextImage
                    ref={originalImageRef}
                    src={originalCardImage}
                    alt="Original Lorcana Card"
                    layout="fill" // Important for objectFit to work as expected
                    objectFit="contain" // Ensures aspect ratio is maintained
                    unoptimized
                    data-ai-hint="card original"
                    priority
                    onError={() => setOriginalImageError(true)}
                  />
                )}
              </div>
              
              {/* Uploaded Image - Top Layer, Clipped by Slider */}
              {!originalImageError && uploadedImage && ( 
                <div
                  className="absolute inset-0 overflow-hidden" // This div handles the clipping
                  style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                >
                  {/* This inner div is for applying the alignment transforms (scale, rotate, offset) */}
                  <div className="absolute inset-0" style={{transformOrigin: transformOrigin}}> 
                    {uploadedImageError ? (
                       <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground" title="Uploaded image error">
                         <ImageIcon className="w-16 h-16" /> <span className="ml-2">Uploaded image failed to load.</span>
                       </div>
                    ) : (
                      <NextImage
                          ref={uploadedImageRef}
                          src={uploadedImage} // Data URL, less likely to error here if generated correctly
                          alt="Uploaded Lorcana Card"
                          // NextImage with layout="fill" requires parent to have position relative/absolute and defined size.
                          // The style prop here applies the actual transformations.
                          layout="fill"
                          objectFit="contain" // Will be contained within its transformed bounding box
                          style={uploadedImageStyle} // Apply scale, rotate, offset, and transform-origin here
                          width={originalImageNaturalDimensions?.width || 500} // Provide natural dimensions for better initial sizing by NextImage
                          height={originalImageNaturalDimensions?.height || 700}
                          unoptimized
                          data-ai-hint="card uploaded"
                          onError={() => setUploadedImageError(true)}
                        />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Slider Control - only if not in difference mode and zoomed out */}
          {!isDifferenceMode && currentZoomLevel === 1 && ( 
            <div
              className="absolute top-0 bottom-0 bg-accent w-1 cursor-ew-resize touch-none" // Added touch-none for better mobile
              style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)', zIndex: 30 }} 
              // Basic drag handling for the slider bar itself could be added here if needed
              // For simplicity, relying on the Slider component below.
            />
          )}
        </div>

        {/* UI Slider Component */}
        {!isDifferenceMode && (
          <div className="pt-2">
            <Label htmlFor="comparison-slider" className="sr-only">Comparison Slider</Label>
            <Slider
              id="comparison-slider"
              min={0}
              max={100}
              step={1}
              value={[sliderValue]}
              onValueChange={(value) => setSliderValue(value[0])}
              className="w-full [&>span:first-child]:bg-accent"
              aria-label="Image comparison slider"
              disabled={currentZoomLevel !== 1} // Disable slider if zoomed in
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Uploaded</span>
              <span>Original</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageComparisonView;
