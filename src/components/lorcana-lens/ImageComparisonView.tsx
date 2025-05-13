'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Search, Maximize, Minimize, Wand2, LayersIcon, ImageOff as ImageIcon } from 'lucide-react'; // Added ImageIcon
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

  useEffect(() => {
    setOriginalImageError(false); // Reset error when originalCardImage changes
  }, [originalCardImage]);


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
    const imgRect = imgElement.getBoundingClientRect();
    
    return {
      screenX: imgRect.left - containerRect.left,
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

      if (dx < 5 && dy < 5) { 
        const containerRect = comparisonContainerRef.current.getBoundingClientRect();
        const view_click_x = e.clientX - containerRect.left;
        const view_click_y = e.clientY - containerRect.top;

        const targetImageRef = pointSelectionMode === 'original' ? originalImageRef : uploadedImageRef;
        const targetNaturalDimensions = pointSelectionMode === 'original' ? originalImageNaturalDimensions : uploadedImageNaturalDimensions;
        
        const imgDetails = getRenderedImageDetails(targetImageRef, targetNaturalDimensions);

        if (imgDetails && imgDetails.screenWidth > 0 && imgDetails.screenHeight > 0) {
          const click_on_img_x = view_click_x - imgDetails.screenX;
          const click_on_img_y = view_click_y - imgDetails.screenY;

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
            setIsPotentialClick(false);
            if (pointSelectionMode) { 
            } else if (currentZoomLevel > 1 || (currentPanOffset.x !== 0 || currentPanOffset.y !== 0)) {
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalImg = new window.Image();
    const uploadedImg = new window.Image();
    let originalLoaded = false, uploadedLoaded = false;
    let originalError = false, uploadedError = false;

    const draw = () => {
      if (!canvas.parentElement) return;
      if (originalError || uploadedError) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "16px Arial";
        ctx.fillStyle = "hsl(var(--destructive-foreground))";
        ctx.textAlign = "center";
        ctx.fillText("Error loading images for difference mode.", canvas.width / (2 * (window.devicePixelRatio || 1)), canvas.height / (2 * (window.devicePixelRatio || 1)));
        return;
      }
      if (!originalLoaded || !uploadedLoaded) return;


      const container = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

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

      ctx.translate(centerX, centerY); 
      ctx.translate(alignment.offsetX * (displayWidth/ (originalImg.naturalWidth || displayWidth)), alignment.offsetY * (displayHeight / (originalImg.naturalHeight || displayHeight)));
      ctx.rotate(alignment.rotate * Math.PI / 180);
      ctx.scale(alignment.scaleX, alignment.scaleY);
      ctx.translate(-centerX, -centerY); 

      ctx.globalCompositeOperation = 'difference';
      const upldParams = getDrawParams(uploadedImg, displayWidth, displayHeight);
      ctx.drawImage(uploadedImg, upldParams.x, upldParams.y, upldParams.width, upldParams.height);
      
      ctx.restore(); 
      ctx.globalCompositeOperation = 'source-over';
    };

    originalImg.onload = () => { originalLoaded = true; draw(); };
    uploadedImg.onload = () => { uploadedLoaded = true; draw(); };
    originalImg.onerror = () => { 
      console.error("Original image failed to load for difference.");
      originalError = true; draw();
    };
    uploadedImg.onerror = () => { 
      console.error("Uploaded image failed to load for difference.");
      uploadedError = true; draw();
    };
    
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
    transition: 'transform 0.2s ease-out',
    width: '100%', 
    height: '100%',
    objectFit: 'contain',
  };

  const imageContainerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `scale(${currentZoomLevel}) translate(${currentPanOffset.x / currentZoomLevel}px, ${currentPanOffset.y / currentZoomLevel}px)`,
    transformOrigin: 'top left', // Panning works relative to top-left now
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
              className="w-full h-full"
              style={{
                transform: `scale(${currentZoomLevel}) translate(${currentPanOffset.x / currentZoomLevel}px, ${currentPanOffset.y / currentZoomLevel}px)`,
                transformOrigin: 'top left',
                transition: isPanning ? 'none' : 'transform 0.1s linear',
                imageRendering: 'pixelated', 
              }}
            />
          ) : (
            <div
              className="absolute inset-0" 
              style={imageContainerStyle}
            >
              {/* Original Image */}
              <div className="absolute inset-0">
                {originalImageError ? (
                  <div className="w-full h-full flex items-center justify-center bg-card" title="Original image not available">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                ) : (
                  <NextImage
                    ref={originalImageRef}
                    src={originalCardImage}
                    alt="Original Lorcana Card"
                    layout="fill"
                    objectFit="contain"
                    unoptimized
                    data-ai-hint="card original"
                    priority
                    onError={() => setOriginalImageError(true)}
                  />
                )}
              </div>
              
              {/* Uploaded Image (clipped by slider) */}
              {!originalImageError && uploadedImage && ( // Only show uploaded if original isn't in error state (or adjust logic as needed)
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                >
                  <div className="absolute inset-0"> 
                    <NextImage
                        ref={uploadedImageRef}
                        src={uploadedImage}
                        alt="Uploaded Lorcana Card"
                        style={uploadedImageStyle} 
                        width={originalImageNaturalDimensions?.width || 500} 
                        height={originalImageNaturalDimensions?.height || 700}
                        unoptimized
                        data-ai-hint="card uploaded"
                        // No onError for uploadedImage as it's a data URL, less likely to fail this way
                      />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!isDifferenceMode && currentZoomLevel === 1 && ( 
            <div
              className="absolute top-0 bottom-0 bg-accent w-1 cursor-ew-resize"
              style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)', zIndex: 30 }} 
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
