// The Claude API automatically downsamples images larger than ~1.15MP or 1568px on the long edge.
// We already downsampled screenshots to fit these limits and reported the original screen
// dimensions via display_width_px/display_height_px, but Claude wasn't correctly using those
// reported dimensions - it was using coordinates from the downsampled image space directly.
// As a workaround, we now report the actual image dimensions and scale Claude's coordinates
// back up to logical screen coordinates.
// See: https://docs.anthropic.com/en/docs/build-with-claude/vision#evaluate-image-size
const maxLongEdge = 1568;
const maxPixels = 1.15 * 1024 * 1024; // 1.15 megapixels

/**
 * Calculate the scale factor to downsample an image to fit API limits.
 * Returns a value <= 1 representing how much to shrink the image.
 */
export function getSizeToApiScale(width: number, height: number): number {
	const longEdge = Math.max(width, height);
	const totalPixels = width * height;

	const longEdgeScale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
	const pixelScale = totalPixels > maxPixels ? Math.sqrt(maxPixels / totalPixels) : 1;

	return Math.min(longEdgeScale, pixelScale);
}

/**
 * The size screenshots are sent at, derived from the logical screen size.
 *
 * This must come from the logical size, not the captured image: captures are often at physical
 * resolution, and when the logical size already fits API limits but the physical one doesn't
 * (e.g. a 1920x1080 display at 150% Windows scaling is 1280x720 logical), sizing from the capture
 * would produce an image whose coordinates don't match the ones we scale clicks back up from.
 */
export function getApiImageSize(logicalWidth: number, logicalHeight: number): {width: number; height: number} {
	const scale = getSizeToApiScale(logicalWidth, logicalHeight);
	return {
		width: Math.floor(logicalWidth * scale),
		height: Math.floor(logicalHeight * scale),
	};
}
