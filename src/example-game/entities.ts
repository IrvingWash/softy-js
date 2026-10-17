import { ObjData } from "../obj-parser";

import {
    addVector3s,
    degreesToRadians,
    dotProduct,
    FrustumPlanes,
    makeRotationAroundXMatrix,
    makeRotationAroundYMatrix,
    makeRotationAroundZMatrix,
    makeScaleMatrix,
    makeTranslationMatrix,
    Matrix4,
    multiplyMatrix4AndVector3,
    multiplyMatrix4s,
    multiplyVector3s,
    scaleVector2,
    scaleVector3,
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

    public boxCollider: BoxCollider | null = null;

    protected _callbacks: EntityCallbacks;

    public constructor(callbacks: EntityCallbacks) {
        this._callbacks = callbacks;
    }

    public start(): void {
        if (this.model) {
            this.boxCollider = {
                max: [...this.model.max],
                min: [...this.model.min],
                delta: [...this.model.delta],
            };
        }

        this._onStart?.();
    };

    public update(deltaTime: number): void {
        this._onUpdate?.(deltaTime);
    };

    public destroy(): void {
        this._onDestroy?.();
    };

    public calculateModelTransform(): Matrix4 {
        const translation = makeTranslationMatrix(this.position);
        const scale = makeScaleMatrix(this.scale);
        const rotationX = makeRotationAroundXMatrix(this.rotation[0]);
        const rotationY = makeRotationAroundYMatrix(this.rotation[1]);
        const rotationZ = makeRotationAroundZMatrix(this.rotation[2]);

        const rotation = multiplyMatrix4s(rotationY, multiplyMatrix4s(rotationX, rotationZ));

        return multiplyMatrix4s(translation, multiplyMatrix4s(rotation, scale));
    }

    protected _onStart?(): void;
    protected _onUpdate?(deltaTime: number): void;
    protected _onDestroy?(): void;
}

export class Player extends Entity {
    public override name: string = "Player";

    public override scale: Vector3 = [0.5, 0.5, 0.5];

    public override modelPath = "assets/models/f22.obj";
    public override texturePath = "assets/models/f22.png";

    public  isAlive: boolean = true;

    private _speed: number = 2;
    private _velocity: Vector2 = [0, 0];
    private _maxRoll: number = degreesToRadians(45);
    private _maxPitch: number = degreesToRadians(10);

    protected override _onStart(): void {
        window.addEventListener("keydown", this._onKeyDown);

        window.addEventListener("keyup", this._onKeyUp);

        window.addEventListener("keypress", this._onKeyPress);

        if (this.boxCollider) {
            this.boxCollider = {
                min: multiplyVector3s(this.boxCollider.min, this.scale),
                max: multiplyVector3s(this.boxCollider.max, this.scale),
                delta: this.boxCollider.delta,
            };

            this.boxCollider.delta = subtractVector3s(this.boxCollider.max, this.boxCollider.min)
        }
    }

