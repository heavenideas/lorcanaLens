
'use client';

import type React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, ZoomIn, RotateCcw } from 'lucide-react'; // Combined icons for better fit
import { Button } from '../ui/button';

export interface AlignmentSettings {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
}

interface AlignmentControlsProps {
  alignment: AlignmentSettings;
  onAlignmentChange: (settings: AlignmentSettings) => void;
  onReset: () => void;
}

const AlignmentControls: React.FC<AlignmentControlsProps> = ({ alignment, onAlignmentChange, onReset }) => {
  const handleSliderChange = (key: keyof AlignmentSettings, value: number[]) => {
    onAlignmentChange({ ...alignment, [key]: value[0] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Move className="mr-2 h-6 w-6" /> Adjust Alignment</CardTitle>
        <CardDescription>Fine-tune the uploaded image's position, size, and rotation to match the original.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="scale-slider" className="flex items-center"><ZoomIn className="mr-2 h-4 w-4" />Scale: {alignment.scale.toFixed(2)}x</Label>
          <Slider
            id="scale-slider"
            min={0.5}
            max={2}
            step={0.01}
            value={[alignment.scale]}
            onValueChange={(value) => handleSliderChange('scale', value)}
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
        <Button onClick={onReset} variant="outline" className="w-full">
          Reset Alignment
        </Button>
      </CardContent>
    </Card>
  );
};

export default AlignmentControls;
