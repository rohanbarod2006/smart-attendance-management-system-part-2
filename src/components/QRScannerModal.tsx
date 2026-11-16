import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import { markStudentAttendance } from '../services/attendanceService.ts';
import { QrCode, X, Camera, Upload, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttendanceMarked?: () => void;
  initialSessionId?: string | null;
  initialToken?: string | null;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onAttendanceMarked,
  initialSessionId,
  initialToken,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualSessionId, setManualSessionId] = useState<string>('');
  const [manualToken, setManualToken] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<Awaited<
    ReturnType<typeof markStudentAttendance>
  > | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scanLockedRef = useRef<boolean>(false);
  const submittingRef = useRef<boolean>(false);
  const readerElementId = 'qr-camera-stream-container';

  // If initial URL parameters were passed (e.g. from a link or scan)
  useEffect(() => {
    if (isOpen) {
      scanLockedRef.current = false;
      setErrorMessage(null);
      if (initialSessionId && initialToken) {
        setManualSessionId(initialSessionId);
        setManualToken(initialToken);
        setSuccessData(null);
        setMode('manual');
      }
    }
  }, [isOpen, initialSessionId, initialToken]);

  // Handle camera start/stop
  useEffect(() => {
    if (isOpen && mode === 'camera' && !successData) {
      scanLockedRef.current = false;
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, successData]);

  const startCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);

    await new Promise((r) => setTimeout(r, 150));

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const qrCode = html5QrCodeRef.current;
      if (qrCode.isScanning) {
        return;
      }

      setIsScanning(true);
      await qrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScannedContent(decodedText);
        },
        () => {
          // ignore stream scanning frame misses
        }
      );
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        'Camera permission was denied or no camera device is available. Please use the "Upload QR" or "Manual Code" option below.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
    }
    setIsScanning(false);
  };

  const parseQRContent = (content: string): { sessionId: string; token: string } | null => {
    const trimmed = content.trim();

    // 1. Check if JSON payload
    try {
      const obj = JSON.parse(trimmed);
      if (obj.sessionId && obj.token) {
        return { sessionId: String(obj.sessionId).trim(), token: String(obj.token).trim() };
      }
    } catch {
      // Not JSON, continue to URL checks
    }

    // 2. Check if URL with search or hash query parameters (e.g. #scan?sessionId=abc&token=xyz)
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com/${trimmed}`);
      const searchParams = new URLSearchParams(url.search);
      const hashQuery = url.hash.includes('?') ? url.hash.split('?')[1] : '';
      const hashParams = new URLSearchParams(hashQuery);

      const sessionId =
        searchParams.get('sessionId') ||
        searchParams.get('session') ||
        hashParams.get('sessionId') ||
        hashParams.get('session');
      const token = searchParams.get('token') || hashParams.get('token');

      if (sessionId && token) {
        return { sessionId: sessionId.trim(), token: token.trim() };
      }
    } catch {
      // Not URL
    }

    // 3. Check simple format "sessionId:token"
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        return { sessionId: parts[0].trim(), token: parts[1].trim() };
      }
    }

    return null;
  };

  const handleScannedContent = async (decodedText: string) => {
    if (scanLockedRef.current || submittingRef.current) {
      return;
    }
    scanLockedRef.current = true;

    await stopCamera();
    const parsed = parseQRContent(decodedText);
    if (!parsed) {
      scanLockedRef.current = false;
      setErrorMessage('Unrecognized QR format. Ensure you are scanning an active attendance QR code.');
      return;
    }

    await submitAttendance(parsed.sessionId, parsed.token);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-upload-scanner-hidden');
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      const parsed = parseQRContent(result);
      if (!parsed) {
        setErrorMessage('QR code found in image, but it does not contain a valid attendance token.');
        setSubmitting(false);
        return;
      }

      await submitAttendance(parsed.sessionId, parsed.token);
    } catch {
      setErrorMessage('Could not find or read a QR code in the uploaded image. Please try a clearer screenshot.');
      setSubmitting(false);
    } finally {
      e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If student pasted full URL or JSON into the token input
    if (manualToken.includes('token=') || manualToken.trim().startsWith('{')) {
      const parsed = parseQRContent(manualToken);
      if (parsed) {
        submitAttendance(parsed.sessionId, parsed.token);
        return;
      }
    }

    if (!manualSessionId.trim() || !manualToken.trim()) {
      setErrorMessage('Both Session ID and QR Token are required.');
      return;
    }

    submitAttendance(manualSessionId.trim(), manualToken.trim());
  };

  const submitAttendance = async (sessionId: string, token: string) => {
    if (submittingRef.current) return;

    if (!user) {
      setErrorMessage('You must be signed in as a student to mark attendance.');
      scanLockedRef.current = false;
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await markStudentAttendance({ sessionId, token, student: user });
      setSuccessData(res);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#16a34a', '#3b82f6', '#10b981'],
        });
      } catch {
        // confetti fallback
      }

      if (onAttendanceMarked) {
        onAttendanceMarked();
      }
    } catch (err: any) {
      scanLockedRef.current = false;
      setErrorMessage(err.message || 'Failed to mark attendance. Please check code or try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const resetScanner = () => {
    scanLockedRef.current = false;
    submittingRef.current = false;
    setSuccessData(null);
    setErrorMessage(null);
    setManualSessionId('');
    setManualToken('');
    setMode('camera');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md transition-all border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Mark Attendance</h2>
              <p className="text-xs text-slate-500">Scan classroom QR or enter token</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Success Screen */}
          {successData ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Attendance Recorded!
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Your presence has been verified and saved in Cloud Firestore.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 mb-6">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-800">{successData.details.studentName}</span>
                </div>
                {successData.details.rollNumber && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Roll Number:</span>
                    <span className="font-semibold text-slate-800">{successData.details.rollNumber}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-semibold text-slate-800">
                    {successData.details.subjectName} ({successData.details.subjectCode})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Class:</span>
                  <span className="font-semibold text-slate-800">{successData.details.className}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Teacher:</span>
                  <span className="font-semibold text-slate-800">{successData.details.teacherName}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(successData.details.markedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Scan Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  Close &amp; View Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Submission Failed:</span> {errorMessage}
                  </div>
                </div>
              )}

              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode('camera')}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    mode === 'camera'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Camera Scan
                </button>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    mode === 'upload'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload QR
                </button>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    mode === 'manual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Manual Code
                </button>
              </div>

              {/* Mode 1: Camera Scanner */}
              {mode === 'camera' && (
                <div>
                  {cameraError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-3 space-y-2">
                      <p className="font-semibold">Camera Access Unavailable</p>
                      <p>{cameraError}</p>
                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMode('upload')}
                          className="px-3 py-1 bg-white border border-amber-300 text-amber-900 rounded-md text-xs font-medium hover:bg-amber-100"
                        >
                          Upload Screenshot
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('manual')}
                          className="px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700"
                        >
                          Enter Token Link
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-square flex items-center justify-center mb-3">
                      <div id={readerElementId} className="w-full h-full" />
                      {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                          <Camera className="w-8 h-8 mb-2 opacity-70 animate-pulse" />
                          <p className="text-xs">Initializing camera feed...</p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 text-center">
                    Point your camera at the teacher&apos;s projector screen. The QR code will be detected automatically.
                  </p>
                </div>
              )}

              {/* Mode 2: Upload QR Screenshot */}
              {mode === 'upload' && (
                <div className="text-center py-4">
                  <div id="qr-upload-scanner-hidden" className="hidden" />
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-700 mb-1">
                      Click to upload QR Code image
                    </span>
                    <span className="text-[11px] text-slate-500">
                      PNG, JPG, or screenshot from phone
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={submitting}
                      className="hidden"
                    />
                  </label>
                  {submitting && (
                    <p className="text-xs text-blue-600 mt-2 animate-pulse">
                      Analyzing QR code image and verifying attendance...
                    </p>
                  )}
                </div>
              )}

              {/* Mode 3: Manual Token or URL Entry */}
              {mode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Session ID
                    </label>
                    <input
                      type="text"
                      value={manualSessionId}
                      onChange={(e) => setManualSessionId(e.target.value)}
                      placeholder="Paste Session ID (optional if pasting full link below)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      QR Token or Complete Attendance URL
                    </label>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste 48-char token or attendance link"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Verifying...' : 'Submit Attendance'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
