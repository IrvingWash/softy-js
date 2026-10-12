import { vec3 } from "gl-matrix";
import { type ICanvas } from "./icanvas";

interface FrameBuffer {
    image: ImageData;
    colorBuffer: Uint32Array;
}

export class Renderer {
    private _canvas: ICanvas;
    private _frameBuffer: FrameBuffer;
    private _clearColor: vec3 = [0, 0, 0];

    public constructor(canvas: ICanvas, clearColor: vec3 = [0, 0, 0]) {
        this._canvas = canvas;
        this._frameBuffer = this._createFrameBuffer();
        this._clearColor = clearColor;
    }

    public renderFrame(): void {
        const ctx = this._canvas.getContext();

        this._clearFrameBuffer();

        ctx.putImageData(this._frameBuffer.image, 0, 0);
    }

    private _clearFrameBuffer() {
        this._frameBuffer.colorBuffer.fill(rgba(this._clearColor[0], this._clearColor[1], this._clearColor[2]));
    }

    private _createFrameBuffer(): FrameBuffer {
        const ctx = this._canvas.getContext();

        const [width, height] = this._canvas.getPixelSize();

        const image = ctx.createImageData(width, height);
        const colorBuffer = new Uint32Array(image.data.buffer);

        return {
            image,
            colorBuffer,
        };
    }
}

function rgba(r: number, g: number, b: number, a = 255) {
  return (a << 24) | (b << 16) | (g << 8) | r;
}
