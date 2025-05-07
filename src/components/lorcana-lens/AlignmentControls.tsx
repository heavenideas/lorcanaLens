
'use client';

import type React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, Scaling, RotateCcw, Eye } from 'lucide-react';
import { Button } from '../ui/button';

export interface AlignmentSettings {
  scaleX: number;
  scaleY: number;
  offsetX: number; // in pixels, relative to center
  offsetY: number; // in pixels, relative to center
  rotate: number; // in degrees
}

interface AlignmentControlsProps {
  alignment: AlignmentSettings;
  onAlignmentChange: (settings: AlignmentSettings) => void;
  onReset: () => void;
  uploadedImageDimensions: {width: number, height: number} | null; // Natural dimensions of the (cropped) uploaded image
  originalCardAspectRatio: number; // width / height
}

const AlignmentPreview: React.FC<{
  alignment: AlignmentSettings;
  uploadedImageDimensions: {width: number, height: number} | null;
  originalCardAspectRatio: number;
}> = ({ alignment, uploadedImageDimensions, originalCardAspectRatio }) => {
  const previewSize = 150; // Size of the preview container in pixels

  if (!uploadedImageDimensions) {
    return (
      <div style={{ width: previewSize, height: previewSize }} className="bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
        Loading preview...
      </div>
    );
  }

  // Calculate dimensions for the original card placeholder (target area)
  let targetWidth, targetHeight;
  if (originalCardAspectRatio > 1) { // Wider than tall
    targetWidth = previewSize * 0.8;
    targetHeight = targetWidth / originalCardAspectRatio;
  } else { // Taller than wide or square
    targetHeight = previewSize * 0.8;
    targetWidth = targetHeight * originalCardAspectRatio;
  }
   // Center the target box
  const targetX = (previewSize - targetWidth) / 2;
  const targetY = (previewSize - targetHeight) / 2;


  // Calculate dimensions for the uploaded image placeholder based on its aspect ratio
  const uploadedAspectRatio = uploadedImageDimensions.width / uploadedImageDimensions.height;
  let uWidth, uHeight;
   if (uploadedAspectRatio > 1) {
    uWidth = targetWidth; // Match target width initially
    uHeight = uWidth / uploadedAspectRatio;
  } else {
    uHeight = targetHeight; // Match target height initially
    uWidth = uHeight * uploadedAspectRatio;
  }


  const uploadedStyle: React.CSSProperties = {
    position: 'absolute',
    width: uWidth,
    height: uHeight,
    left: `calc(50% - ${uWidth/2}px)`, // Center before transform
    top: `calc(50% - ${uHeight/2}px)`,  // Center before transform
    transform: `translate(${alignment.offsetX * (previewSize/400)}px, ${alignment.offsetY * (previewSize/400)}px) scale(${alignment.scaleX}, ${alignment.scaleY}) rotate(${alignment.rotate}deg)`, // Scale down offsets for preview
    transformOrigin: 'center center',
    border: '1px dashed hsl(var(--primary))',
    opacity: 0.7,
    transition: 'transform 0.1s ease-out',
  };

  const cornerDotStyle: React.CSSProperties = {
    position: 'absolute',
    width: '4px',
    height: '4px',
    background: 'hsl(var(--primary))',
    borderRadius: '50%',
  };

  return (
    <div
      style={{ width: previewSize, height: previewSize, position: 'relative', overflow: 'hidden' }}
      className="bg-muted/50 rounded-md border"
    >
      {/* Original Card Target Area */}
      <div
        style={{
          position: 'absolute',
          left: targetX,
          top: targetY,
          width: targetWidth,
          height: targetHeight,
          border: '1px solid hsl(var(--border))',
          boxSizing: 'border-box',
        }}
      />
      {/* Uploaded Image Preview */}
      <div style={uploadedStyle}>
        {/* Corner dots for the transformed uploaded image */}
        <div style={{ ...cornerDotStyle, top: '-2px', left: '-2px' }} />
        <div style={{ ...cornerDotStyle, top: '-2px', right: '-2px' }} />
        <div style={{ ...cornerDotStyle, bottom: '-2px', left: '-2px' }} />
        <div style={{ ...cornerDotStyle, bottom: '-2px', right: '-2px' }} />
      </div>
    </div>
  );
};


const AlignmentControls: React.FC<AlignmentControlsProps> = ({ 
    alignment, 
    onAlignmentChange, 
    onReset,
    uploadedImageDimensions,
    originalCardAspectRatio
}) => {
  const handleSliderChange = (key: keyof AlignmentSettings, value: number[]) => {
    onAlignmentChange({ ...alignment, [key]: value[0] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Move className="mr-2 h-6 w-6" /> Adjust Alignment</CardTitle>
        <CardDescription>Fine-tune the uploaded image's position, size, and rotation to match the original.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scaleX-slider" className="flex items-center"><Scaling className="mr-2 h-4 w-4" />Scale X: {alignment.scaleX.toFixed(2)}x</Label>
            <Slider
              id="scaleX-slider"
              min={0.5}
              max={2}
              step={0.01}
              value={[alignment.scaleX]}
              onValueChange={(value) => handleSliderChange('scaleX', value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleY-slider" className="flex items-center"><Scaling className="mr-2 h-4 w-4" />Scale Y: {alignment.scaleY.toFixed(2)}x</Label>
            <Slider
              id="scaleY-slider"
              min={0.5}
              max={2}
              step={0.01}
              value={[alignment.scaleY]}
              onValueChange={(value) => handleSliderChange('scaleY', value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offsetX-slider">Horizontal Offset: {alignment.offsetX}px</Label>
            <Slider
              id="offsetX-slider"
              min={-100}
              max={100}
              step={1}
              value={[alignment.offsetX]}
              onValueChange={(value) => handleSliderChange('offsetX', value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offsetY-slider">Vertical Offset: {alignment.offsetY}px</Label>
            <Slider
              id="offsetY-slider"
              min={-100}
              max={100}
              step={1}
              value={[alignment.offsetY]}
              onValueChange={(value) => handleSliderChange('offsetY', value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rotate-slider" className="flex items-center"><RotateCcw className="mr-2 h-4 w-4" />Rotation: {alignment.rotate}°</Label>
            <Slider
              id="rotate-slider"
              min={-45}
              max={45}
              step={1}
              value={[alignment.rotate]}
              onValueChange={(value) => handleSliderChange('rotate', value)}
            />
          </div>
          <Button onClick={onReset} variant="outline" className="w-full mt-2">
            Reset Alignment
          </Button>
        </div>
        <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2">
            <Label className="flex items-center text-sm text-muted-foreground"><Eye className="mr-1 h-4 w-4"/>Alignment Preview</Label>
            <AlignmentPreview 
                alignment={alignment} 
                uploadedImageDimensions={uploadedImageDimensions}
                originalCardAspectRatio={originalCardAspectRatio}
            />
        </div>
      </CardContent>
    </Card>
  );
};

export default AlignmentControls;
