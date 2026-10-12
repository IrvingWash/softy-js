import { vec2, vec3 } from "gl-matrix";

import { type ICanvas } from "./icanvas";

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
            this.drawPixel([currentX, currentY], color);

            currentX += xStep;
            currentY += yStep;
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
