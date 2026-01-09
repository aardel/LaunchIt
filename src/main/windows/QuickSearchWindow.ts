import { BrowserWindow, screen } from 'electron';
import path from 'path';

export class QuickSearchWindow {
    private window: BrowserWindow | null = null;
    private isDev: boolean;

    constructor(isDev: boolean) {
        this.isDev = isDev;
    }

    create() {
        if (this.window) return this.window;

        this.window = new BrowserWindow({
            width: 652,
            height: 400,
            show: false,
            frame: false,
            transparent: true,
            resizable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js'),
            },
        });

        if (this.isDev) {
            this.window.loadURL('http://localhost:5173/#quick-search');
            // this.window.webContents.openDevTools({ mode: 'detach' });
        } else {
            this.window.loadFile(path.join(__dirname, '../../renderer/index.html'), {
                hash: 'quick-search',
            });
        }

        this.window.on('blur', () => {
            this.hide();
        });

        return this.window;
    }

    show() {
        console.log('[QuickSearchWindow] show() called');
        if (!this.window) {
            console.log('[QuickSearchWindow] Creating window...');
            this.create();
        }

        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const windowWidth = 600;
        const windowHeight = 400;

        console.log(`[QuickSearchWindow] Setting bounds: centering on ${width}x${height}`);
        this.window?.setBounds({
            x: Math.floor((width - windowWidth) / 2),
            y: Math.floor(height / 3),
            width: windowWidth,
            height: windowHeight,
        });

        this.window?.show();
        this.window?.focus();
        console.log('[QuickSearchWindow] Window show() and focus() executed');
    }

    hide() {
        console.log('[QuickSearchWindow] hide() called');
        this.window?.hide();
    }

    toggle() {
        const isVisible = this.window?.isVisible();
        const isFocused = this.window?.isFocused();
        console.log(`[QuickSearchWindow] toggle() called. isVisible: ${isVisible}, isFocused: ${isFocused}`);

        if (isVisible && isFocused) {
            this.hide();
        } else {
            this.show();
        }
    }

    getWindow() {
        return this.window;
    }

    destroy() {
        this.window?.close();
        this.window = null;
    }
}
