import React, { useEffect, useRef, useState } from 'react';
import { usePrayana } from '../../../context/PrayanaContext';
import { PopButton } from '../../ui/InteractivePrimitives';
import { CompassLoader } from '../../common/CompassLoader';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Languages,
  Upload,
  Volume2,
} from 'lucide-react';

export const OcrScannerPage: React.FC = () => {
  const {
    activeDestination,
    isBhashiniDownloaded,
    downloadBhashiniPack,
    ocrScanResult,
    runOcrScan,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const [menuTextToScan, setMenuTextToScan] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [menuPreviewUrl, setMenuPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (menuPreviewUrl) URL.revokeObjectURL(menuPreviewUrl);
    };
  }, []);

  const handleRunOcr = async (preset?: string) => {
    setIsScanning(true);
    try {
      await runOcrScan({ sampleText: preset ?? menuTextToScan });
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunImageFile = async (file: File) => {
    stopCamera();
    if (menuPreviewUrl) URL.revokeObjectURL(menuPreviewUrl);
    setMenuPreviewUrl(URL.createObjectURL(file));
    setUploadedFileName(file.name);
    setCameraError(null);
    setIsScanning(true);
    try {
      await runOcrScan({ imageFile: file });
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera capture API unavailable in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access camera.');
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `menu-capture-${Date.now()}.png`, {
        type: 'image/png',
      });
      await handleRunImageFile(capturedFile);
    }, 'image/png');
  };

  return (
    <div className="w-full space-y-5 pb-12 font-mono text-[13px] select-none">
      {/* Top: Bhashini Language Pack Downloader */}
      <div className="p-4 bg-[#121212] border border-[rgba(242,240,235,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Languages className="w-4 h-4 text-ink-primary shrink-0" />
          <div>
            <div className="font-bold text-ink-primary text-[12px]">
              BHASHINI REGIONAL LANGUAGE PACK // {activeDestination.region.toUpperCase()}
            </div>
            <div className="text-[11px] text-ink-secondary mt-0.5">
              Offline quantized LSTM dictionary for regional script & local dining vernacular (24 MB)
            </div>
          </div>
        </div>

        <PopButton
          onClick={downloadBhashiniPack}
          disabled={isBhashiniDownloaded}
          size="sm"
          variant={isBhashiniDownloaded ? 'outline' : 'primary'}
          className="flex items-center gap-1.5 shrink-0"
        >
          <Download className="w-3 h-3" />
          <span>{isBhashiniDownloaded ? 'PACK DOWNLOADED (OFFLINE READY)' : 'DOWNLOAD OFFLINE PACK'}</span>
        </PopButton>
      </div>

      {/* 12-Column OCR Scanner Viewfinder & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)] space-y-3.5">
          <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase">
            <span>INTERACTIVE MENU OCR VIEWFINDER (EOAM)</span>
            <span>ϵ = 0.20 FUZZY LEVENSHTEIN</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleRunImageFile(file);
            }}
          />

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleRunImageFile(file);
            }}
            onClick={() => !isCameraActive && fileInputRef.current?.click()}
            className="relative min-h-[180px] bg-[#0E0E0E] border border-dashed border-[rgba(242,240,235,0.28)] hover:border-ink-primary flex flex-col items-center justify-center p-4 text-center overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 arch-grid-bg opacity-25 pointer-events-none" />
            {isCameraActive ? (
              <div className="relative z-10 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[200px] object-cover border border-[rgba(242,240,235,0.2)]"
                />
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureCameraFrame}
                    className="px-3 py-1 bg-ink-primary text-canvas font-bold text-[11px] cursor-pointer"
                  >
                    [ SNAP & RUN TESSERACT OCR ]
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1 bg-[#222222] text-ink-secondary border border-[rgba(242,240,235,0.2)] text-[11px] cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : isScanning ? (
              <CompassLoader
                variant="overlay"
                theme={theme}
                statusText={`SCANNING ${uploadedFileName || 'MENU'} WITH TESSERACT OCR...`}
              />
            ) : menuPreviewUrl ? (
              <div className="relative z-10 w-full space-y-2">
                <img
                  src={menuPreviewUrl}
                  alt="Uploaded Menu Preview"
                  className="max-h-[150px] mx-auto border border-[rgba(242,240,235,0.2)] object-contain"
                />
                <div className="text-[11px] text-ink-muted">
                  {uploadedFileName} · CLICK OR DROP ANOTHER MENU IMAGE
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-[11px] text-ink-muted space-y-1.5">
                <Upload className="w-6 h-6 mx-auto text-ink-primary" />
                <div className="text-ink-primary font-bold">
                  DROP MENU PHOTO HERE OR CLICK TO UPLOAD (PNG / JPG)
                </div>
                <div className="text-[11px]">
                  SENDS IMAGE TO OPENCV + TESSERACT ENGINE (/api/v1/ocr/scan-menu)
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-ink-primary text-canvas font-bold text-[11px] cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3 h-3" />
              <span>[ UPLOAD MENU PHOTO ]</span>
            </button>
            <button
              type="button"
              onClick={handleStartCamera}
              className="px-3 py-1.5 bg-[#1A1A1A] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary text-[11px] cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-3 h-3" />
              <span>[ LIVE CAMERA CAPTURE ]</span>
            </button>
          </div>

          {cameraError && (
            <div
              className={`p-2 border text-[11px] ${
                isLight
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-[#251313] border-semantic-hazard/50 text-semantic-hazard'
              }`}
            >
              [ CAMERA NOTICE: {cameraError} ]
            </div>
          )}

          {/* Raw Text Input Fallback + Sample Helpers */}
          <div className="space-y-2 pt-2 border-t border-[rgba(242,240,235,0.08)]">
            <label className="block text-[11px] text-ink-secondary uppercase">
              OR PASTE RAW MENU TEXT TO SCREEN:
            </label>
            <textarea
              rows={3}
              value={menuTextToScan}
              onChange={(e) => setMenuTextToScan(e.target.value)}
              placeholder="Paste menu items here (e.g. Peanut Curry, Kaju Pulao, Benne Dosa)..."
              className="w-full bg-[#111111] border border-[rgba(242,240,235,0.16)] p-2.5 text-[12px] text-ink-primary focus:border-ink-primary focus:outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={!menuTextToScan.trim() || isScanning}
                onClick={() => handleRunOcr()}
                className="px-3 py-1.5 bg-[#222222] border border-ink-primary text-ink-primary hover:bg-ink-primary hover:text-canvas text-[11px] cursor-pointer disabled:opacity-40"
              >
                [ SCAN TEXT INPUT ]
              </button>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRunOcr('1. VEG BIRIYANI (FRIED CASHEW & KAJU)\n2. PRAWN CURRY\n3. BADAM HALWA')}
                  className="px-2.5 py-1 bg-[#1A1A1A] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-[11px] text-ink-muted hover:text-ink-primary cursor-pointer"
                >
                  SAMPLE: CASHEW
                </button>
                <button
                  type="button"
                  onClick={() => handleRunOcr('1. BENNE DOSA W/ COCONUT CHUTNEY\n2. STEAMED IDLI\n3. FILTER COFFEE')}
                  className="px-2.5 py-1 bg-[#1A1A1A] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-[11px] text-ink-muted hover:text-ink-primary cursor-pointer"
                >
                  SAMPLE: IDLI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 6 Columns: OCR Output & Critical Safety Protocol */}
        <div className="lg:col-span-6 p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-3 pb-2 border-b border-[rgba(242,240,235,0.08)]">
              SCANNER RESULT & MANDATORY SAFETY VERIFICATION
            </div>

            {ocrScanResult ? (
              <div className="space-y-3">
                {ocrScanResult.status === 'HAZARD_ALERT' ? (
                  <div
                    className={`p-3.5 border ${
                      isLight
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-[#2D1515] border-semantic-hazard text-semantic-hazard'
                    }`}
                  >
                    <div className="font-bold text-[13px] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>STATUS: HAZARD_ALERT</span>
                    </div>
                    <div
                      className={`mt-1 text-[12px] font-sans leading-relaxed ${
                        isLight ? 'text-red-900' : 'text-ink-primary'
                      }`}
                    >
                      Matched allergen tokens:{' '}
                      <span
                        className={`font-mono font-bold ${
                          isLight ? 'text-red-700' : 'text-semantic-hazard'
                        }`}
                      >
                        {ocrScanResult.matchedAllergens.join(', ')}
                      </span>{' '}
                      detected in extracted menu text!
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#1C1C1C] border border-[rgba(242,240,235,0.2)] text-ink-primary">
                    <div className="font-bold text-[13px] flex items-center gap-1.5 text-ink-primary">
                      <CheckCircle2 className="w-4 h-4 text-ink-secondary" />
                      <span>STATUS: NO_MATCH_DETECTED</span>
                    </div>
                    <div className="mt-1 text-[12px] text-ink-secondary font-sans leading-relaxed">
                      No configured allergen keyword was detected in the extracted text (
                      {Math.round((ocrScanResult.confidence || 0) * 100)}% OCR confidence).
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[#0E0E0E] border border-[rgba(242,240,235,0.14)]">
                  <div className="text-[11px] text-ink-muted uppercase mb-1">
                    RAW TESSERACT EXTRACTED TEXT:
                  </div>
                  <pre className="text-[12px] font-mono text-ink-secondary whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {ocrScanResult.rawExtractedText || '[EMPTY]'}
                  </pre>
                </div>

                <div className="p-3 bg-[#121212] border border-[rgba(242,240,235,0.1)] text-[11px] text-ink-muted font-sans leading-relaxed italic">
                  "{ocrScanResult.disclaimer}"
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-ink-muted text-[12px] border border-[rgba(242,240,235,0.08)] bg-[#141414]">
                Upload a menu photo, capture via webcam, or paste menu text to run Tesseract + Levenshtein allergen screening.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[rgba(242,240,235,0.08)] mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-secondary">
            <div className="flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-ink-primary" />
              <span>"Idaralli kadalekaayi ideya?" (Kannada: Does this contain peanuts?)</span>
            </div>
            <span className="font-bold text-ink-primary">[PLAY AUDIO]</span>
          </div>
        </div>
      </div>
    </div>
  );
};