    protected override _onUpdate(deltaTime: number): void {
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

    private _onKeyPress = (event: KeyboardEvent): void => {
        if (event.code === "KeyK") {
            this._shootRocket();
        }
    }

    private _shootRocket(): void {
        const rocket1 = new Rocket(this._callbacks);
        // -0.15 so the rocket spawns a little bit below
        rocket1.position = [this.position[0], this.position[1] - 0.15, this.position[2]];

        const rocket2 = new Rocket(this._callbacks);
        rocket2.position = [this.position[0], this.position[1] - 0.3, this.position[2]];

        this._callbacks.spawnEntity(rocket1);
        this._callbacks.spawnEntity(rocket2);
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

    public override _onStart(): void {
        if (this.boxCollider) {
            const rotation = multiplyMatrix4s(
                makeRotationAroundYMatrix(this.rotation[1]),
                multiplyMatrix4s(
                    makeRotationAroundXMatrix(this.rotation[0]),
                    makeRotationAroundZMatrix(this.rotation[2]),
                ),
            );

            const a = multiplyVector3s(this.boxCollider.min, this.scale);
            const b = multiplyVector3s(this.boxCollider.max, this.scale);

            const min: Vector3 = [Infinity, Infinity, Infinity];
            const max: Vector3 = [-Infinity, -Infinity, -Infinity];

            for (const x of [a[0], b[0]])
            for (const y of [a[1], b[1]])
            for (const z of [a[2], b[2]]) {
                const p = multiplyMatrix4AndVector3(rotation, [x, y, z]);
                for (let i = 0; i < 3; i++) {
                    min[i] = Math.min(min[i], p[i]);
                    max[i] = Math.max(max[i], p[i]);
                }
            }

            this.boxCollider = { min, max, delta: subtractVector3s(max, min) };
        }
    }

    protected override _onUpdate(deltaTime: number): void {
        this.position[0] -= this._speed * deltaTime;
    }

    protected override _onDestroy(): void {}
}

export class Rocket extends Entity {
    public override rotation: Vector3 = [0, degreesToRadians(-90), 0];
    public override scale: Vector3 = [0.03, 0.03, 0.03];

    public override modelPath: string = "assets/models/rocket.obj";

    private _speed: number = 10;

    protected override _onStart(): void {
        if (this.boxCollider) {
            this.boxCollider = {
                min: multiplyVector3s(this.boxCollider.min, scaleVector3(this.scale, 2)),
                max: multiplyVector3s(this.boxCollider.max, scaleVector3(this.scale, 2)),
                delta: this.boxCollider.delta,
            };

            this.boxCollider.delta = subtractVector3s(this.boxCollider.max, this.boxCollider.min)
        }
    }

    protected override _onUpdate(deltaTime: number): void {
        this.position[0] += this._speed * deltaTime;
    }
}

export class EnemySpawner extends Entity {
    private _intervalId: number | null = null;

    protected override _onStart(): void {
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

    protected override _onDestroy(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
    }
}

export class CollisionManager extends Entity {
    private _player: Player | null = null;

    protected override _onStart(): void {
        this._player = this._callbacks.findEntityByName<Player>("Player");
    }

    protected override _onUpdate(): void {
        const camera = this._callbacks.getCamera();
        const frustumPlanes = camera.makeFrustumFlanes();

        if (this._player && this._player.isAlive) {
            this._collideWithPlaygroundBorders(
                this._player,
                camera.position,
                frustumPlanes,
            );
        }

        const enemies = this._callbacks.findEntities((entity) => entity instanceof Enemy)
        const rockets = this._callbacks.findEntities((entity) => entity instanceof Rocket)

        if (rockets.length === 0) {
            for (const enemy of enemies) {
                if (enemy.position[0] < -10) { // @Todo: hardcoded!
                    this._callbacks.destroyEntity(enemy);
                }
            }
        } else if (enemies.length === 0) {
            for (const rocket of rockets) {
                if (rocket.position[0] > 10) { // @Todo: hardcoded!
                    this._callbacks.destroyEntity(rocket);
                }
            }
        } else {
            for (const rocket of rockets) {
                if (rocket.position[0] > 10) { // @Todo: hardcoded!
                    this._callbacks.destroyEntity(rocket);
                    continue;
                }

                if (!rocket.boxCollider) {
                    continue;
                }

                const rocketCollider: BoxCollider = {
                    min: addVector3s(rocket.boxCollider.min, rocket.position),
                    max: addVector3s(rocket.boxCollider.max, rocket.position),
                    delta: rocket.boxCollider.delta,
                };

                for (const enemy of enemies) {
                    if (enemy.position[0] < -10) { // @Todo: hardcoded!
                        this._callbacks.destroyEntity(enemy);
                        continue;
                    }

                    if (!enemy.boxCollider) {
                        continue;
                    }

                    const enemyCollider: BoxCollider = {
                        min: addVector3s(enemy.boxCollider.min, enemy.position),
                        max: addVector3s(enemy.boxCollider.max, enemy.position),
                        delta: enemy.boxCollider.delta,
                    };

                    if (checkAABBCollision(rocketCollider.min, rocketCollider.max, enemyCollider.min, enemyCollider.max)) {
                        this._callbacks.destroyEntity(enemy);
                        this._callbacks.destroyEntity(rocket);
                        break;
                    }
                }
            }
        }
    }

    protected override _onDestroy(): void {
        this._player = null;
    }

    private _collideWithPlaygroundBorders(
        entity: Entity,
        cameraPosition: Vector3,
        frustumPlanes: FrustumPlanes,
    ): void {
        if (!entity.boxCollider) {
            return;
        }

        // Offset to world position;
        const scaledBoxCollider = {
            max: addVector3s(entity.boxCollider.max, entity.position),
            min: addVector3s(entity.boxCollider.min, entity.position),
            delta: entity.boxCollider.delta,
        };

        // Offset to camera position;
        scaledBoxCollider.max = subtractVector3s(scaledBoxCollider.max, cameraPosition);
        scaledBoxCollider.min = subtractVector3s(scaledBoxCollider.min, cameraPosition);

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

function checkAABBCollision(aMin: Vector3, aMax: Vector3, bMin: Vector3, bMax: Vector3): boolean {
    return (
        aMin[0] < bMax[0]
        && aMax[0] > bMin[0]
        && aMax[1] > bMin[1]
        && aMin[1] < bMax[1]
    );
}
