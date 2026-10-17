import { Canvas } from '../canvas';
import { Renderer } from '../renderer';
import { ObjData, parseObj, UVFlip } from "../obj-parser";

import { Camera } from "./camera";
import { Entity, Player } from "./entities";
import { Vector3 } from '../math';

const SECONDS_IN_MILLISECOND = 1 / 1000;

const LEVEL_1_METADATA = {
    backgroundColor: [0, 0, 255] as Vector3,
    sunColor: [255, 255, 255] as Vector3,
    sunDirection: [0, 0, 1] as Vector3,
    cameraPosition: [0, 0, -10] as Vector3,
    modelPaths: ["assets/models/f22.obj", "assets/models/rocket.obj"],
    texturePaths: ["assets/models/f22.png"],
    entities: [Player],
} as const;

export class ExampleGame {
    private readonly _canvas: Canvas;
    private readonly _renderer: Renderer;

    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    private _modelsByPath: Map<string, ObjData> = new Map();
    private _texturesByPath: Map<string, ImageData> = new Map();
    private _camera: Camera;

    private _activeEntities: Entity[] = [];
    private _entitiesToStart: Entity[] = [];

    private constructor() {
        this._canvas = Canvas.createFullscreen();
        this._renderer = new Renderer(this._canvas);

        this._camera = new Camera();
    }

    public static async init(): Promise<ExampleGame> {
        const game = new ExampleGame();

        await game._loadLevel();

        return game;
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
        for (const entity of this._entitiesToStart) {
            this._startEntity(entity);
        }
        this._activeEntities.push(...this._entitiesToStart);
        this._entitiesToStart = [];

        this._camera.update([0, 0, 0]);

        for (const entity of this._activeEntities) {
            entity.update(this._deltaTime);
        }
    }

    private _render(): void {
        this._renderer.startDrawing(this._camera);

        for (const entity of this._activeEntities) {
            if (!entity.model) {
                continue;
            }

            this._renderer.draw(
                entity.model.vertices,
                entity.model.uvs,
                entity.model.colors,
                entity.model.faces,
                entity.texture,
                entity.calculateModelTransform(),
                entity.tint,
            );
        }

        this._renderer.finishDrawing();
    }

    private _calculateDeltaTime(currentTime: number): void {
        this._deltaTime = (currentTime - this._previousFrameTime) * SECONDS_IN_MILLISECOND;

        this._previousFrameTime = currentTime;
    }

    private _startEntity(entity: Entity): void {
        entity.model = this._modelsByPath.get(entity.modelPath ?? "") ?? null;
        entity.texture = this._texturesByPath.get(entity.texturePath ?? "") ?? null;

        entity.start();
    }

    private async _loadLevel(): Promise<void> {
        this._renderer.setClearColor(LEVEL_1_METADATA.backgroundColor);

        this._renderer.setDirectionalLight({
            color: LEVEL_1_METADATA.sunColor,
            direction: LEVEL_1_METADATA.sunDirection,
            normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
        });

        this._camera.position = LEVEL_1_METADATA.cameraPosition;

        for (const entityConstructor of LEVEL_1_METADATA.entities) {
            this._spawnEntity(new entityConstructor(this._spawnEntity));
        }

        const modelLoadingPromises: Promise<void>[] = [];
        for (const path of LEVEL_1_METADATA.modelPaths) {
            modelLoadingPromises.push(new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(path);
                    const text = await response.text();

                    const objData = parseObj(text, null, UVFlip.Flipped);

                    this._modelsByPath.set(path, objData);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }));
        }

        const textureLoadingPromises: Promise<void>[] = [];
        for (const path of LEVEL_1_METADATA.texturePaths) {
            textureLoadingPromises.push(new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(path);
                    const blob = await response.blob();
                    const bitmap = await createImageBitmap(blob);

                    const offscreenCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                    const ctx = offscreenCanvas.getContext("2d");
                    if (!ctx) {
                        return reject("Failde to get offscreen canvas context");
                    }

                    ctx.drawImage(bitmap, 0, 0);

                    const imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

                    this._texturesByPath.set(path, imageData);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }));
        }

        await Promise.all([...modelLoadingPromises, ...textureLoadingPromises]);
    }

    private _spawnEntity = (entity: Entity): void => {
        this._entitiesToStart.push(entity);
    }
}
