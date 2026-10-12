import { Canvas } from "./canvas";
import { Renderer } from "./renderer";
import { ObjData, parseObj } from "./obj-parser";
import { Vector3 } from "./math";

const CLEAR_COLOR: Vector3 = [0, 0, 255];
const SECONDS_IN_MILLISECOND = 1 / 1000;

async function main(): Promise<void> {
    const app = new App();

    await app.init();

    app.run();
}

interface Camera {
    fov: number;
    zNear: number;
    zFar: number;
}

interface Entity {
    objData: ObjData
}

class App {
    private readonly _renderer: Renderer;

    private _camera: Camera;
    private _entity: Entity | null = null;

    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    public constructor() {
        const canvas = Canvas.createFullscreen();

        this._renderer = new Renderer(canvas, CLEAR_COLOR);

        this._camera = {
            fov: 1.047198, // 60 degrees
            zNear: 1,
            zFar: 100,
        };
    }

    public async init(): Promise<void> {
        this._entity = {
            objData: await this._loadModel("assets/models/f22.obj"),
        }
    }

    public run(): void {
        window.requestAnimationFrame((currentTime) => {
            this._calculateDeltaTime(currentTime);

            this._render();

            this.run();
        });
    }

    private _render(): void {
        this._renderer.startDrawing(this._camera);

        // this._renderer.drawFilledRectangle([100, 100], [100, 100], [255, 0, 0]);
        // this._renderer.drawLine([300, 300], [600, 600], [0, 255, 0]);
        // this._renderer.drawTriangle([500, 500], [750, 750], [250, 750], [255, 0, 0]);
        // this._renderer.drawFilledTriangle([800, 100], [900, 300], [800, 500], [255, 0, 0]);
        if (this._entity) {
            this._renderer.drawMesh(this._entity.objData.vertices, this._entity.objData.faces);
        }

        this._renderer.finishDrawing();
    }

    private _calculateDeltaTime(currentTime: number): void {
        this._deltaTime = (currentTime - this._previousFrameTime) * SECONDS_IN_MILLISECOND;

        this._previousFrameTime = currentTime;
    }

    private async _loadModel(path: string): Promise<ObjData> {
        const response = await fetch(path);
        const obj = await response.text();

        const objData = parseObj(obj);

        return objData;
    }
}


main();
