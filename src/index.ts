import { Canvas } from "./canvas";
import { Camera, CullMode, RenderMode, Renderer } from "./renderer";
import { ObjData, parseObj, UVFlip } from "./obj-parser";

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

    public model: Model;

    public constructor(position: Vector3, scale: Vector3, rotation: Vector3, model: Model) {
        this.position = position;
        this.scale = scale;
        this.rotation = rotation;

        this.model = model;
    }

    public update(_deltaTime: number) {}

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

interface ModelMetadata {
    path: string;
    texturePath: string;
    scale: Vector3;
    rotation: Vector3;
    cullBackfaces: boolean;
}

interface Model {
    objData: ObjData;
    texture: ImageData;
    cullBackfaces: boolean;
}

const MODEL_CATALOG: Record<string, ModelMetadata> = {
    vikingRoom: {
        path: "assets/models/viking-room.obj",
        texturePath: "assets/models/viking-room.png",
        scale: [0.1, 0.1, 0.1] as Vector3,
        rotation: [0.4, -3.2, 0] as Vector3,
        cullBackfaces: false,
    },
    f22: {
        path: "assets/models/f22.obj",
        texturePath: "assets/models/f22.png",
        scale: [1, 1, 1] as Vector3,
        rotation: [-0.6, 0, 0] as Vector3,
        cullBackfaces: false,
    },
} as const;

const POINTER_SENSITIVITY = 0.005;

class App {
    private readonly _canvas: Canvas;
    private readonly _renderer: Renderer;

    private _camera: Camera;
    private _entity: Entity | null = null;
    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    private _isGuiVisible: boolean = true;

    private _currentModelKey: keyof typeof MODEL_CATALOG = "vikingRoom";

    private _dragState = {
        isDragging: false,
        yaw: 0,
        pitch: 0,
        lastX: 0,
        lastY: 0,
    };

    public constructor() {
        this._canvas = Canvas.createFullscreen();

        this._renderer = new Renderer(this._canvas);

        this._camera = {
            position: [0, 0, 0],
            fov: 1.047198, // 60 degrees
            zNear: 1,
            zFar: 100,
        };
    }

    public async init(): Promise<void> {
        this._entity = new Entity(
            [0, 0, 5],
            MODEL_CATALOG[this._currentModelKey].scale,
            MODEL_CATALOG[this._currentModelKey].rotation,
            await this._loadModel(MODEL_CATALOG[this._currentModelKey]),
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

        if (this._entity) {
            this._renderer.setCullMode(this._entity.model.cullBackfaces ? CullMode.BackFace : CullMode.None);

            this._renderer.draw(
                this._entity.model.objData.vertices,
                this._entity.model.objData.uvs,
                this._entity.model.objData.faces,
                this._entity.model.texture,
                this._entity.getModelTransform(),
            );
        }

        this._renderer.finishDrawing();
    }

    private _calculateDeltaTime(currentTime: number): void {
        this._deltaTime = (currentTime - this._previousFrameTime) * SECONDS_IN_MILLISECOND;

        this._previousFrameTime = currentTime;
    }

    private async _loadModel(metadata: ModelMetadata): Promise<Model> {
        const imageLoadPromise = new Promise<ImageData>(async (resolve, reject) => {
            try {
                const response = await fetch(metadata.texturePath);
                const blob = await response.blob();
                const bitmap = await createImageBitmap(blob);

                const offscreenCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                const ctx = offscreenCanvas.getContext("2d");
                if (!ctx) {
                    return reject("Failde to get offscreen canvas context");
                }

                ctx.drawImage(bitmap, 0, 0);

                resolve(ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height));
            } catch (error) {
                reject(error);
            }
        });

        const objLoadPromise = new Promise<ObjData>(async (resolve, reject) => {
            try {
                const response = await fetch(metadata.path);
                const obj = await response.text();
                const objData = parseObj(obj, UVFlip.Flipped);
                resolve(objData);
            } catch (error) {
                reject(error);
            }
        });

        const [image, objData] = await Promise.all([imageLoadPromise, objLoadPromise]);

        return {
            objData,
            texture: image,
            cullBackfaces: metadata.cullBackfaces,
        }
    }

