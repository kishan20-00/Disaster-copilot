import { useEffect, useRef } from 'react';

// Manages the rear-camera stream for AR mode: starts it when `cameraMode` turns
// on, stops all tracks when it turns off, and cleans up on unmount (so the
// camera never stays live after the view goes away).
export function useARCamera(cameraMode: boolean, setCameraMode: (on: boolean) => void) {
  const cameraRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!cameraMode) {
      const el = cameraRef.current;
      if (el?.srcObject) {
        (el.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        el.srcObject = null;
      }
      return;
    }

    // Track the acquired stream locally so cleanup can stop it without reading
    // the ref (whose value may have changed by cleanup time).
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => {
        stream = s;
        if (cancelled) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        if (cameraRef.current) {
          cameraRef.current.srcObject = s;
          cameraRef.current.play().catch(() => {});
        }
      })
      .catch(err => {
        console.warn('Camera access denied', err);
        setCameraMode(false);
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [cameraMode, setCameraMode]);

  return cameraRef;
}
