
'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Search, Maximize, Minimize, Wand2, LayersIcon, Edit3 } from 'lucide-react';
import type { AlignmentSettings } from './AlignmentControls';
import { Label } from '@/components/ui/label';
import type { ComparisonMode, SelectionTarget } from '@/app/page';

export interface ImageSelection {
  x: number; // 0.0 to 1.0 (normalized)
  y: number; // 0.0 to 1.0 (normalized)
  width: number; // 0.0 to 1.0 (normalized)
  height: number; // 0.0 to 1.0 (normalized)
}

interface ImageComparisonViewProps {
  uploadedImage: string | null;
  originalCardImage: string | null;
  alignment: AlignmentSettings;
  comparisonMode: ComparisonMode;
  currentSelectionTarget: SelectionTarget;
  uploadedImageSelection: ImageSelection | null;
  originalImageSelection: ImageSelection | null;
  onSelectionComplete: (target: 'uploaded' | 'original', selection: ImageSelection) => void;
  uploadedImageNaturalDimensions: {width: number, height: number} | null;
  originalImageNaturalDimensions: {width: number, height: number} | null;
}

const ImageComparisonView: React.FC<ImageComparisonViewProps> = ({
  uploadedImage,
  originalCardImage,
  alignment,
  comparisonMode,
  currentSelectionTarget,
  uploadedImageSelection,
  originalImageSelection,
  onSelectionComplete,
  uploadedImageNaturalDimensions,
  originalImageNaturalDimensions,
}) => {
  const [sliderValue, setSliderValue] = useState(50);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const [isDifferenceMode, setIsDifferenceMode] = useState(false);
  const differenceCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionStartCoords, setSelectionStartCoords] = useState<{x: number, y: number} | null>(null); // Viewport coords
  const [currentDrawRect, setCurrentDrawRect] = useState<{x: number, y: number, width: number, height: number} | null>(null); // Viewport coords for visual feedback

  // Refs for image elements to get their rendered dimensions
  const originalImageRef = useRef<HTMLImageElement>(null);
  const uploadedImageRef = useRef<HTMLImageElement>(null);


  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  const resetZoomPan = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const getRenderedImageDetails = useCallback((imageRef: React.RefObject<HTMLImageElement>, naturalDimensions: {width: number, height: number} | null) => {
    if (!imageRef.current || !comparisonContainerRef.current || !naturalDimensions) return null;

    const container = comparisonContainerRef.current;
    const imgElement = imageRef.current;
    
    // Get the dimensions of the NextImage's wrapper (which is what object-fit applies to)
    // This assumes NextImage is direct child or has a simple wrapper structure.
    // For more robustness, might need to assign refs directly to NextImage's inner img if possible or use a different strategy.
    // For now, let's assume imageRef.current.parentElement gives us the div that NextImage uses for layout.
    const imageWrapper = imgElement.parentElement;
    if(!imageWrapper) return null;

    const containerWidth = imageWrapper.clientWidth;
    const containerHeight = imageWrapper.clientHeight;
    
    const imgAspect = naturalDimensions.width / naturalDimensions.height;
    const containerAspect = containerWidth / containerHeight;

    let renderWidth, renderHeight, renderX, renderY;

    if (imgAspect > containerAspect) { // Image is wider than its container's aspect ratio
      renderWidth = containerWidth;
      renderHeight = containerWidth / imgAspect;
      renderX = 0;
      renderY = (containerHeight - renderHeight) / 2;
    } else { // Image is taller or same aspect
      renderHeight = containerHeight;
      renderWidth = containerHeight * imgAspect;
      renderY = 0;
      renderX = (containerWidth - renderWidth) / 2;
    }
    
    // These are relative to the imageWrapper. We need coords relative to comparisonContainerRef.
    // This requires knowing the position of imageWrapper within the comparisonContainerRef's scaled/panned child.
    // This is getting complex. A simpler approach: getBoundingClientRect for the image elements.
    const rect = imgElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      // On-screen, scaled and panned position and size:
      screenX: rect.left - containerRect.left,
      screenY: rect.top - containerRect.top,
      screenWidth: rect.width,
      screenHeight: rect.height,
      // Natural dimensions for normalization:
      naturalWidth: naturalDimensions.width,
      naturalHeight: naturalDimensions.height,
    };
  }, []);


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentSelectionTarget && comparisonContainerRef.current && !isDifferenceMode) {
      setIsDrawingSelection(true);
      const containerRect = comparisonContainerRef.current.getBoundingClientRect();
      setSelectionStartCoords({ 
        x: e.clientX - containerRect.left, 
        y: e.clientY - containerRect.top 
      });
      setCurrentDrawRect(null); // Clear previous temporary rect
      e.preventDefault(); // Prevent text selection or other default actions
      return; // Don't pan if selecting
    }

    if (zoomLevel > 1 || (panOffset.x !== 0 || panOffset.y !== 0)) { // Allow panning if zoomed or already panned
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingSelection && selectionStartCoords && comparisonContainerRef.current && currentSelectionTarget) {
      const containerRect = comparisonContainerRef.current.getBoundingClientRect();
      const endX = e.clientX - containerRect.left;
      const endY = e.clientY - containerRect.top;

      const rawRect = {
        x: Math.min(selectionStartCoords.x, endX),
        y: Math.min(selectionStartCoords.y, endY),
        width: Math.abs(endX - selectionStartCoords.x),
        height: Math.abs(endY - selectionStartCoords.y),
      };

      if (rawRect.width > 5 && rawRect.height > 5) { // Min selection size
        const targetImageRef = currentSelectionTarget === 'original' ? originalImageRef : uploadedImageRef;
        const targetNaturalDimensions = currentSelectionTarget === 'original' ? originalImageNaturalDimensions : uploadedImageNaturalDimensions;
        const imgDetails = getRenderedImageDetails(targetImageRef, targetNaturalDimensions);

        if (imgDetails) {
          const normX = (rawRect.x - imgDetails.screenX) / imgDetails.screenWidth;
          const normY = (rawRect.y - imgDetails.screenY) / imgDetails.screenHeight;
          const normWidth = rawRect.width / imgDetails.screenWidth;
          const normHeight = rawRect.height / imgDetails.screenHeight;
          
          // Clamp values to [0, 1] and ensure positive width/height
          const finalSelection: ImageSelection = {
            x: Math.max(0, Math.min(1, normX)),
            y: Math.max(0, Math.min(1, normY)),
            width: Math.max(0, Math.min(1 - Math.max(0, Math.min(1, normX)), normWidth)),
            height: Math.max(0, Math.min(1 - Math.max(0, Math.min(1, normY)), normHeight)),
          };
          if (finalSelection.width > 0.01 && finalSelection.height > 0.01) { // Min normalized size
             onSelectionComplete(currentSelectionTarget, finalSelection);
          }
        }
      }
    }
    
    setIsDrawingSelection(false);
    setSelectionStartCoords(null);
    setCurrentDrawRect(null);
    setIsPanning(false);
    if (comparisonContainerRef.current) {
        comparisonContainerRef.current.style.cursor = (zoomLevel > 1 || (panOffset.x !== 0 || panOffset.y !== 0) || currentSelectionTarget) ? 'grab' : 'default';
        if (currentSelectionTarget) comparisonContainerRef.current.style.cursor = 'crosshair';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingSelection && selectionStartCoords && comparisonContainerRef.current) {
      const containerRect = comparisonContainerRef.current.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;
      setCurrentDrawRect({
        x: Math.min(selectionStartCoords.x, currentX),
        y: Math.min(selectionStartCoords.y, currentY),
        width: Math.abs(currentX - selectionStartCoords.x),
        height: Math.abs(currentY - selectionStartCoords.y),
      });
      e.preventDefault();
      return;
    }

    if (isPanning && comparisonContainerRef.current) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;

      // Simplified panning boundaries - can be refined
      // const imageWidth = comparisonContainerRef.current.offsetWidth * zoomLevel;
      // const imageHeight = comparisonContainerRef.current.offsetHeight * zoomLevel;
      // const maxPanX = Math.max(0, (imageWidth - comparisonContainerRef.current.offsetWidth) / 2);
      // const maxPanY = Math.max(0, (imageHeight - comparisonContainerRef.current.offsetHeight) / 2);

      setPanOffset({
        x: newX, // Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: newY, // Math.max(-maxPanY, Math.min(maxPanY, newY)),
      });
    }
  };
  
  useEffect(() => {
    const el = comparisonContainerRef.current;
    const onMouseLeave = (e: MouseEvent) => {
      if (isDrawingSelection) {
        // Treat mouse leave as mouse up to finalize selection
        handleMouseUp(e as unknown as React.MouseEvent<HTMLDivElement>);
      } else if (isPanning) {
         setIsPanning(false);
      }
       if (el) {
         el.style.cursor = (zoomLevel > 1 || (panOffset.x !== 0 || panOffset.y !== 0) || currentSelectionTarget) ? 'grab' : 'default';
         if (currentSelectionTarget) el.style.cursor = 'crosshair';
      }
    };

    if (el) {
      el.addEventListener('mouseleave', onMouseLeave);
      el.style.cursor = (zoomLevel > 1 || (panOffset.x !== 0 || panOffset.y !== 0) || currentSelectionTarget) ? 'grab' : 'default';
      if (currentSelectionTarget) el.style.cursor = 'crosshair';
      
      return () => {
        el.removeEventListener('mouseleave', onMouseLeave);
      };
    }
  }, [isPanning, zoomLevel, panOffset, currentSelectionTarget, isDrawingSelection, handleMouseUp]);


  useEffect(() => {
    if (!isDifferenceMode || !differenceCanvasRef.current || !uploadedImage || !originalCardImage) {
      return;
    }
    // Difference mode logic remains the same
    const canvas = differenceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalImg = new window.Image();
    const uploadedImg = new window.Image();
    let originalLoaded = false, uploadedLoaded = false;

    const draw = () => {
      if (!originalLoaded || !uploadedLoaded || !canvas.parentElement) return;

      const container = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      // canvas.style.width = `${container.clientWidth}px`; // these are set by className w-full h-full
      // canvas.style.height = `${container.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Apply DPR scaling

      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;

      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const getDrawParams = (img: HTMLImageElement, dw: number, dh: number) => {
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const canvasAspect = dw / dh;
          let drawWidth, drawHeight, x, y;
          if (imgAspect > canvasAspect) { 
              drawWidth = dw;
              drawHeight = dw / imgAspect;
          } else { 
              drawHeight = dh;
              drawWidth = dh * imgAspect;
          }
          x = (dw - drawWidth) / 2;
          y = (dh - drawHeight) / 2;
          return { x, y, width: drawWidth, height: drawHeight };
      };
      
      const origParams = getDrawParams(originalImg, displayWidth, displayHeight);
      ctx.drawImage(originalImg, origParams.x, origParams.y, origParams.width, origParams.height);

      ctx.save();
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      ctx.translate(centerX, centerY); // Move origin to center for transforms
      // Apply alignment transforms relative to the center of the canvas
      ctx.translate(alignment.offsetX * (displayWidth/ (originalImg.naturalWidth || displayWidth)), alignment.offsetY * (displayHeight / (originalImg.naturalHeight || displayHeight)));
      ctx.rotate(alignment.rotate * Math.PI / 180);
      ctx.scale(alignment.scaleX, alignment.scaleY);
      ctx.translate(-centerX, -centerY); // Move origin back

      ctx.globalCompositeOperation = 'difference';
      const upldParams = getDrawParams(uploadedImg, displayWidth, displayHeight);
      ctx.drawImage(uploadedImg, upldParams.x, upldParams.y, upldParams.width, upldParams.height);
      
      ctx.restore(); 
      ctx.globalCompositeOperation = 'source-over';
    };

    originalImg.onload = () => { originalLoaded = true; draw(); };
    uploadedImg.onload = () => { uploadedLoaded = true; draw(); };
    originalImg.onerror = () => console.error("Original image failed to load for difference.");
    uploadedImg.onerror = () => console.error("Uploaded image failed to load for difference.");
    
    // Add cache-busting query params if images might be updated frequently
    originalImg.src = originalCardImage; 
    uploadedImg.src = uploadedImage;

    const resizeObserver = new ResizeObserver(draw);
    if(canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    return () => {
      resizeObserver.disconnect();
    };

  }, [isDifferenceMode, uploadedImage, originalCardImage, alignment]);


  if (!uploadedImage || !originalCardImage) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6" />Comparison Area</CardTitle>
          <CardDescription>Upload your card and select an original to start comparing.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Awaiting images...</p>
        </CardContent>
      </Card>
    );
  }

  const uploadedImageStyle: React.CSSProperties = {
    transform: `scale(${alignment.scaleX}, ${alignment.scaleY}) translate(${alignment.offsetX}px, ${alignment.offsetY}px) rotate(${alignment.rotate}deg)`,
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease-out', // Kept for slider smoothness
    width: '100%', // Ensure NextImage tries to fill its parent before transform
    height: '100%',
    objectFit: 'contain',
  };

  const imageContainerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
    transition: isPanning ? 'none' : 'transform 0.1s linear', // No transition while panning
  };
  
  const selectionDivStyle = (selection: ImageSelection | null, color: string): React.CSSProperties | undefined => {
    if (!selection) return undefined;
    return {
      position: 'absolute',
      left: `${selection.x * 100}%`,
      top: `${selection.y * 100}%`,
      width: `${selection.width * 100}%`,
      height: `${selection.height * 100}%`,
      border: `2px dashed ${color}`,
      pointerEvents: 'none',
      boxSizing: 'border-box',
      zIndex: 10,
    };
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6" /> Image Comparison</CardTitle>
        <CardDescription>
          {comparisonMode === 'full' ? 'Slide to compare. Use zoom and pan for detailed inspection. Toggle difference mode to highlight variations.' : 'Select areas on images above, then use controls. Slide to compare details.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center items-center space-x-2 mb-4">
          <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out" disabled={zoomLevel <= 0.5}>
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in" disabled={zoomLevel >= 5}>
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetZoomPan} aria-label="Reset zoom and pan">
            {zoomLevel === 1 && panOffset.x === 0 && panOffset.y === 0 ? <Maximize className="h-5 w-5" /> : <Minimize className="h-5 w-5" />}
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
          className="relative w-full aspect-[7/10] max-w-md mx-auto overflow-hidden rounded-lg shadow-lg border bg-muted select-none" // added select-none
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {isDifferenceMode ? (
             <canvas
              ref={differenceCanvasRef}
              className="w-full h-full" // Ensures canvas fills the container
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s linear',
                imageRendering: 'pixelated', 
              }}
            />
          ) : (
            <div
              className="absolute inset-0" // This div is for zoom and pan of both images
              style={imageContainerStyle}
            >
              {/* Original Image and its selection */}
              <div className="absolute inset-0">
                <NextImage
                  ref={originalImageRef}
                  src={originalCardImage}
                  alt="Original Lorcana Card"
                  layout="fill"
                  objectFit="contain"
                  unoptimized
                  data-ai-hint="card original"
                  priority
                />
                {originalImageSelection && comparisonMode === 'detail' && <div style={selectionDivStyle(originalImageSelection, 'rgba(0, 0, 255, 0.7)')} />}
              </div>
              
              {/* Uploaded Image (clipped by slider) and its selection */}
              <div
                className="absolute inset-0 overflow-hidden" // This div is for the slider clipping
                style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
              >
                <div className="absolute inset-0"> {/* This div is for the alignment transform of uploaded image */}
                   <NextImage
                      ref={uploadedImageRef}
                      src={uploadedImage}
                      alt="Uploaded Lorcana Card"
                      // layout="fill" // layout="fill" with style transform can be tricky. Let alignmentStyle handle size via transform.
                      // objectFit="contain" // applied in uploadedImageStyle
                      style={uploadedImageStyle} // This style includes the main alignment
                      width={originalImageNaturalDimensions?.width || 500} // Provide base dimensions for NextImage
                      height={originalImageNaturalDimensions?.height || 700}
                      unoptimized
                      data-ai-hint="card uploaded"
                    />
                  {uploadedImageSelection && comparisonMode === 'detail' && <div style={selectionDivStyle(uploadedImageSelection, 'rgba(255, 0, 0, 0.7)')} />}
                </div>
              </div>
            </div>
          )}
          
          {/* Visual feedback for current drawing selection (viewport coordinates) */}
          {isDrawingSelection && currentDrawRect && (
            <div style={{
              position: 'absolute',
              left: `${currentDrawRect.x}px`,
              top: `${currentDrawRect.y}px`,
              width: `${currentDrawRect.width}px`,
              height: `${currentDrawRect.height}px`,
              border: `2px solid ${currentSelectionTarget === 'uploaded' ? 'red' : 'blue'}`,
              backgroundColor: `${currentSelectionTarget === 'uploaded' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)'}`,
              pointerEvents: 'none',
              zIndex: 20,
            }} />
          )}

          {!isDifferenceMode && zoomLevel === 1 && ( // Only show slider handle if not zoomed/panned heavily or in difference mode
            <div
              className="absolute top-0 bottom-0 bg-accent w-1 cursor-ew-resize"
              style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)', zIndex: 30 }} // zIndex above selection rects
            />
          )}
        </div>

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

    