    // @Todo: the directional light direction controls are broken now, because the values come back normalized
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

        { // Hide/unhide
            const button = document.createElement("button");
            button.style.width = "40px";
            button.innerText = "Hide";
            button.id = "hideButton";

            menuWrapper.appendChild(button);

            button.addEventListener("click", () => {
                for (const child of menuWrapper.children) {
                    if (this._isGuiVisible) {
                        if (child.id === "hideButton") {
                            button.innerText = "Show";
                            continue;
                        }

                        (child as HTMLElement).style.display = "none";
                    } else {
                        if (child.id === "hideButton") {
                            button.innerText = "Hide";
                            continue;
                        }

                        (child as HTMLElement).style.display = "flex"; // This is stupid, but looks ok for now
                    }
                }

                this._isGuiVisible = !this._isGuiVisible;
            });
        }

        { // Entity
            const entityWrapper = document.createElement("div");
            entityWrapper.style.display = "flex";
            entityWrapper.style.flexDirection = "column";
            entityWrapper.style.justifyContent = "space-between";
            entityWrapper.style.marginBottom = "20px";
            menuWrapper.appendChild(entityWrapper);

            const entityTitle = document.createElement("h3");
            entityTitle.innerText = "Entity";
            entityWrapper.appendChild(entityTitle);

            { // Model
                const modelDropdown = document.createElement("select");
                entityWrapper.appendChild(modelDropdown);

                for (const modelKey of Object.keys(MODEL_CATALOG)) {
                    const option = document.createElement("option");
                    option.value = modelKey;
                    option.innerText = modelKey;
                    
                    modelDropdown.appendChild(option);
                }

                modelDropdown.value = this._currentModelKey;

                modelDropdown.addEventListener("change", async () => {
                    this._currentModelKey = modelDropdown.value as keyof typeof MODEL_CATALOG;

                    this._entity = new Entity(
                        [0, 0, 5],
                        MODEL_CATALOG[this._currentModelKey].scale,
                        MODEL_CATALOG[this._currentModelKey].rotation,
                        await this._loadModel(MODEL_CATALOG[this._currentModelKey]),
                    );
                });
            }

            { // Help
                const helpDisplay = document.createElement("p");
                helpDisplay.style.marginTop = "10px";
                helpDisplay.innerText = "You can rotate the model by clicking and dragging";

                entityWrapper.appendChild(helpDisplay);
            }

            { // Scroll
                const canvasElement = this._canvas.getElement();

                canvasElement.addEventListener("pointerdown", (event) => {
                    canvasElement.style.cursor = "all-scroll";
                    canvasElement.setPointerCapture(event.pointerId);

                    this._dragState = {
                        ...this._dragState,
                        isDragging: true,
                        lastX: event.clientX,
                        lastY: event.clientY,
                    };
                });
                canvasElement.addEventListener("pointerup", (event) => {
                    canvasElement.style.cursor = "pointer";
                    canvasElement.releasePointerCapture(event.pointerId);

                    this._dragState.isDragging = false;
                });
                canvasElement.addEventListener("pointermove", (event) => {
                    if (!this._dragState.isDragging) {
                        return;
                    }

                    const dx = event.clientX - this._dragState.lastX;
                    const dy = event.clientY - this._dragState.lastY;
                    this._dragState.lastX = event.clientX;
                    this._dragState.lastY = event.clientY;

                    if (this._entity) {
                        this._entity.rotation = [
                            this._entity.rotation[0] + dy * POINTER_SENSITIVITY,
                            this._entity.rotation[1] - dx * POINTER_SENSITIVITY,
                            this._entity.rotation[2],
                        ];
                    }
                });
            }
        }

