import { Vector2 } from "./math";

const MAIN_CANVAS_ID = "mainCanvas";

export class Canvas {
    private _element: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;

    private _resizeObserver: ResizeObserver | null = null;
    private _resizeListeners: Set<() => void> = new Set();

    private constructor(element: HTMLCanvasElement, context: CanvasRenderingContext2D) {
        this._element = element;
        this._context = context;
    };

    public static create(width: number, height: number): Canvas {
        const element = document.querySelector<HTMLCanvasElement>(`#${MAIN_CANVAS_ID}`);
        if (element == null) {
            throw new Error("Failed to find main canvas");
        }

        element.width = width;
        element.height = height;
        element.style.position = "absolute";

        const context = element.getContext("2d");
        if (context == null) {
            throw new Error("Failed to get the 2D context");
        }

        return new Canvas(element, context);
    }

    public static createFullscreen(): Canvas {
        const dpr = window.devicePixelRatio;

        const canvas = this.create(window.innerWidth * dpr, window.innerHeight * dpr);

        canvas._element.style.width = "100%";
        canvas._element.style.height = "100%";

        canvas._resizeObserver = new ResizeObserver(canvas._onResize);
        canvas._resizeObserver.observe(canvas._element);

        return canvas;
    }

    public destroy(): void {
        this._resizeListeners.clear();

        this._resizeObserver?.disconnect();
    }

    public getPixelSize(): Vector2 {
        return [this._element.width, this._element.height];
    }

    public getContext(): CanvasRenderingContext2D {
        return this._context;
    }

    public subscribeResize(listener: () => void): void {
        this._resizeListeners.add(listener);
    }

    public unsubscribeResize(listener: () => void): void {
        this._resizeListeners.delete(listener);
    }

    private _onResize = () => {
        this._element.width = this._element.clientWidth;
        this._element.height = this._element.clientHeight;

        this._resizeListeners.forEach((listener) => listener());
    };
}
