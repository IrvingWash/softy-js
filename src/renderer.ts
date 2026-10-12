import { type ICanvas } from "./icanvas";

export class Renderer {
    private _canvas: ICanvas;

    public contructor(canvas: ICanvas) {
        this._canvas = canvas;
    }
}
