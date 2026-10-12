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

        this._frameBuffer.colors[position[1] * width + position[0]] = rgba(color);
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

    private _clearFrameBuffer() {
        this._frameBuffer.colors.fill(rgba(this._clearColor));
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

function rgba(color: vec3, a: number = 255): number {
    const [r, g, b] = color;

    return (a << 24) | (b << 16) | (g << 8) | r;
}
