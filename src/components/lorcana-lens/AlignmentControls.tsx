
'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, Scaling, RotateCcw, Eye, ImageOff as ImageIcon, Link as LinkIcon, Link2Off, Crosshair, Redo, Settings2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input'; // Added Input

export interface AlignmentSettings {
  scaleX: number;
  scaleY: number;
  offsetX: number; // in pixels
  offsetY: number; // in pixels
  rotate: number; // in degrees
  pivot: { x: number; y: number } | null; // Normalized (0-1) coordinates for transform-origin
}

interface AlignmentControlsProps {
  alignment: AlignmentSettings;
  onAlignmentChange: (settings: AlignmentSettings) => void;
  onReset: () => void;
  uploadedImageDimensions: {width: number, height: number} | null;
  originalCardAspectRatio: number;
  uploadedImageSrc: string | null;
  originalCardImageSrc: string | null;
}

const AlignmentPreview: React.FC<{
  alignment: AlignmentSettings;
  uploadedImageDimensions: {width: number, height: number} | null;
  originalCardAspectRatio: number;
  uploadedImageSrc: string | null;
  originalCardImageSrc: string | null;
  isSettingPivot: boolean;
  showPivotMarker: boolean;
  onPivotSelect: (point: { x: number; y: number } | null) => void;
}> = ({
  alignment,
  uploadedImageDimensions,
  originalCardAspectRatio,
  uploadedImageSrc,
  originalCardImageSrc,
  isSettingPivot,
  showPivotMarker,
  onPivotSelect
}) => {
  const previewSize = 150;
  const uploadedImagePreviewRef = useRef<HTMLDivElement>(null);

  const [originalPreviewError, setOriginalPreviewError] = useState(false);
  const [uploadedPreviewError, setUploadedPreviewError] = useState(false);

  useEffect(() => { setOriginalPreviewError(false); }, [originalCardImageSrc]);
  useEffect(() => { setUploadedPreviewError(false); }, [uploadedImageSrc]);

  let targetWidth, targetHeight;
  if (originalCardAspectRatio > 1) {
    targetWidth = previewSize * 0.8;
    targetHeight = targetWidth / originalCardAspectRatio;
  } else {
    targetHeight = previewSize * 0.8;
    targetWidth = targetHeight * originalCardAspectRatio;
  }
  const targetX = (previewSize - targetWidth) / 2;
  const targetY = (previewSize - targetHeight) / 2;

  let uWidth = 0, uHeight = 0;
  if (uploadedImageDimensions) {
    const uploadedAspectRatio = uploadedImageDimensions.width / uploadedImageDimensions.height;
    if (uploadedAspectRatio > 1) {
      uWidth = targetWidth;
      uHeight = uWidth / uploadedAspectRatio;
    } else {
      uHeight = targetHeight;
      uWidth = uHeight * uploadedAspectRatio;
    }
  }

  const transformOrigin = alignment.pivot
    ? `${alignment.pivot.x * 100}% ${alignment.pivot.y * 100}%`
    : 'center center';

  const uploadedStyle: React.CSSProperties = {
    position: 'absolute',
    width: uWidth,
    height: uHeight,
    left: `calc(50% - ${uWidth / 2}px)`,
    top: `calc(50% - ${uHeight / 2}px)`,
    transform: `translate(${alignment.offsetX * (previewSize / 400)}px, ${alignment.offsetY * (previewSize / 400)}px) scale(${alignment.scaleX}, ${alignment.scaleY}) rotate(${alignment.rotate}deg)`,
    transformOrigin: transformOrigin,
    border: isSettingPivot ? '2px dashed hsl(var(--accent))' : '1px dashed hsl(var(--primary))',
    transition: 'transform 0.1s ease-out, border-color 0.2s ease-out',
    overflow: 'hidden',
    cursor: isSettingPivot ? 'crosshair' : 'default',
  };

  const cornerDotStyle: React.CSSProperties = {
    position: 'absolute',
    width: '4px',
    height: '4px',
    background: 'hsl(var(--primary))',
    borderRadius: '50%',
    pointerEvents: 'none',
  };

  const pivotMarkerStyle: React.CSSProperties = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: 'hsl(var(--accent))',
    border: '1px solid hsl(var(--accent-foreground))',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)', // Center the marker
    pointerEvents: 'none',
    display: (showPivotMarker && alignment.pivot) ? 'block' : 'none',
    left: alignment.pivot ? `${alignment.pivot.x * 100}%` : '50%',
    top: alignment.pivot ? `${alignment.pivot.y * 100}%` : '50%',
    zIndex: 10,
  }

  const placeholderDivStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    color: 'hsl(var(--muted-foreground))',
    padding: '0.25rem',
    textAlign: 'center',
    boxSizing: 'border-box',
  };

  const handlePreviewClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSettingPivot && uploadedImagePreviewRef.current && uWidth > 0 && uHeight > 0) {
      const rect = uploadedImagePreviewRef.current.getBoundingClientRect();
      const clickX = event.nativeEvent.offsetX;
      const clickY = event.nativeEvent.offsetY;

      const normX = Math.max(0, Math.min(1, clickX / uWidth));
      const normY = Math.max(0, Math.min(1, clickY / uHeight));
      onPivotSelect({ x: normX, y: normY });
    }
  };

  return (
    <div
      style={{ width: previewSize, height: previewSize, position: 'relative', overflow: 'hidden' }}
      className="bg-muted/50 rounded-md border"
    >
      <div
        style={{
          position: 'absolute',
          left: targetX,
          top: targetY,
          width: targetWidth,
          height: targetHeight,
          border: '1px solid hsl(var(--border))',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {originalCardImageSrc && !originalPreviewError ? (
          <img
            src={originalCardImageSrc}
            alt="Original Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setOriginalPreviewError(true)}
          />
        ) : (
          <div style={placeholderDivStyle} title={originalCardImageSrc && originalPreviewError ? "Original image error" : "Original area"}>
            {originalCardImageSrc && originalPreviewError ? <ImageIcon className="w-4 h-4" /> : 'Original'}
          </div>
        )}
      </div>

      {uploadedImageDimensions && uWidth > 0 && uHeight > 0 ? (
        <div
          ref={uploadedImagePreviewRef}
          style={uploadedStyle}
          onClick={handlePreviewClick}
          title={isSettingPivot ? "Click to set pivot point" : "Uploaded image preview"}
        >
          {uploadedImageSrc && !uploadedPreviewError ? (
             <img
              src={uploadedImageSrc}
              alt="Uploaded Preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              onError={() => setUploadedPreviewError(true)}
            />
          ) : (
            <div style={{...placeholderDivStyle, color: 'hsl(var(--primary))'}} title={uploadedImageSrc && uploadedPreviewError ? "Uploaded image error" : "Uploaded area"}>
               {uploadedImageSrc && uploadedPreviewError ? <ImageIcon className="w-4 h-4" /> : 'Uploaded'}
            </div>
          )}
          <div style={{ ...cornerDotStyle, top: '-2px', left: '-2px' }} />
          <div style={{ ...cornerDotStyle, top: '-2px', right: '-2px' }} />
          <div style={{ ...cornerDotStyle, bottom: '-2px', left: '-2px' }} />
          <div style={{ ...cornerDotStyle, bottom: '-2px', right: '-2px' }} />
          <div style={pivotMarkerStyle} />
        </div>
      ) : uploadedImageSrc ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            Preparing uploaded preview...
        </div>
      ) : null}
       {isSettingPivot && (
        <div className="absolute bottom-1 left-1 right-1 text-center text-xs bg-accent/80 text-accent-foreground p-1 rounded-sm animate-pulse">
          Click on uploaded image to set pivot
        </div>
      )}
    </div>
  );
};


