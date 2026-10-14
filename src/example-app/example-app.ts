import { Canvas } from "../canvas";
import { CullMode, RenderMode, Renderer } from "../renderer";
import { ObjData, parseObj, parseMtl, UVFlip, MtlData } from "../obj-parser";

import {
    Vector2,
    Vector3,
    makeTranslationMatrix,
    makeScaleMatrix,
    multiplyMatrix4s,
    Matrix4,
    makeRotationAroundXMatrix,
    makeRotationAroundYMatrix,
    makeRotationAroundZMatrix,
    degreesToRadians,
} from "../math";

import { GUI } from "./gui";

interface ModelMetadata {
    path: string;
    texturePath: string | null;
    position: Vector3;
    scale: Vector3;
    rotation: Vector3;
    mtlPath: string | null;
}

interface Model {
    objData: ObjData;
    texture: ImageData | null;
}

const SECONDS_IN_MILLISECOND = 1 / 1000;
const CLEAR_COLOR: Vector3 = [135, 206, 235];
const SUN_COLOR: Vector3 = [255, 235, 235];
const SUN_DIRECTION: Vector3 = [0, 1, 1];
const MAX_CAMERA_PITCH = degreesToRadians(90 - 0.1);
const CAMERA_SENSITIVITY = 0.005;

const MODEL_CATALOG: Record<string, ModelMetadata> = {
    vikingRoom: {
        path: "assets/models/viking-room.obj",
        texturePath: "assets/models/viking-room.png",
        position: [0, 0, 5],
        scale: [0.1, 0.1, 0.1],
        rotation: [0.4, -3.2, 0],
        mtlPath: null,
    },
    f22: {
        path: "assets/models/f22.obj",
        texturePath: "assets/models/f22.png",
        position: [0, 0, 5],
        scale: [1, 1, 1],
        rotation: [-0.6, 0, 0],
        mtlPath: null,
    },
    gundam: {
        path: "assets/models/gundam.obj",
        texturePath: null,
        position: [0, 0, 5],
        scale: [1, 1, 1],
        rotation: [0, 0, 0],
        mtlPath: "assets/models/gundam.mtl",
    },
} as const;

export class ExampleApp {
    private readonly _canvas: Canvas;
    private readonly _renderer: Renderer;

    private _camera: Camera;
    private _entities: Entity[] = [];
    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    private _currentModelKey: keyof typeof MODEL_CATALOG = "vikingRoom";

    private _paused: boolean = false;

    private readonly _gui: GUI;

    public constructor() {
        this._canvas = Canvas.createFullscreen();

        this._renderer = new Renderer(this._canvas);
        this._camera = new Camera();

        this._gui = new GUI(
            this._canvas,
            Object.keys(MODEL_CATALOG),
            this._currentModelKey,
            this._createEntity,
            (tint: Vector3) => { this._entities[0].tint = tint },
            (color: Vector3) => { this._renderer.setClearColor(color) },
            Object.values(RenderMode),
            (mode: string) => { this._renderer.setRenderMode(mode as RenderMode) },
            Object.values(CullMode),
            (mode: string) => { this._renderer.setCullMode(mode as CullMode) },
            (enabled: boolean) => { this._renderer.setDepthTesting(enabled) },
            (color: Vector3) => {
                const previous = this._renderer.getDirectionalLight();

                const toSet = previous !== null
                    ? { ...previous, color: color }
                    : {
                        direction: SUN_DIRECTION,
                        color,
                        normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
                    };

                this._renderer.setDirectionalLight(toSet);
            },
            (x: number) => {
                const previous = this._renderer.getDirectionalLight();

                const toSet = previous !== null
                    ? { ...previous, direction: [x, previous.direction[1], previous.direction[2]] as Vector3 }
                    : {
                        color: SUN_COLOR,
                        direction: [x, SUN_DIRECTION[1], SUN_DIRECTION[2]] as Vector3,
                        normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
                    };

                this._renderer.setDirectionalLight(toSet);
            },
            (y: number) => {
                const previous = this._renderer.getDirectionalLight();

                const toSet = previous !== null
                    ? { ...previous, direction: [previous.direction[0], y, previous.direction[2]] as Vector3 }
                    : {
                        color: SUN_COLOR,
                        direction: [SUN_DIRECTION[0], y,SUN_DIRECTION[2]] as Vector3,
                        normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
                    };

                this._renderer.setDirectionalLight(toSet);
            },
            (z: number) => {
                const previous = this._renderer.getDirectionalLight();

                const toSet = previous !== null
                    ? { ...previous, direction: [previous.direction[0], previous.direction[1], z] as Vector3 }
                    : {
                        color: SUN_COLOR,
                        direction: [SUN_DIRECTION[0], SUN_DIRECTION[1], z] as Vector3,
                        normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
                    };

                this._renderer.setDirectionalLight(toSet);
            },
        );
    }

