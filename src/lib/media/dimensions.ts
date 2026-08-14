/**
 * Reads a file's real pixel dimensions client-side before upload — this is
 * what lets a feed post or message attachment size its media box to the
 * photo/clip's actual shape instead of cropping or letterboxing it into a
 * fixed one (see PostMedia.tsx / MessageBubble.tsx, and the width/height
 * columns on post_media / message_media). Originally lived only in
 * PostComposer.tsx; extracted here so RoomComposer/MessageComposer capture
 * dimensions the exact same way instead of a second, maybe-drifting copy.
 */
export function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = url;
  });
}

export function readVideoDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => resolve({ width: video.videoWidth || 16, height: video.videoHeight || 9 });
    video.onerror = () => resolve({ width: 16, height: 9 });
    video.src = url;
  });
}
