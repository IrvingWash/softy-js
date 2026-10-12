import { Canvas } from "./canvas";
import { Renderer } from "./renderer";

const CLEAR_COLOR = [0, 0, 255];
const SECONDS_IN_MILLISECOND = 1 / 1000;

function main(): void {
    const app = new App();

    app.run();
}

class App {
    private readonly _renderer: Renderer;
    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    public constructor() {
        const canvas = Canvas.createFullscreen();

        this._renderer = new Renderer(canvas, CLEAR_COLOR);
    }

    public run(): void {
        window.requestAnimationFrame((currentTime) => {
            this._calculateDeltaTime(currentTime);

            this._render();

            this.run();
        });
    }

    private _render(): void {
        this._renderer.startDrawing();

        this._renderer.drawFilledRectangle([100, 100], [100, 100], [255, 0, 0]);
        this._renderer.drawLine([300, 300], [600, 600], [0, 255, 0]);
        this._renderer.drawTriangle([500, 500], [750, 750], [250, 750], [255, 0, 0]);
        this._renderer.drawFilledTriangle([800, 100], [900, 300], [800, 500], [255, 0, 0]);

        this._renderer.finishDrawing();
    }

    private _calculateDeltaTime(currentTime: number): void {
        this._deltaTime = (currentTime - this._previousFrameTime) * SECONDS_IN_MILLISECOND;

        this._previousFrameTime = currentTime;
    }
}


main();
