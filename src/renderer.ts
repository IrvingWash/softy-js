import { vec2, vec3 } from "gl-matrix";

interface ICanvas {
    getPixelSize(): vec2;
    getContext(): CanvasRenderingContext2D;
}

interface FrameBuffer {
    image: ImageData;
    colors: Uint32Array;
}

export class Renderer {
    private _canvas: ICanvas;
    private _cachedCanvasSize: vec2;

    private _frameBuffer: FrameBuffer;
    private _clearColor: vec3 = [0, 0, 0];

    public constructor(canvas: ICanvas, clearColor: vec3 = [0, 0, 0]) {
        this._canvas = canvas;
        this._cachedCanvasSize = this._canvas.getPixelSize();

        this._frameBuffer = this._createFrameBuffer();
        this._clearColor = clearColor;
    }

    public startDrawing(): void {
        this._clearFrameBuffer();
    }

    public finishDrawing(): void {
        const ctx = this._canvas.getContext();

        ctx.putImageData(this._frameBuffer.image, 0, 0);
    }

    public drawPixel(position: vec2, color: vec3): void {
        const [width] = this._cachedCanvasSize;

        this._frameBuffer.colors[position[1] * width + position[0]] = toCanvasColorFormat(color);
    }

    public drawFilledRectangle(position: vec2, size: vec2, color: vec3): void {
        const [x, y] = position;
        const [width, height] = size;

        for (let w = 0; w < width; w++) {
            for (let h = 0; h < height; h++) {
                this.drawPixel([x + w, y + h], color);
            }
        }
    }

    public drawLine(start: vec2, end: vec2, color: vec3): void {
        const [startX, startY] = start;
        const [endX, endY] = end;

        const deltaX = endX - startX;
        const deltaY = endY - startY;

        const longestSideLength = Math.abs(deltaX) >= Math.abs(deltaY)
            ? Math.abs(deltaX)
            : Math.abs(deltaY);

        const xStep = deltaX / longestSideLength;
        const yStep = deltaY / longestSideLength;

        let currentX = startX;
        let currentY = startY;

        for (let i = 0; i <= longestSideLength; i++) {
            this.drawPixel([Math.round(currentX), Math.round(currentY)], color);

            currentX += xStep;
            currentY += yStep;
        }
    }

    public drawTriangle(
        vertex1: vec2,
        vertex2: vec2,
        vertex3: vec2,
        color: vec3,
    ): void {
        this.drawLine(vertex1, vertex2, color);
        this.drawLine(vertex2, vertex3, color);
        this.drawLine(vertex3, vertex1, color);
    }

    public drawFilledTriangle(
        vertex1: vec2,
        vertex2: vec2,
        vertex3: vec2,
        color: vec3,
    ): void {
        let [x0, y0] = vertex1;
        let [x1, y1] = vertex2;
        let [x2, y2] = vertex3;

        // Sort vertices so y0 is always the the top one, y1 is always the middle one, y2 is always the bottom one.
        // We need to know exactly where each vertex is vertically.
        if (y0 > y1) {
            [y0, y1] = [y1, y0];
            [x0, x1] = [x1, x0];
        }
        if (y1 > y2) {
            [y1, y2] = [y2, y1];
            [x1, x2] = [x2, x1];
        }
        if (y0 > y1) {
            [y0, y1] = [y1, y0];
            [x0, x1] = [x1, x0];
        }

        // The triangle is already flat-bottom
        if (y1 == y2) {
            this._drawFlatBottomTriangle(x0, y0, x1, y1, x2, y2, color);
            return;
        }

        // The triangle is already flat-top
        if (y0 == y1) {
            this._drawFlatTopTriangle(x0, y0, x1, y1, x2, y2, color);
            return;
        }


        // Find the other end of the middle separator (M) (the first end is x1 y1)
        const My = y1;
        const Mx = (x2 - x0) * (y1 - y0) / (y2 - y0) + x0;

        this._drawFlatBottomTriangle(x0, y0, x1, y1, Mx, My, color);

        this._drawFlatTopTriangle(x1, y1, Mx, My, x2, y2, color);
    }

    private _drawFlatBottomTriangle(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: vec3,
    ): void {
        if (y1 - y0 == 0 || y2 - y0 == 0) {
            return;
        }

        const inverseSlope1 = (x1 - x0) / (y1 - y0);
        const inverseSlope2 = (x2 - x0) / (y2 - y0);

        let startX = x0;
        let endX = x0;

        for (let y = y0; y <= y2; y++) {
            this.drawLine([startX, y], [endX, y], color);

            startX += inverseSlope1;
            endX += inverseSlope2;
        }
    }

    private _drawFlatTopTriangle(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: vec3,
    ): void {
        if (y2 - y0 == 0 || y2 - y1 == 0) {
            return;
        }

        const inverseSlope1 = (x2 - x0) / (y2 - y0);
        const inverseSlope2 = (x2 - x1) / (y2 - y1);

        let startX = x2;
        let endX = x2;

        for (let y = y2; y >= y0; y--) {
            this.drawLine([startX, y], [endX, y], color);

            startX -= inverseSlope1;
            endX -= inverseSlope2;
        }
    }

    private _clearFrameBuffer(): void {
        this._frameBuffer.colors.fill(toCanvasColorFormat(this._clearColor));
    }

    private _createFrameBuffer(): FrameBuffer {
        const ctx = this._canvas.getContext();

        const [width, height] = this._cachedCanvasSize;

        const image = ctx.createImageData(width, height);
        const colorBuffer = new Uint32Array(image.data.buffer);

        return {
            image,
            colors: colorBuffer,
        };
    }
}

// RGBA to AABBGGRR
function toCanvasColorFormat(color: vec3, a: number = 255): number {
    const [r, g, b] = color;

    return (a << 24) | (b << 16) | (g << 8) | r;
}