const AlignmentControls: React.FC<AlignmentControlsProps> = ({
    alignment,
    onAlignmentChange,
    onReset,
    uploadedImageDimensions,
    originalCardAspectRatio,
    uploadedImageSrc,
    originalCardImageSrc,
}) => {
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [isSettingPivot, setIsSettingPivot] = useState(false);
  const [showPivotMarker, setShowPivotMarker] = useState(true);
  const [accurateRotationMode, setAccurateRotationMode] = useState(false);

  const handleInputChange = (
    axis: 'scaleX' | 'scaleY' | 'offsetX' | 'offsetY' | 'rotate',
    valueString: string
  ) => {
    let value: number;
    if (axis === 'rotate' || axis.includes('scale')) {
      value = parseFloat(valueString);
    } else {
      value = parseInt(valueString, 10);
    }

    if (isNaN(value)) return; // Prevent NaN updates if parsing fails

    let newAlignment = { ...alignment };

    if (axis === 'scaleX') {
      const newScaleX = parseFloat(value.toFixed(2));
      newAlignment.scaleX = newScaleX;
      if (lockAspectRatio && uploadedImageDimensions) {
        newAlignment.scaleY = newScaleX;
      }
    } else if (axis === 'scaleY') {
      const newScaleY = parseFloat(value.toFixed(2));
      newAlignment.scaleY = newScaleY;
      if (lockAspectRatio && uploadedImageDimensions) {
        newAlignment.scaleX = newScaleY;
      }
    } else if (axis === 'rotate') {
      newAlignment.rotate = parseFloat(value.toFixed(accurateRotationMode ? 1 : 0));
    } else { // offsetX or offsetY
      newAlignment[axis] = value;
    }
    onAlignmentChange(newAlignment);
  };


  const handleScaleSliderChange = (axis: 'scaleX' | 'scaleY', value: number) => {
    let newAlignment = { ...alignment };
    if (axis === 'scaleX') {
      newAlignment.scaleX = value;
      if (lockAspectRatio) {
        newAlignment.scaleY = value;
      }
    } else { // axis === 'scaleY'
      newAlignment.scaleY = value;
      if (lockAspectRatio) {
        newAlignment.scaleX = value;
      }
    }
    onAlignmentChange(newAlignment);
  };

  const handleNonScaleSliderChange = (key: 'offsetX' | 'offsetY' | 'rotate', value: number) => {
    onAlignmentChange({ ...alignment, [key]: parseFloat(value.toFixed(key === 'rotate' && accurateRotationMode ? 1: 0)) });
  };

  const handlePivotSelect = (pivot: { x: number; y: number } | null) => {
    onAlignmentChange({ ...alignment, pivot: pivot });
    setIsSettingPivot(false);
  };

  const handleSetPivotClick = () => setIsSettingPivot(prev => !prev);
  const handleTogglePivotMarker = () => setShowPivotMarker(prev => !prev);
  const handleResetPivot = () => {
    onAlignmentChange({ ...alignment, pivot: null });
    setIsSettingPivot(false);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Settings2 className="mr-2 h-6 w-6" /> Adjust Alignment</CardTitle>
        <CardDescription>Fine-tune the uploaded image's position, size, rotation, and pivot point using sliders or manual input.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {/* Pivot Controls */}
          <div className="space-y-2 pt-2 border-b pb-4 mb-2">
            <Label className="text-base font-medium">Pivot Point</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button variant={isSettingPivot ? "default" : "outline"} onClick={handleSetPivotClick} size="sm">
                <Crosshair className="mr-2 h-4 w-4"/> {isSettingPivot ? "Cancel Set" : "Set Pivot"}
              </Button>
              <Button variant="outline" onClick={handleTogglePivotMarker} size="sm">
                <Eye className="mr-2 h-4 w-4"/> {showPivotMarker ? "Hide" : "Show"} Marker
              </Button>
              <Button variant="outline" onClick={handleResetPivot} disabled={!alignment.pivot} size="sm" className="col-span-2 sm:col-span-1">
                <Redo className="mr-2 h-4 w-4"/> Reset Pivot
              </Button>
            </div>
             {alignment.pivot && (
              <p className="text-xs text-muted-foreground">
                Pivot: X: {alignment.pivot.x.toFixed(2)}, Y: {alignment.pivot.y.toFixed(2)}
              </p>
            )}
          </div>

          {/* Scale Controls */}
          <div className="flex items-center space-x-2">
            <Switch id="lock-aspect-ratio" checked={lockAspectRatio} onCheckedChange={setLockAspectRatio} aria-label="Lock aspect ratio for scaling"/>
            <Label htmlFor="lock-aspect-ratio" className="flex items-center cursor-pointer">
              {lockAspectRatio ? <LinkIcon className="mr-2 h-4 w-4" /> : <Link2Off className="mr-2 h-4 w-4" />}
              Lock Aspect Ratio (Scale)
            </Label>
          </div>
          <div className="grid grid-cols-5 gap-2 items-center">
            <Label htmlFor="scaleX-input" className="col-span-2 flex items-center"><Scaling className="mr-2 h-4 w-4" />Scale X</Label>
            <Input id="scaleX-input" type="number" value={alignment.scaleX.toFixed(2)} onChange={(e) => handleInputChange('scaleX', e.target.value)} step="0.01" className="h-8 col-span-1 text-sm"/>
            <Slider id="scaleX-slider" min={0.5} max={2} step={0.01} value={[alignment.scaleX]} onValueChange={(v) => handleScaleSliderChange('scaleX', v[0])} className="col-span-2"/>
          </div>
           <div className="grid grid-cols-5 gap-2 items-center">
            <Label htmlFor="scaleY-input" className="col-span-2 flex items-center"><Scaling className="mr-2 h-4 w-4" />Scale Y</Label>
            <Input id="scaleY-input" type="number" value={alignment.scaleY.toFixed(2)} onChange={(e) => handleInputChange('scaleY', e.target.value)} step="0.01" className="h-8 col-span-1 text-sm"/>
            <Slider id="scaleY-slider" min={0.5} max={2} step={0.01} value={[alignment.scaleY]} onValueChange={(v) => handleScaleSliderChange('scaleY', v[0])} className="col-span-2"/>
          </div>


          {/* Offset Controls */}
          <div className="grid grid-cols-5 gap-2 items-center">
            <Label htmlFor="offsetX-input" className="col-span-2">Horizontal Offset</Label>
            <Input id="offsetX-input" type="number" value={alignment.offsetX} onChange={(e) => handleInputChange('offsetX', e.target.value)} step="1" className="h-8 col-span-1 text-sm"/>
            <Slider id="offsetX-slider" min={-100} max={100} step={1} value={[alignment.offsetX]} onValueChange={(v) => handleNonScaleSliderChange('offsetX', v[0])} className="col-span-2"/>
          </div>
          <div className="grid grid-cols-5 gap-2 items-center">
            <Label htmlFor="offsetY-input" className="col-span-2">Vertical Offset</Label>
            <Input id="offsetY-input" type="number" value={alignment.offsetY} onChange={(e) => handleInputChange('offsetY', e.target.value)} step="1" className="h-8 col-span-1 text-sm"/>
            <Slider id="offsetY-slider" min={-100} max={100} step={1} value={[alignment.offsetY]} onValueChange={(v) => handleNonScaleSliderChange('offsetY', v[0])} className="col-span-2"/>
          </div>

          {/* Rotation Controls */}
          <div className="flex items-center space-x-2">
            <Switch id="accurate-rotation-mode" checked={accurateRotationMode} onCheckedChange={setAccurateRotationMode} aria-label="Toggle accurate rotation mode"/>
            <Label htmlFor="accurate-rotation-mode">Accurate Rotation (0.1° step)</Label>
          </div>
           <div className="grid grid-cols-5 gap-2 items-center">
            <Label htmlFor="rotate-input" className="col-span-2 flex items-center"><RotateCcw className="mr-2 h-4 w-4" />Rotation</Label>
            <Input id="rotate-input" type="number" value={alignment.rotate.toFixed(accurateRotationMode ? 1 : 0)} onChange={(e) => handleInputChange('rotate', e.target.value)} step={accurateRotationMode ? "0.1" : "1"} className="h-8 col-span-1 text-sm"/>
            <Slider id="rotate-slider" min={-45} max={45} step={accurateRotationMode ? 0.1 : 1} value={[alignment.rotate]} onValueChange={(v) => handleNonScaleSliderChange('rotate', v[0])} className="col-span-2"/>
          </div>

          <Button onClick={onReset} variant="outline" className="w-full mt-4">
            Reset All Alignment
          </Button>
        </div>
        <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2">
            <Label className="flex items-center text-sm text-muted-foreground"><Eye className="mr-1 h-4 w-4"/>Alignment Preview</Label>
            <AlignmentPreview
                alignment={alignment}
                uploadedImageDimensions={uploadedImageDimensions}
                originalCardAspectRatio={originalCardAspectRatio}
                uploadedImageSrc={uploadedImageSrc}
                originalCardImageSrc={originalCardImageSrc}
                isSettingPivot={isSettingPivot}
                showPivotMarker={showPivotMarker}
                onPivotSelect={handlePivotSelect}
            />
        </div>
      </CardContent>
    </Card>
  );
};

export default AlignmentControls;

    