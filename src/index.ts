import { Canvas } from "./canvas";
import { Camera, CullMode, PolygonMode, Renderer } from "./renderer";
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

const SECONDS_IN_MILLISECOND = 1 / 1000;

async function main(): Promise<void> {
    const app = new App();

    await app.init();

    app.run();
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
        this.rotation[0] += 0.25 * deltaTime;
        this.rotation[1] += 0.25 * deltaTime;
        this.rotation[2] += 0.25 * deltaTime;
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

const CLEAR_COLOR: Vector3 = [135, 206, 235];
const SUN_COLOR: Vector3 = [255, 255, 255];
const SUN_DIRECTION: Vector3 = [0, 0, 1];

class App {
    private readonly _renderer: Renderer;

    private _camera: Camera;
    private _entity: Entity | null = null;
    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    private _isGuiVisible: boolean = true;

    public constructor() {
        const canvas = Canvas.createFullscreen();

        this._renderer = new Renderer(canvas);

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
            [0, 0, 0],
            await this._loadModel("assets/models/f22.obj"),
        );

        this._renderer.setClearColor(CLEAR_COLOR);

        this._renderer.setDirectionalLight({
            color: SUN_COLOR,
            direction: SUN_DIRECTION,
        });

        this._createGui();
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

    private _createGui() { // This is a dumpster...
        const menuWrapper = document.createElement("div");
        menuWrapper.style.zIndex = "999";
        menuWrapper.style.position = "absolute";
        menuWrapper.style.backgroundColor = "white";
        menuWrapper.style.margin = "5px";
        menuWrapper.style.padding = "5px";
        menuWrapper.style.display = "flex";
        menuWrapper.style.flexDirection = "column";
        document.body.appendChild(menuWrapper);

        const menuItemWrapperMargin = "0 0 5px 0";

        { // Const hide/unhide
            const button = document.createElement("button");
            button.style.width = "40px";
            button.innerText = "Hide";
            button.id = "hideButton";

            menuWrapper.appendChild(button);

            button.addEventListener("click", () => {
                for (const child of menuWrapper.children) {
                    if (this._isGuiVisible) {
                        if (child.id == "hideButton") {
                            continue;
                        }

                        button.innerText = "Show";
                        child.style.display = "none";
                    } else {
                        child.style.display = "flex"; // This is stupid, but looks ok for now
                    }
                }

                this._isGuiVisible = !this._isGuiVisible;
            });
        }

        { // Clear color
            const clearColorWrapper = document.createElement("div");
            clearColorWrapper.style.display = "flex";
            clearColorWrapper.style.justifyContent = "space-between";
            clearColorWrapper.style.margin = menuItemWrapperMargin;
            menuWrapper.appendChild(clearColorWrapper);

            const clearColorLabel = document.createElement("label");
            clearColorLabel.innerText = "Clear color"
            clearColorWrapper.appendChild(clearColorLabel);

            console.log(this._renderer.getClearColor());
            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = "#" + this._renderer.getClearColor()
                .map(c => Math.round(c).toString(16).padStart(2, "0"))
                .join("");
            clearColorWrapper.appendChild(colorInput);

            colorInput.addEventListener("input", () => this._renderer.setClearColor([
                parseInt(colorInput.value.slice(1, 3), 16),
                parseInt(colorInput.value.slice(3, 5), 16),
                parseInt(colorInput.value.slice(5, 7), 16),
            ]));
        }

        { // Polygon mode
            const polygonModeWrapper = document.createElement("div");
            polygonModeWrapper.style.display = "flex";
            polygonModeWrapper.style.justifyContent = "space-between";
            polygonModeWrapper.style.margin = menuItemWrapperMargin;
            menuWrapper.appendChild(polygonModeWrapper);

            const polygonModeLabel = document.createElement("label");
            polygonModeLabel.innerText = "Polygon mode"
            polygonModeWrapper.appendChild(polygonModeLabel);

            const polygonModeDropDown = document.createElement("select");
            polygonModeWrapper.appendChild(polygonModeDropDown);

            for (const variant of Object.values(PolygonMode)) {
                const option = document.createElement("option");
                option.value = variant;
                option.innerText = variant;
                
                polygonModeDropDown.appendChild(option);
            }

            polygonModeDropDown.value = this._renderer.getPolygonMode();

            polygonModeDropDown.addEventListener("change", () => this._renderer.setPolygonMode(polygonModeDropDown.value as PolygonMode));
        }

        { // Cull mode
            const cullModeWrapper = document.createElement("div");
            cullModeWrapper.style.display = "flex";
            cullModeWrapper.style.justifyContent = "space-between";
            cullModeWrapper.style.margin = menuItemWrapperMargin;
            menuWrapper.appendChild(cullModeWrapper);

            const cullModeLabel = document.createElement("label");
            cullModeLabel.innerText = "Cull mode"
            cullModeWrapper.appendChild(cullModeLabel);

            const cullModeDropDown = document.createElement("select");
            cullModeWrapper.appendChild(cullModeDropDown);

            for (const variant of Object.values(CullMode)) {
                const option = document.createElement("option");
                option.value = variant;
                option.innerText = variant;

                cullModeDropDown.appendChild(option);
            }

            cullModeDropDown.value = this._renderer.getCullMode();

            cullModeDropDown.addEventListener("change", () => this._renderer.setCullMode(cullModeDropDown.value as CullMode));
        }

        { // Directional Light
            const directionalLightWrapper = document.createElement("div");
            directionalLightWrapper.style.display = "flex";
            directionalLightWrapper.style.justifyContent = "space-between";
            directionalLightWrapper.style.margin = menuItemWrapperMargin;
            menuWrapper.appendChild(directionalLightWrapper);

            const directionalLightLabel = document.createElement("label");
            directionalLightLabel.innerText = "Directional light";
            directionalLightWrapper.appendChild(directionalLightLabel);

            { // Color
                const colorInput = document.createElement("input");
                colorInput.type = "color";
                colorInput.value = "#" + (this._renderer.getDirectionalLight()?.color ?? SUN_COLOR)
                    .map(c => Math.round(c).toString(16).padStart(2, "0"))
                    .join("");
                directionalLightWrapper.appendChild(colorInput);

                colorInput.addEventListener("input", () => {
                    const currentDirection = this._renderer.getDirectionalLight()?.direction ?? SUN_DIRECTION;

                    this._renderer.setDirectionalLight(
                        {
                            direction: currentDirection,
                            color: [
                                parseInt(colorInput.value.slice(1, 3), 16),
                                parseInt(colorInput.value.slice(3, 5), 16),
                                parseInt(colorInput.value.slice(5, 7), 16),
                            ]
                        }
                    );
                });
            }

            { // Direction
                function createSlider(initialValue: number): HTMLInputElement {
                    const slider = document.createElement("input");
                    slider.value = String(initialValue);
                    slider.type = "range";
                    slider.min = "0";
                    slider.max = "1";
                    slider.step = "0.05";
                    slider.style.width = "50px";

                    return slider;
                }

                const currentDirection = this._renderer.getDirectionalLight()?.direction ?? SUN_DIRECTION;

                const xSlider = createSlider(currentDirection[0]);
                const ySlider = createSlider(currentDirection[1]);
                const zSlider = createSlider(currentDirection[2]);

                directionalLightWrapper.appendChild(xSlider);
                directionalLightWrapper.appendChild(ySlider);
                directionalLightWrapper.appendChild(zSlider);

                xSlider.addEventListener("input", () => {
                    const currentDirectionalLight = this._renderer.getDirectionalLight() ?? {
                        color: SUN_COLOR,
                        direction: SUN_DIRECTION,
                    }

                    this._renderer.setDirectionalLight(
                        {
                            color: [...currentDirectionalLight.color],
                            direction: [Number(xSlider.value), currentDirectionalLight.direction[1], currentDirectionalLight.direction[2]],
                        }
                    );
                });
                ySlider.addEventListener("input", () => {
                    const currentDirectionalLight = this._renderer.getDirectionalLight() ?? {
                        color: SUN_COLOR,
                        direction: SUN_DIRECTION,
                    }

                    this._renderer.setDirectionalLight(
                        {
                            color: [...currentDirectionalLight.color],
                            direction: [currentDirectionalLight.direction[0], Number(ySlider.value), currentDirectionalLight.direction[2]],
                        }
                    );
                });
                zSlider.addEventListener("input", () => {
                    const currentDirectionalLight = this._renderer.getDirectionalLight() ?? {
                        color: SUN_COLOR,
                        direction: SUN_DIRECTION,
                    }

                    this._renderer.setDirectionalLight(
                        {
                            color: [...currentDirectionalLight.color],
                            direction: [currentDirectionalLight.direction[0], currentDirectionalLight.direction[1], Number(zSlider.value)],
                        }
                    );
                });
            }
        }
    }
}


main();
