import { ObjData } from "../obj-parser";

import {
    addVector3s,
    degreesToRadians,
    dotProduct,
    makeRotationAroundXMatrix,
    makeRotationAroundYMatrix,
    makeRotationAroundZMatrix,
    makeScaleMatrix,
    makeTranslationMatrix,
    Matrix4,
    multiplyMatrix4s,
    multiplyVector3s,
    scaleVector2,
    subtractVector3s,
    Vector2,
    Vector3,
} from "../math";

import { Camera } from "./camera";

export interface EntityCallbacks {
    spawnEntity: (entity: Entity) => void;
    destroyEntity: (entity: Entity) => void;
    findEntityByName: <T extends Entity>(name: string) => T | null;
    findEntities: <T extends Entity>(cb: (entity: Entity) => entity is T) => T[];
    getCamera: () => Camera;
}

interface BoxCollider {
    max: Vector3;
    min: Vector3;
    delta: Vector3;
}

export abstract class Entity {
    public name?: string;

    public position: Vector3 = [0, 0, 0];
    public scale: Vector3 = [1, 1, 1];
    public rotation: Vector3 = [0, 0, 0];

    public model: ObjData | null = null;
    public texture: ImageData | null = null;
    public tint: Vector3 = [255, 255, 255];
    public modelPath: string | null = null;
    public texturePath: string | null = null;

    protected _callbacks: EntityCallbacks;

    public constructor(callbacks: EntityCallbacks) {
        this._callbacks = callbacks;
    }

    public abstract start(): void;

    public abstract update(deltaTime: number): void;

    public abstract destroy(): void;

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
    protected _makeBoxCollider(): BoxCollider {
        const max: Vector3 = [-Infinity, -Infinity, -Infinity];
        const min: Vector3 = [Infinity, Infinity, Infinity];
        for (const vertex of this.model!.vertices) {
            if (
                vertex[0] > max[0]
                && vertex[1] > max[1]
                && vertex[2] > max[2]
            ) {
                max[0] = vertex[0];
                max[1] = vertex[1];
                max[2] = vertex[2];
            } else if (
                vertex[0] < min[0]
                && vertex[1] < min[1]
                && vertex[2] < min[2]
            ) {
                min[0] = vertex[0];
                min[1] = vertex[1];
                min[2] = vertex[2];
            }
        }

        return {
            max,
            min,
            delta: subtractVector3s(max, min),
        };
    }
}

export class Player extends Entity {
    public override name: string = "Player";

    public override scale: Vector3 = [0.5, 0.5, 0.5];

    public override modelPath = "assets/models/f22.obj";
    public override texturePath = "assets/models/f22.png";
    boxCollider: BoxCollider | null = null;

    public  isAlive: boolean = true;
    private _speed: number = 5;
    private _velocity: Vector2 = [0, 0];
    private _maxRoll: number = degreesToRadians(45);
    private _maxPitch: number = degreesToRadians(10);

    public start(): void {
        this.boxCollider = this._makeBoxCollider();

        window.addEventListener("keydown", this._onKeyDown);

        window.addEventListener("keyup", this._onKeyUp);

        window.addEventListener("keypress", this._onKeyPress);
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

    public destroy(): void {}

    private _onKeyPress = (event: KeyboardEvent): void => {
        if (event.code === "KeyK") {
            this._shootRocket();
        }
    }

    private _shootRocket(): void {
        const rocket = new Rocket(this._callbacks);

        // -0.15 so the rocket spawns a little bit below
        rocket.position = [this.position[0], this.position[1] - 0.15, this.position[2]];

        this._callbacks.spawnEntity(rocket);
    }

    private _onKeyUp = (event: KeyboardEvent): void => {
        if (event.code === "KeyW" || event.code === "KeyS") {
            this._velocity[1] = 0;
        }

        if (event.code === "KeyA" || event.code === "KeyD") {
            this._velocity[0] = 0;
        }
    }


    private _onKeyDown = (event: KeyboardEvent): void => {
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
    }

}

export class Enemy extends Entity {
    public override scale: Vector3 = [0.25, 0.25, 0.25];
    public override rotation: Vector3 = [0, degreesToRadians(-90), degreesToRadians(45)];

    public override modelPath: string = "assets/models/jet.obj";
    public override texturePath = "assets/models/jet.png";

    private _speed: number = 5;

