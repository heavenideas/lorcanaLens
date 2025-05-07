
'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Search, Maximize, Minimize, Wand2, LayersIcon } from 'lucide-react';
import type { AlignmentSettings } from './AlignmentControls';
import { Label } from '@/components/ui/label';

interface ImageComparisonViewProps {
  uploadedImage: string | null;
  originalCardImage: string | null;
  alignment: AlignmentSettings;
}

const ImageComparisonView: React.FC<ImageComparisonViewProps> = ({
  uploadedImage,
  originalCardImage,
  alignment,
}) => {
  const [sliderValue, setSliderValue] = useState(50);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const [isDifferenceMode, setIsDifferenceMode] = useState(false);
  const differenceCanvasRef = useRef<HTMLCanvasElement>(null);


  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  const resetZoomPan = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(false);
    if (comparisonContainerRef.current) {
        comparisonContainerRef.current.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && comparisonContainerRef.current) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;

      const containerRect = comparisonContainerRef.current.getBoundingClientRect();
      const imageWidth = containerRect.width * zoomLevel;
      const imageHeight = containerRect.height * zoomLevel;
      
      const maxPanX = Math.max(0, (imageWidth - containerRect.width) / 2);
      const maxPanY = Math.max(0, (imageHeight - containerRect.height) / 2);

      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      });
    }
  };
  
  useEffect(() => {
    const el = comparisonContainerRef.current;
    
    const onMouseLeave = (e: MouseEvent) => {
        if (el) {
            handleMouseUp(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
    };

    if (el) {
      el.addEventListener('mouseleave', onMouseLeave);
      el.style.cursor = zoomLevel > 1 ? 'grab' : 'default'; // Update cursor on zoomLevel change
      return () => {
        el.removeEventListener('mouseleave', onMouseLeave);
      };
    }
  }, [isPanning, zoomLevel, isDifferenceMode]);


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

    const draw = () => {
      if (!originalLoaded || !uploadedLoaded || !canvas.parentElement) return;

      const container = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      ctx.scale(dpr, dpr);

      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;

      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const getDrawParams = (img: HTMLImageElement, dw: number, dh: number) => {
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const canvasAspect = dw / dh;
          let drawWidth, drawHeight, x, y;
          if (imgAspect > canvasAspect) { // Wider than tall
              drawWidth = dw;
              drawHeight = dw / imgAspect;
          } else { // Taller than wide or square
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
      ctx.translate(alignment.offsetX, alignment.offsetY);
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
    originalImg.onerror = () => console.error("Original image failed to load for difference.");
    uploadedImg.onerror = () => console.error("Uploaded image failed to load for difference.");
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
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6" /> Image Comparison</CardTitle>
        <CardDescription>Slide to compare. Use zoom and pan for detailed inspection. Toggle difference mode to highlight variations.</CardDescription>
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
          className="relative w-full aspect-[7/10] max-w-md mx-auto overflow-hidden rounded-lg shadow-lg border bg-muted"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {isDifferenceMode ? (
             <canvas
              ref={differenceCanvasRef}
              className="w-full h-full"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: 'transform 0.1s linear',
                imageRendering: 'pixelated', // For sharper pixels when zoomed
              }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: 'transform 0.1s linear',
              }}
            >
              <NextImage
                src={originalCardImage}
                alt="Original Lorcana Card"
                layout="fill"
                objectFit="contain"
                unoptimized
                data-ai-hint="card original"
                priority
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
              >
                <NextImage
                  src={uploadedImage}
                  alt="Uploaded Lorcana Card"
                  layout="fill"
                  objectFit="contain"
                  style={uploadedImageStyle}
                  unoptimized
                  data-ai-hint="card uploaded"
                />
              </div>
            </div>
          )}
          
          {!isDifferenceMode && zoomLevel === 1 && (
            <div
              className="absolute top-0 bottom-0 bg-accent w-1 cursor-ew-resize"
              style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)', zIndex: 10 }}
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
