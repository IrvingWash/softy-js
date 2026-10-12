const mainCanvasId = "mainCanvas";

export class Canvas {
    private _element: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;

    private constructor(element: HTMLCanvasElement, context: CanvasRenderingContext2D) {
        this._element = element;
        this._context = context;
    };

    public static createFullscreen(): Canvas {
        const dpr = window.devicePixelRatio;

        return this.create(window.innerWidth * dpr, window.innerHeight * dpr);
    }

    public static create(width: number, height: number): Canvas {
        const element = document.querySelector<HTMLCanvasElement>(`#${mainCanvasId}`);
        if (element == null) {
            throw new Error("Failed to find main canvas");
        }

        element.width = width;
        element.height = height;

        const context = element.getContext("2d");
        if (context == null) {
            throw new Error("Failed to get the 2D context");
        }

        return new Canvas(element, context);
    }
}
