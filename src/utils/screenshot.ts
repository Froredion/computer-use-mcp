import {screen, imageToJimp} from '@nut-tree-fork/nut-js';
import {execFileSync} from 'node:child_process';
import {readFileSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Jimp from 'jimp';

type JimpImage = ReturnType<typeof imageToJimp>;

type Fallback = {
	name: string;
	/** Write a PNG of the primary display to `outPath`. */
	capture: (outPath: string) => void;
	/** Appended to the error when both nut-js and the fallback fail. */
	hint?: string;
};

/**
 * Captures the primary display with System.Drawing. The process is made DPI-aware first so the
 * capture is at physical resolution (matching nut-js) rather than the DPI-virtualized size.
 * The output path comes in through an environment variable so it never needs escaping.
 */
const windowsCaptureScript = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace ComputerUseMcp -Name Dpi -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[void][ComputerUseMcp.Dpi]::SetProcessDPIAware()
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
	$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
	$bitmap.Save($env:COMPUTER_USE_MCP_SCREENSHOT_PATH, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
	$graphics.Dispose()
	$bitmap.Dispose()
}
`;

function windowsPowerShellPath(): string {
	// MCP clients sometimes launch servers with a minimal PATH, so don't rely on it
	const systemRoot = process.env.SystemRoot ?? process.env.windir ?? 'C:\\Windows';
	return join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

const fallbacks: Partial<Record<NodeJS.Platform, Fallback>> = {
	// e.g. on macOS 26+ where CGDisplayCreateImageForRect was removed
	darwin: {
		name: 'screencapture',
		capture(outPath) {
			execFileSync('screencapture', ['-x', outPath]);
		},
	},
	win32: {
		name: 'PowerShell',
		capture(outPath) {
			execFileSync(windowsPowerShellPath(), [
				'-NoProfile',
				'-NonInteractive',
				'-ExecutionPolicy',
				'Bypass',
				'-EncodedCommand',
				Buffer.from(windowsCaptureScript, 'utf16le').toString('base64'),
			], {
				env: {...process.env, COMPUTER_USE_MCP_SCREENSHOT_PATH: outPath},
				stdio: ['ignore', 'ignore', 'pipe'],
				timeout: 30_000,
				windowsHide: true,
			});
		},
		hint: 'Windows can only capture an unlocked, visible desktop: screenshots fail while the screen is locked, a UAC prompt is showing, or a Remote Desktop session is minimized or disconnected.',
	},
};

function errorMessage(error: unknown): string {
	let message: string;
	if (error instanceof Error) {
		// execFileSync errors carry the child's stderr, which has the useful part
		const stderr = (error as {stderr?: Buffer | string}).stderr?.toString().trim();
		message = stderr ? `${error.message}: ${stderr}` : error.message;
	} else {
		// nut-js rejects with plain strings
		message = String(error);
	}

	return message.replace(/\.$/, '');
}

async function captureWithFallback(fallback: Fallback): Promise<JimpImage> {
	const outPath = join(tmpdir(), `computer-use-mcp-${process.pid}-${Date.now()}.png`);
	try {
		fallback.capture(outPath);
		return (await Jimp.read(readFileSync(outPath))) as unknown as JimpImage;
	} finally {
		try {
			unlinkSync(outPath);
		} catch {
			/* ignore cleanup errors */
		}
	}
}

/**
 * Grab the primary display, falling back to a platform-native capture tool if nut-js fails.
 * The image may be at physical resolution (Retina, Windows display scaling), so callers should
 * resize it into their own coordinate space rather than assume it matches the logical size.
 */
export async function grabScreen(): Promise<JimpImage> {
	let nutError: unknown;
	try {
		return imageToJimp(await screen.grab());
	} catch (error) {
		nutError = error;
	}

	const fallback = fallbacks[process.platform];
	if (!fallback) {
		throw new Error(`Failed to take screenshot: ${errorMessage(nutError)}`);
	}

	try {
		return await captureWithFallback(fallback);
	} catch (fallbackError) {
		throw new Error([
			'Failed to take screenshot.',
			`nut-js: ${errorMessage(nutError)}.`,
			`${fallback.name} fallback: ${errorMessage(fallbackError)}.`,
			fallback.hint,
		].filter(Boolean).join(' '));
	}
}
