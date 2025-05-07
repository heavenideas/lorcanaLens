
'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Search, Maximize, Minimize, Wand2 } from 'lucide-react';
import type { AlignmentSettings } from './AlignmentControls';

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
    e.currentTarget.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && comparisonContainerRef.current) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;

      // Boundary checks for panning
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
    if (el) {
      el.addEventListener('mouseleave', (e) => handleMouseUp(e as unknown as React.MouseEvent<HTMLDivElement>));
      return () => {
        el.removeEventListener('mouseleave', (e) => handleMouseUp(e as unknown as React.MouseEvent<HTMLDivElement>));
      };
    }
  }, [isPanning]);


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
    transform: `scale(${alignment.scale}) translate(${alignment.offsetX}px, ${alignment.offsetY}px) rotate(${alignment.rotate}deg)`,
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease-out',
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6" /> Image Comparison</CardTitle>
        <CardDescription>Slide to compare. Use zoom and pan for detailed inspection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center items-center space-x-2 mb-4">
          <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out">
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in">
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetZoomPan} aria-label="Reset zoom and pan">
            {zoomLevel === 1 && panOffset.x === 0 && panOffset.y === 0 ? <Maximize className="h-5 w-5" /> : <Minimize className="h-5 w-5" />}
          </Button>
        </div>

        <div
          ref={comparisonContainerRef}
          className="relative w-full aspect-[7/10] max-w-md mx-auto overflow-hidden rounded-lg shadow-lg border bg-muted"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ cursor: zoomLevel > 1 ? 'grab' : 'default' }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: 'transform 0.1s linear',
            }}
          >
            {/* Original Card Image (Bottom Layer) */}
            <NextImage
              src={originalCardImage}
              alt="Original Lorcana Card"
              layout="fill"
              objectFit="contain"
              unoptimized
              data-ai-hint="card original"
            />

            {/* Uploaded Card Image (Top Layer, Clipped) */}
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
          
          {/* Slider Handle - ensure it's above the images */}
          {zoomLevel === 1 && ( // Only show slider handle if not zoomed, to avoid interfering with panning
            <div
              className="absolute top-0 bottom-0 bg-accent w-1 cursor-ew-resize"
              style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)', zIndex: 10 }}
            />
          )}
        </div>

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
          />
           <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Uploaded</span>
            <span>Original</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageComparisonView;