        { // Renderer
            const rendererWrapper = document.createElement("div");
            rendererWrapper.style.display = "flex";
            rendererWrapper.style.flexDirection = "column";
            rendererWrapper.style.justifyContent = "space-between";
            rendererWrapper.style.marginBottom = "20px";
            menuWrapper.appendChild(rendererWrapper);

            const rendererTitle = document.createElement("h3");
            rendererTitle.innerText = "Renderer";
            rendererWrapper.appendChild(rendererTitle);

            { // Clear color
                const clearColorWrapper = document.createElement("div");
                clearColorWrapper.style.display = "flex";
                clearColorWrapper.style.justifyContent = "space-between";
                clearColorWrapper.style.margin = menuItemWrapperMargin;
                rendererWrapper.appendChild(clearColorWrapper);

                const clearColorLabel = document.createElement("label");
                clearColorLabel.innerText = "Clear color"
                clearColorWrapper.appendChild(clearColorLabel);

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

            { // Render mode
                const renderModeWrapper = document.createElement("div");
                renderModeWrapper.style.display = "flex";
                renderModeWrapper.style.justifyContent = "space-between";
                renderModeWrapper.style.margin = menuItemWrapperMargin;
                rendererWrapper.appendChild(renderModeWrapper);

                const renderModeLabel = document.createElement("label");
                renderModeLabel.innerText = "Render mode"
                renderModeWrapper.appendChild(renderModeLabel);

                const renderModeDropDown = document.createElement("select");
                renderModeWrapper.appendChild(renderModeDropDown);

                for (const variant of Object.values(RenderMode)) {
                    const option = document.createElement("option");
                    option.value = variant;
                    option.innerText = variant;
                    
                    renderModeDropDown.appendChild(option);
                }

                renderModeDropDown.value = this._renderer.getRenderMode();

                renderModeDropDown.addEventListener("change", () => this._renderer.setRenderMode(renderModeDropDown.value as RenderMode));
            }

            { // Cull mode
                const cullModeWrapper = document.createElement("div");
                cullModeWrapper.style.display = "flex";
                cullModeWrapper.style.justifyContent = "space-between";
                cullModeWrapper.style.margin = menuItemWrapperMargin;
                rendererWrapper.appendChild(cullModeWrapper);

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

            { // Depth testing
                const depthTestingWrapper = document.createElement("div");
                depthTestingWrapper.style.display = "flex";
                depthTestingWrapper.style.justifyContent = "space-between";
                depthTestingWrapper.style.margin = menuItemWrapperMargin;
                rendererWrapper.appendChild(depthTestingWrapper);

                const cullModeLabel = document.createElement("label");
                cullModeLabel.innerText = "Depth testing"
                depthTestingWrapper.appendChild(cullModeLabel);

                const depthTestingCheckbox = document.createElement("input");
                depthTestingCheckbox.type = "checkbox";
                depthTestingWrapper.appendChild(depthTestingCheckbox);

                depthTestingCheckbox.checked = this._renderer.getDepthTesting();

                depthTestingCheckbox.addEventListener(
                    "change",
                    () => {
                        this._renderer.setDepthTesting(depthTestingCheckbox.checked)
                    }
                );
            }

            { // Directional Light
                const directionalLightWrapper = document.createElement("div");
                directionalLightWrapper.style.display = "flex";
                directionalLightWrapper.style.justifyContent = "space-between";
                directionalLightWrapper.style.margin = menuItemWrapperMargin;
                rendererWrapper.appendChild(directionalLightWrapper);

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

        { // FPS
            const fpsDisplay = document.createElement("p");
            fpsDisplay.innerText = "FPS: 0";

            setInterval(() => fpsDisplay.innerText = `FPS: ${Math.round(1 / this._deltaTime)}`, 1000);

            menuWrapper.appendChild(fpsDisplay);
        }
    }
}


main();
