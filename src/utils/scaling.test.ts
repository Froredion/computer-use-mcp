import {describe, it, expect} from 'vitest';
import {getApiImageSize, getSizeToApiScale} from './scaling.js';

describe('getSizeToApiScale', () => {
	it('should not scale screens already within API limits', () => {
		expect(getSizeToApiScale(1280, 720)).toBe(1);
		expect(getSizeToApiScale(1024, 768)).toBe(1);
	});

	it('should scale screens over API limits down', () => {
		expect(getSizeToApiScale(1920, 1080)).toBeLessThan(1);
		expect(getSizeToApiScale(2560, 1600)).toBeLessThan(1);
	});
});

describe('getApiImageSize', () => {
	it('should keep screens within API limits at their logical size', () => {
		// e.g. a 1920x1080 display at 150% Windows scaling, captured at 1920x1080
		expect(getApiImageSize(1280, 720)).toEqual({width: 1280, height: 720});
	});

	it('should fit large screens within API limits', () => {
		const {width, height} = getApiImageSize(2560, 1440);
		expect(Math.max(width, height)).toBeLessThanOrEqual(1568);
		expect(width * height).toBeLessThanOrEqual(1.15 * 1024 * 1024);
	});

	it('should map the far corner of the image back inside the screen', () => {
		for (const [logicalWidth, logicalHeight] of [[1280, 720], [1707, 1067], [1920, 1080], [2560, 1440], [3840, 2160], [1440, 900]] as const) {
			const {width, height} = getApiImageSize(logicalWidth, logicalHeight);
			const apiToLogical = 1 / getSizeToApiScale(logicalWidth, logicalHeight);
			expect(Math.round((width - 1) * apiToLogical)).toBeLessThan(logicalWidth);
			expect(Math.round((height - 1) * apiToLogical)).toBeLessThan(logicalHeight);
		}
	});
});
