import { Canvas } from "./canvas";
import { Renderer } from "./renderer";

const CLEAR_COLOR = [0, 0, 255];

function main(): void {
    const app = new App();

    app.run();
}

class App {
    private _renderer: Renderer;

    public constructor() {
        const canvas = Canvas.createFullscreen();

        this._renderer = new Renderer(canvas, CLEAR_COLOR);
    }

    public run(): void {
        window.requestAnimationFrame(() => {
            this._render();

            this.run();
        });
    }

    private _render(): void {
        this._renderer.startDrawing();

        this._renderer.drawFilledRectangle([100, 100], [100, 100], [255, 0, 0]);

        this._renderer.finishDrawing();
    }
}


main();
