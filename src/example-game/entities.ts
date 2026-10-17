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
    Plane,
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

    public onCollision(other: Entity): void {
        this._onCollision?.(other);
    }

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
    protected _onCollision?(other: Entity): void;
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

    protected override _onCollision(other: Entity): void {
        if (other instanceof Enemy) {
            this.isAlive = false;

            this._disableCondrols();
            this._velocity = [0, 0];
        }
    }

    protected override _onDestroy(): void {
        this._disableCondrols();
    }

    private _disableCondrols(): void {
        removeEventListener("keypress", this._onKeyPress);
        removeEventListener("keydown", this._onKeyDown);
        removeEventListener("keyup", this._onKeyUp);
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

    private _onKeyPress = (event: KeyboardEvent): void => {
        if (event.code === "KeyK") {
            this._shootRocket();
        }
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

            const scaledMin = multiplyVector3s(this.boxCollider.min, this.scale);
            const scaledMax = multiplyVector3s(this.boxCollider.max, this.scale);

            const min: Vector3 = [Infinity, Infinity, Infinity];
            const max: Vector3 = [-Infinity, -Infinity, -Infinity];

            for (const x of [scaledMin[0], scaledMax[0]])
            for (const y of [scaledMin[1], scaledMax[1]])
            for (const z of [scaledMin[2], scaledMax[2]]) {
                const rotated = multiplyMatrix4AndVector3(rotation, [x, y, z]);
                for (let i = 0; i < 3; i++) {
                    min[i] = Math.min(min[i], rotated[i]);
                    max[i] = Math.max(max[i], rotated[i]);
                }
            }

            this.boxCollider = {
                min,
                max,
                delta: subtractVector3s(max, min)
            };
        }
    }

    protected override _onUpdate(deltaTime: number): void {
        this.position[0] -= this._speed * deltaTime;
    }

    protected _onCollision(other: Entity): void {
        if (other instanceof Rocket) {
            this._callbacks.destroyEntity(this);
        }
    }
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

    protected _onCollision(other: Entity): void {
        if (other instanceof Enemy) {
            this._callbacks.destroyEntity(this);
        }
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
        const frustumPlanes = camera.makeFrustumPlanes();

        if (this._player && this._player.isAlive) {
            collideWithFrustumPlanes(
                this._player,
                camera.position,
                frustumPlanes,
            );
        }

        for (
            const enemy of this._callbacks.findEntities(
            (entity): entity is Enemy & { boxCollider: BoxCollider } => entity instanceof Enemy && entity.boxCollider !== null)
        ) {
            let translatedMin = addVector3s(enemy.boxCollider.min, enemy.position);
            translatedMin = subtractVector3s(translatedMin, camera.position);

            const distance = calculateDistanceToPlane(frustumPlanes.left, translatedMin);
            if (distance < -enemy.boxCollider.delta[0]) {
                this._callbacks.destroyEntity(enemy);
            }
        }

        for (
            const rocket of this._callbacks.findEntities(
            (entity): entity is Rocket & { boxCollider: BoxCollider } => entity instanceof Rocket && entity.boxCollider !== null)
        ) {
            let translatedMin = addVector3s(rocket.boxCollider.min, rocket.position);
            translatedMin = subtractVector3s(translatedMin, camera.position);

            const distance = calculateDistanceToPlane(frustumPlanes.left, translatedMin);
            if (distance < -rocket.boxCollider.delta[0]) {
                this._callbacks.destroyEntity(rocket);
            }
        }

        const collidableEntities = this._callbacks.findEntities(
            (entity): entity is Entity & { boxCollider: BoxCollider } => entity.boxCollider !== null
        );

        for (let i = 0; i < collidableEntities.length; i ++) {
            const a = collidableEntities[i]!;
            const aCollider: BoxCollider = {
                min: addVector3s(a.boxCollider.min, a.position),
                max: addVector3s(a.boxCollider.max, a.position),
                delta: a.boxCollider.delta,
            };

            for (let j = i + 1; j < collidableEntities.length; j++) {
                const b = collidableEntities[j]!;
                const bCollider: BoxCollider = {
                    min: addVector3s(b.boxCollider.min, b.position),
                    max: addVector3s(b.boxCollider.max, b.position),
                    delta: b.boxCollider.delta,
                };

                if (checkAABBCollision(aCollider, bCollider)) {
                    a.onCollision(b);
                    b.onCollision(a);
                }
            }
        }
    }

    protected override _onDestroy(): void {
        this._player = null;
    }
}

function checkAABBCollision(aCollider: BoxCollider, bCollider: BoxCollider): boolean {
    return (
        aCollider.min[0] < bCollider.max[0]
        && aCollider.max[0] > bCollider.min[0]
        && aCollider.max[1] > bCollider.min[1]
        && aCollider.min[1] < bCollider.max[1]
    );
}

function collideWithFrustumPlanes(
    entity: Entity,
    cameraPosition: Vector3,
    frustumPlanes: FrustumPlanes,
): void {
    if (!entity.boxCollider) {
        return;
    }

    // Offset to world position;
    const transformedBoxCollider = {
        max: addVector3s(entity.boxCollider.max, entity.position),
        min: addVector3s(entity.boxCollider.min, entity.position),
        delta: entity.boxCollider.delta,
    };

    // Offset to camera position;
    transformedBoxCollider.max = subtractVector3s(transformedBoxCollider.max, cameraPosition);
    transformedBoxCollider.min = subtractVector3s(transformedBoxCollider.min, cameraPosition);

    const distanceToTop = calculateDistanceToPlane(frustumPlanes.top, transformedBoxCollider.max);
    if (distanceToTop <= 0) {
        entity.position[1] = transformedBoxCollider.max[1] + distanceToTop - transformedBoxCollider.delta[1];
    }

    const distanceToBottom = calculateDistanceToPlane(frustumPlanes.bottom, transformedBoxCollider.min);
    if (distanceToBottom <= 0) {
        entity.position[1] = transformedBoxCollider.min[1] - distanceToBottom + transformedBoxCollider.delta[1];
    }

    const distanceToLeft = calculateDistanceToPlane(frustumPlanes.left, transformedBoxCollider.min);
    if (distanceToLeft <= 0) {
        entity.position[0] = transformedBoxCollider.min[0] - distanceToLeft + transformedBoxCollider.delta[0];
    }

    const distanceToRight = calculateDistanceToPlane(frustumPlanes.right, transformedBoxCollider.max);
    if (distanceToRight <= 0) {
        entity.position[0] = transformedBoxCollider.max[0] + distanceToRight - transformedBoxCollider.delta[0];
    }
}

function calculateDistanceToPlane(plane: Plane, position: Vector3): number {
    const distance = dotProduct(plane.normal, position) - dotProduct(plane.normal, plane.point);

    return distance;
}