    public async init(): Promise<void> {
        await this._createEntity(this._currentModelKey);

        this._camera.target = this._entities[0].position;

        this._renderer.setClearColor(CLEAR_COLOR);

        this._renderer.setDirectionalLight({
            color: SUN_COLOR,
            direction: SUN_DIRECTION,
            normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
        });
    }

    public run(): void {
        window.requestAnimationFrame((currentTime) => {
            this._calculateDeltaTime(currentTime);

            this._update();
            this._render();

            this.run();
        });
    }

    private _createEntity = async (modelName: string): Promise<void> => {
        this._currentModelKey = modelName;

        this._paused = true;
        this._gui.showLoadingText(this._renderer.getClearColor());

        const model = await this._loadModel(MODEL_CATALOG[this._currentModelKey]);

        this._paused = false;
        this._gui.hideLoadingText();

        this._entities[0] = new Entity(
            MODEL_CATALOG[this._currentModelKey].position,
            MODEL_CATALOG[this._currentModelKey].scale,
            MODEL_CATALOG[this._currentModelKey].rotation,
            model,
        );
    }

    private _update(): void {
        this._gui.update(
            this._entities[0].tint,
            this._renderer.getClearColor(),
            this._renderer.getDepthTesting(),
            this._renderer.getDirectionalLight()?.color ?? [255, 255, 255],
            this._renderer.getDirectionalLight()?.direction ?? SUN_DIRECTION,
        );

        this._camera.update(this._gui.consumeDragState().delta);

        this._entities.forEach((entity) => entity.update(this._deltaTime));
    }

    private _render(): void {
        this._renderer.startDrawing(this._camera);

        if (this._paused) {
            this._renderer.finishDrawing();
            return;
        }

        for (const entity of this._entities) {
            this._renderer.draw(
                entity.model.objData.vertices,
                entity.model.objData.uvs,
                entity.model.objData.colors,
                entity.model.objData.faces,
                entity.model.texture,
                entity.getModelTransform(),
                entity.tint,
            );
        }

        this._renderer.finishDrawing();
    }

    private _calculateDeltaTime(currentTime: number): void {
        this._deltaTime = (currentTime - this._previousFrameTime) * SECONDS_IN_MILLISECOND;

        this._previousFrameTime = currentTime;
    }

    private async _loadModel(metadata: ModelMetadata): Promise<Model> {
        let mtlData: MtlData | null = null;
        if (metadata.mtlPath) {
            const response = await fetch(metadata.mtlPath);
            const mtl = await response.text();
            mtlData = parseMtl(mtl, false);
        }

        const imageLoadPromise = new Promise<ImageData | null>(async (resolve, reject) => {
            if (!metadata.texturePath) {
                resolve(null);
                return;
            }

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
                const objData = parseObj(obj, mtlData, UVFlip.Flipped);
                resolve(objData);
            } catch (error) {
                reject(error);
            }
        });

        const [image, objData] = await Promise.all([imageLoadPromise, objLoadPromise]);

        return {
            objData,
            texture: image,
        }
    }
}

class Entity {
    public position: Vector3 = [0, 0, 0];
    public scale: Vector3 = [1, 1, 1];
    public rotation: Vector3 = [0, 0, 0];

    public model: Model;

    public tint: Vector3 = [255, 255, 255];

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

class Camera {
    public position: Vector3;
    public yaw: number;
    public pitch: number;

    public target: Vector3;
    public distance: number;

    public fov: number;
    public zNear: number;
    public zFar: number;

    public constructor(
        position: Vector3 = [0, 0, 0],
        fov: number = degreesToRadians(60),
        target: Vector3 =  [0, 0, 0],
        distance: number =  -5,
        zNear: number = 0.1,
        zFar: number = 100,
        yaw: number = 0,
        pitch: number = 0,
    ) {
        this.position = position;
        this.fov = fov;
        this.target = target;
        this.distance = distance;
        this.zNear = zNear;
        this.zFar = zFar;
        this.yaw = yaw;
        this.pitch = pitch;
    }

    public update(delta: Vector2): void {
        this.yaw -= delta[0] * CAMERA_SENSITIVITY;
        this.pitch = Math.max(
            -MAX_CAMERA_PITCH,
            Math.min(MAX_CAMERA_PITCH, this.pitch + delta[1] * CAMERA_SENSITIVITY),
        );

        const cosPitch = Math.cos(this.pitch);
        this.position = [
            this.target[0] + this.distance * cosPitch * Math.sin(this.yaw),
            this.target[1] + this.distance * Math.sin(this.pitch),
            this.target[2] + this.distance * cosPitch * Math.cos(this.yaw),
        ];
    }
}
