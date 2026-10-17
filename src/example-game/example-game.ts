import { Canvas } from '../canvas';
import { Renderer } from '../renderer';
import { parseObj, UVFlip } from "../obj-parser";

import { Camera } from "./camera";
import { Entity, Player } from "./entities";
import { Vector3 } from '../math';

const SECONDS_IN_MILLISECOND = 1 / 1000;
const BACKGROUND_COLOR = [0, 0, 255] as Vector3;

export class ExampleGame {
    private readonly _canvas: Canvas;
    private readonly _renderer: Renderer;

    private _deltaTime: number = 0;
    private _previousFrameTime: number = 0;

    private _camera: Camera;
    private _entities: Entity[] = [];

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
        this._camera.update(
            this._entities.find((entity) => entity instanceof Player)?.position ?? [0, 0, 0]
        );
    }

    private _render(): void {
        debugger;
        this._renderer.startDrawing(this._camera);

        for (const entity of this._entities) {
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
            );
        }

        this._renderer.finishDrawing();
    }

    private _calculateDeltaTime(currentTime: number): void {
        this._deltaTime = (currentTime - this._previousFrameTime) * SECONDS_IN_MILLISECOND;

        this._previousFrameTime = currentTime;
    }

    private async _loadLevel(): Promise<void> {
        this._renderer.setClearColor(BACKGROUND_COLOR);

        this._renderer.setDirectionalLight({
            color: [255, 255, 255],
            direction: [0, 0, 1],
            normalizedDirection: [0, 0, 0] as Vector3, // Normalized inside the call
        });


        this._entities.push(new Player());

        const modelPathToEntities: Map<string, Entity[]> = new Map();
        const texturePathToEntities: Map<string, Entity[]> = new Map();
        for (const entity of this._entities) {
            if (entity.modelPath) {
                const entitiesWithThisModelPath = modelPathToEntities.get(entity.modelPath);
                if (entitiesWithThisModelPath) {
                    entitiesWithThisModelPath.push(entity);
                } else {
                    modelPathToEntities.set(entity.modelPath, [entity]);
                }
            }

            if (entity.texturePath) {
                const entitiesWithThisTexturePath = texturePathToEntities.get(entity.texturePath);
                if (entitiesWithThisTexturePath) {
                    entitiesWithThisTexturePath.push(entity);
                } else {
                    texturePathToEntities.set(entity.texturePath, [entity]);
                }
            }
        }

        const modelLoadingPromises: Promise<void>[] = [];
        for (const [path, entities] of modelPathToEntities.entries()) {
            modelLoadingPromises.push(new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(path);
                    const text = await response.text();

                    const objData = parseObj(text, null, UVFlip.Flipped);

                    for (const entity of entities) {
                        entity.model = objData;
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }));
        }

        const textureLoadingPromises: Promise<void>[] = [];
        for (const [path, entities] of texturePathToEntities.entries()) {
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

                    for (const entity of entities) {
                        entity.texture = imageData;
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }));
        }

        await Promise.all([...modelLoadingPromises, ...textureLoadingPromises]);
    }
}
