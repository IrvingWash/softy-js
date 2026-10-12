import { vec2 } from "gl-matrix";

export interface ICanvas {
    getPixelSize(): vec2;
    getContext(): CanvasRenderingContext2D;
}
