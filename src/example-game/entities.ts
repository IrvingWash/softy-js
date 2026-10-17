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
    scaleVector2,
    Vector2,
    Vector3,
} from "../math";

export abstract class Entity {
    public position: Vector3 = [0, 0, 0];
    public scale: Vector3 = [1, 1, 1];
    public rotation: Vector3 = [0, 0, 0];

    public model: ObjData | null = null;
    public texture: ImageData | null = null;
    public modelPath: string | null = null;
    public texturePath: string | null = null;

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
}

export class Player extends Entity {
    public override position: Vector3 = [0, 0, 0];
    public override scale: Vector3 = [0.5, 0.5, 0.5];

    public override modelPath = "assets/models/f22.obj";
    public override texturePath = "assets/models/f22.png";

    private _speed: number = 10;
    private _velocity: Vector2 = [0, 0];

    public start(): void {
        window.addEventListener("keydown", (event) => {
            if (event.code === "KeyW") {
                this._velocity[1] = this._speed;
                this.rotation[0] = degreesToRadians(45);
            }

            if (event.code === "KeyS") {
                this._velocity[1] = -this._speed;
                this.rotation[0] = degreesToRadians(-45);
            }

            if (event.code === "KeyA") {
                this._velocity[0] = -this._speed;
                this.rotation[2] = degreesToRadians(25);
            }

            if (event.code === "KeyD") {
                this._velocity[0] = this._speed;
                this.rotation[2] = degreesToRadians(-15);
            }
        });

        window.addEventListener("keyup", (event) => {
            if (event.code === "KeyW" || event.code === "KeyS") {
                this._velocity[1] = 0;
                this.rotation[0] = 0;
            }

            if (event.code === "KeyA" || event.code === "KeyD") {
                this._velocity[0] = 0;
                this.rotation[2] = 0;
            }
        });
    }

    public update(deltaTime: number): void {
        const displacement = scaleVector2(this._velocity, deltaTime);

        this.position[0] += displacement[0];
        this.position[1] += displacement[1];
    }
}

