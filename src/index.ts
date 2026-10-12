import { Canvas } from "./canvas";
import { PolygonMode, Renderer } from "./renderer";
import { ObjData, parseObj } from "./obj-parser";

import {
    Vector3,
    makeTranslationMatrix,
    makeScaleMatrix,
    multiplyMatrix4s,
    Matrix4,
    makeRotationAroundXMatrix,
    makeRotationAroundYMatrix,
    makeRotationAroundZMatrix,
} from "./math";

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
    public rotation: Vector3 = [0, 0, 0];

    public objData: ObjData | null = null;

    public constructor(position: Vector3, scale: Vector3, rotation: Vector3, objData: ObjData | null) {
        this.position = position;
        this.scale = scale;
        this.rotation = rotation;

        this.objData = objData;
    }

    public update(deltaTime: number) {
        this.rotation[0] += deltaTime;
        this.rotation[1] += deltaTime;
        this.rotation[2] += deltaTime;
    }

    public getModelTransform(): Matrix4 {
        const translation = makeTranslationMatrix(this.position);
        const scale = makeScaleMatrix(this.scale);
        const rotationX = makeRotationAroundXMatrix(this.rotation[0]);
        const rotationY = makeRotationAroundYMatrix(this.rotation[1]);
        const rotationZ = makeRotationAroundZMatrix(this.rotation[2]);

        const rotation = multiplyMatrix4s(rotationY, multiplyMatrix4s(rotationX, rotationZ));

        return multiplyMatrix4s(translation, multiplyMatrix4s(rotation, scale));
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

        this._createGui();
    }

    private _createGui() {
        const menuWrapper = document.createElement("div");
        menuWrapper.style.zIndex = "999";
        menuWrapper.style.position = "absolute";
        menuWrapper.style.backgroundColor = "white";
        menuWrapper.style.margin = "5px";
        menuWrapper.style.padding = "5px";
        document.body.appendChild(menuWrapper);

        const polygonModeLabel = document.createElement("label");
        polygonModeLabel.innerText = "Polygon mode"
        polygonModeLabel.style.marginRight = "5px";
        menuWrapper.appendChild(polygonModeLabel);

        const polygonModeDropDown = document.createElement("select");
        menuWrapper.appendChild(polygonModeDropDown);

        for (const variant of Object.values(PolygonMode)) {
            const option = document.createElement("option");
            option.value = variant;
            option.innerText = variant;
            
            polygonModeDropDown.appendChild(option);
        }

        polygonModeDropDown.value = this._renderer.getPolygonMode();

        polygonModeDropDown.addEventListener("change", () => this._renderer.setPolygonMode(polygonModeDropDown.value as PolygonMode));
    }

    public async init(): Promise<void> {
        this._entity = new Entity(
            [0, 0, 10],
            [2, 2, 2],
            [0, 0, 0],
            await this._loadModel("assets/models/f22.obj"),
        );
    }

    public run(): void {
        window.requestAnimationFrame((currentTime) => {
            this._calculateDeltaTime(currentTime);

            this._update();
            this._render();

            this.run();
        });
    }

    private _update(): void {
        this._entity?.update(this._deltaTime);
    }

    private _render(): void {
        this._renderer.startDrawing(this._camera);

        if (this._entity?.objData) {
            this._renderer.draw(
                this._entity.objData.vertices,
                this._entity.objData.faces,
                this._entity.getModelTransform(),
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
