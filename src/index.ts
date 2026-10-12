import { Canvas } from "./canvas";
import { Renderer } from "./renderer";
import { ObjData, parseObj } from "./obj-parser";
import { Vector3, makeTranslationMatrix, makeScaleMatrix, multiplyMatrix4s, Matrix4 } from "./math";

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

class Entity {
    public position: Vector3 = [0, 0, 0];
    public scale: Vector3 = [1, 1, 1];

    public objData: ObjData | null = null;

    public constructor(position: Vector3, scale: Vector3, objData: ObjData) {
        this.position = position;
        this.scale = scale;
        this.objData = objData;
    }

    public getModelMatrix(): Matrix4 {
        return multiplyMatrix4s(makeTranslationMatrix(this.position), makeScaleMatrix(this.scale));
    }
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
        this._entity = new Entity(
            [0, 0, 10],
            [2, 2, 2],
            await this._loadModel("assets/models/f22.obj"),
        );
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

        if (this._entity?.objData) {
            this._renderer.draw(
                this._entity.objData.vertices,
                this._entity.objData.faces,
                this._entity.getModelMatrix(),
            );
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
