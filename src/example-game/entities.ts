import { ObjData } from "../obj-parser";

import {
    degreesToRadians,
    makeRotationAroundXMatrix,
    makeRotationAroundYMatrix,
    makeRotationAroundZMatrix,
    makeScaleMatrix,
    makeTranslationMatrix,
    Matrix4,
    multiplyMatrix4s,
    multiplyVector2s,
    scaleVector2,
    Vector2,
    Vector3,
} from "../math";

type SpawnEntity = (entity: Entity) => void;

export abstract class Entity {
    public position: Vector3 = [0, 0, 0];
    public scale: Vector3 = [1, 1, 1];
    public rotation: Vector3 = [0, 0, 0];

    public model: ObjData | null = null;
    public texture: ImageData | null = null;
    public tint: Vector3 = [255, 255, 255];
    public modelPath: string | null = null;
    public texturePath: string | null = null;

    protected _spawnEntity: SpawnEntity;

    public constructor(spawnEntity: SpawnEntity) {
        this._spawnEntity = spawnEntity;
    }

    public abstract start(): void;

    public abstract update(deltaTime: number): void;

    public calculateModelTransform(): Matrix4 {
        const translation = makeTranslationMatrix(this.position);
        const scale = makeScaleMatrix(this.scale);
        const rotationX = makeRotationAroundXMatrix(this.rotation[0]);
        const rotationY = makeRotationAroundYMatrix(this.rotation[1]);
        const rotationZ = makeRotationAroundZMatrix(this.rotation[2]);

        const rotation = multiplyMatrix4s(rotationY, multiplyMatrix4s(rotationX, rotationZ));

        return multiplyMatrix4s(translation, multiplyMatrix4s(rotation, scale));
    }

    // It's stupid to to this here, instead of the moment of loading the model, but it reads better for the example I think
    protected _makeCollider(): void {
        const max: Vector2 = [-Infinity, -Infinity];
        const min: Vector2 = [Infinity, Infinity];
        for (const vertex of this.model!.vertices) {
            if (vertex[0] > max[0] && vertex[1] > max[1]) {
                max[0] = vertex[0];
                max[1] = vertex[1];
            } else if (vertex[0] < min[0] && vertex[1] < min[1]) {
                min[0] = vertex[0];
                min[1] = vertex[1];
            }
        }

        const scaledMax = multiplyVector2s(max, [this.scale[0], this.scale[1]]);
        const scaledMin = multiplyVector2s(min, [this.scale[0], this.scale[1]]);

        console.log(scaledMax);
        console.log(scaledMin);
    }
}

export class Player extends Entity {
    public override position: Vector3 = [0, 0, 0];
    public override scale: Vector3 = [0.5, 0.5, 0.5];

    public override modelPath = "assets/models/f22.obj";
    public override texturePath = "assets/models/f22.png";

    private _speed: number = 5;
    private _velocity: Vector2 = [0, 0];
    private _maxRoll: number = degreesToRadians(45);
    private _maxPitch: number = degreesToRadians(10);

    public start(): void {
        window.addEventListener("keydown", (event) => {
            if (event.code === "KeyW") {
                this._velocity[1] = this._speed;
            }

            if (event.code === "KeyS") {
                this._velocity[1] = -this._speed;
            }

            if (event.code === "KeyA") {
                this._velocity[0] = -this._speed;
            }

            if (event.code === "KeyD") {
                this._velocity[0] = this._speed;
            }
        });

        window.addEventListener("keyup", (event) => {
            if (event.code === "KeyW" || event.code === "KeyS") {
                this._velocity[1] = 0;
            }

            if (event.code === "KeyA" || event.code === "KeyD") {
                this._velocity[0] = 0;
            }
        });

        window.addEventListener("keypress", (event) => {
            if (event.code === "KeyK") {
                this._shootRocket();
            }
        });

        this._makeCollider();
    }

    public update(deltaTime: number): void {
        const displacement = scaleVector2(this._velocity, deltaTime);
        this.position[0] += displacement[0];
        this.position[1] += displacement[1];

        { // X Rotation
            const targetRotationX = Math.sign(this._velocity[1]) * this._maxRoll;
            const delta = targetRotationX - this.rotation[0];
            const step = this._speed * deltaTime;
            this.rotation[0] += Math.abs(delta) <= step ? delta : Math.sign(delta) * step;
        }

        { // Z rotation
            const targetRotationZ = -Math.sign(this._velocity[0]) * this._maxPitch;
            const delta = targetRotationZ - this.rotation[2];
            const step = this._speed * deltaTime;
            this.rotation[2] += Math.abs(delta) <= step ? delta : Math.sign(delta) * step;
        }
    }

    private _shootRocket(): void {
        const rocket = new Rocket(this._spawnEntity);

        // -0.15 so the rocket spawns a little bit below
        rocket.position = [this.position[0], this.position[1] - 0.15, this.position[2]];

        this._spawnEntity(rocket);
    }
}

export class Rocket extends Entity {
    public override rotation: Vector3 = [0, degreesToRadians(-90), 0];
    public override scale: Vector3 = [0.03, 0.03, 0.03];

    public override modelPath: string = "assets/models/rocket.obj";

    private _speed: number = 10;

    public start(): void {
        this._makeCollider();
    }

    public update(deltaTime: number): void {
        this.position[0] += this._speed * deltaTime;
    }
}