    public override start(): void {}

    public override update(deltaTime: number): void {
        this.position[0] -= this._speed * deltaTime;
    }

    public destroy(): void {}
}

export class Rocket extends Entity {
    public override rotation: Vector3 = [0, degreesToRadians(-90), 0];
    public override scale: Vector3 = [0.03, 0.03, 0.03];

    public override modelPath: string = "assets/models/rocket.obj";

    private _speed: number = 10;

    public start(): void {}

    public update(deltaTime: number): void {
        this.position[0] += this._speed * deltaTime;
    }

    public destroy(): void {}
}

export class EnemySpawner extends Entity {
    private _intervalId: number | null = null;

    public override start(): void {
        this._intervalId = setInterval(
            () => {
                const enemy = new Enemy(this._callbacks);
                enemy.position[0] = 10;
                enemy.position[1] = Math.random() * 5;

                this._callbacks.spawnEntity(enemy);
            },
            2000
        );
    }

    public override update(): void {}

    public override destroy(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
    }
}

export class CollisionManager extends Entity {
    private _player: Player | null = null;

    public start(): void {
        this._player = this._callbacks.findEntityByName<Player>("Player");
    }

    public update(): void {
        if (this._player && this._player.boxCollider && this._player.isAlive) {
            this._collideWithPlaygroundBorders(this._player, this._player.boxCollider);
        }

        for (const enemy of this._callbacks.findEntities((entity) => entity instanceof Enemy)) {
            if (enemy.position[0] < -10) { // @Todo: hardcoded!
                this._callbacks.destroyEntity(enemy);
            }
        }

        for (const rocket of this._callbacks.findEntities((entity) => entity instanceof Rocket)) {
            if (rocket.position[0] > 10) { // @Todo: hardcoded!
                this._callbacks.destroyEntity(rocket);
            }
        }
    }

    public destroy(): void {
        this._player = null;
    }

    private _collideWithPlaygroundBorders(entity: Entity, boxCollider: BoxCollider): void {
        const camera = this._callbacks.getCamera();
        const frustumPlanes = camera.makeFrustumFlanes();

        const scaledBoxCollider: BoxCollider = {
            max: multiplyVector3s(boxCollider.max, entity.scale),
            min: multiplyVector3s(boxCollider.min, entity.scale),
            delta: multiplyVector3s(boxCollider.delta, entity.scale),
        };

        // Offset to world position;
        scaledBoxCollider.max = addVector3s(scaledBoxCollider.max, entity.position);
        scaledBoxCollider.min = addVector3s(scaledBoxCollider.min, entity.position);

        // Offset to camera position;
        scaledBoxCollider.max = subtractVector3s(scaledBoxCollider.max, camera.position);
        scaledBoxCollider.min = subtractVector3s(scaledBoxCollider.min, camera.position);

        const distanceToTop = dotProduct(frustumPlanes.top.normal, scaledBoxCollider.max)
            - dotProduct(frustumPlanes.top.normal, frustumPlanes.top.point);
        if (distanceToTop <= 0) {
            entity.position[1] = scaledBoxCollider.max[1] + distanceToTop - scaledBoxCollider.delta[1];
            return;
        }

        const distanceToBottom  = dotProduct(frustumPlanes.bottom.normal, scaledBoxCollider.min)
            - dotProduct(frustumPlanes.bottom.normal, frustumPlanes.bottom.point);
        if (distanceToBottom <= 0) {
            entity.position[1] = scaledBoxCollider.min[1] - distanceToBottom + scaledBoxCollider.delta[1];
            return;
        }

        const distanceToLeft = dotProduct(frustumPlanes.left.normal, [...scaledBoxCollider.min])
            - dotProduct(frustumPlanes.left.normal, frustumPlanes.left.point);
        if (distanceToLeft <= 0) {
            entity.position[0] = scaledBoxCollider.min[0] - distanceToLeft + scaledBoxCollider.delta[0];
            return;
        }

        const distanceToRight = dotProduct(frustumPlanes.right.normal, [...scaledBoxCollider.max])
            - dotProduct(frustumPlanes.right.normal, frustumPlanes.right.point);
        if (distanceToRight <= 0) {
            entity.position[0] = scaledBoxCollider.max[0] + distanceToRight - scaledBoxCollider.delta[0] - 0.1;
            return;
        }
    }
}
