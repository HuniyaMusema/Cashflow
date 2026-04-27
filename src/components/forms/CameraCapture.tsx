import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Zap, FlipHorizontal, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const [ready,     setReady]     = useState(false);
  const [captured,  setCaptured]  = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash,     setFlash]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    // Stop existing stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    setReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setError(msg.includes('Permission') || msg.includes('denied')
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : 'Could not access camera. Make sure no other app is using it.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [facingMode, startCamera]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || !ready) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    // Enhance contrast for better OCR
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Slight contrast boost
      data[i]     = Math.min(255, data[i]     * 1.1);
      data[i + 1] = Math.min(255, data[i + 1] * 1.1);
      data[i + 2] = Math.min(255, data[i + 2] * 1.1);
    }
    ctx.putImageData(imageData, 0, 0);

    setCaptured(canvas.toDataURL('image/jpeg', 0.95));
    // Pause video
    streamRef.current?.getTracks().forEach(t => { t.enabled = false; });
  };

  const retake = () => {
    setCaptured(null);
    streamRef.current?.getTracks().forEach(t => { t.enabled = true; });
  };

  const confirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return toast.error('Failed to process image');
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      onClose();
    }, 'image/jpeg', 0.95);
  };

  const flipCamera = () => {
    setFacingMode(m => m === 'environment' ? 'user' : 'environment');
    setCaptured(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-indigo-400" fill="currentColor" />
          <span className="text-white text-sm font-semibold">Scan Receipt</span>
        </div>
        <button onClick={flipCamera} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white">
          <FlipHorizontal size={20} />
        </button>
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative overflow-hidden">
        {/* Flash overlay */}
        {flash && <div className="absolute inset-0 bg-white z-20 pointer-events-none" />}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
              <Camera size={28} className="text-rose-400" />
            </div>
            <p className="text-white font-semibold">{error}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Live video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                captured ? "hidden" : "block"
              )}
            />

            {/* Captured preview */}
            {captured && (
              <img src={captured} alt="Captured receipt" className="w-full h-full object-contain bg-black" />
            )}

            {/* Receipt guide overlay */}
            {!captured && ready && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] h-[70%] border-2 border-white/50 rounded-2xl relative">
                  {/* Corner markers */}
                  {[
                    'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                    'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                    'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                    'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
                  ].map((cls, i) => (
                    <div key={i} className={cn('absolute w-8 h-8 border-indigo-400', cls)} />
                  ))}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="bg-black/50 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                      Align receipt within frame
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {!ready && !error && !captured && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="px-8 py-6 bg-black/80 backdrop-blur-sm">
        {!captured ? (
          <div className="flex items-center justify-center gap-8">
            {/* Shutter button */}
            <button
              onClick={capture}
              disabled={!ready}
              className={cn(
                "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90",
                ready ? "bg-white/10 hover:bg-white/20" : "opacity-40 cursor-not-allowed"
              )}
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={retake}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all"
            >
              <RotateCcw size={18} /> Retake
            </button>
            <button
              onClick={confirm}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-900/50"
            >
              <CheckCircle size={18} /> Use Photo
            </button>
          </div>
        )}
        <p className="text-center text-white/40 text-xs mt-3">
          {captured ? 'Review your capture before proceeding' : 'Tap the button to capture the receipt'}
        </p>
      </div>
    </div>
  );
};
