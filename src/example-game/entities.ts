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
    subtractVector2s,
    subtractVector3s,
    Vector2,
    Vector3,
} from "../math";

import { Camera } from "./camera";
import { GUI } from "./gui";
import { Renderer, RenderMode } from "../renderer";

export interface EntityCallbacks {
    spawnEntity: (entity: Entity) => void;
    destroyEntity: (entity: Entity) => void;
    findEntityByName: <T extends Entity>(name: string) => T | null;
    findEntities: <T extends Entity>(cb: (entity: Entity) => entity is T) => T[];
    getCamera: () => Camera;
    getGui: () => GUI;
    getRenderer: () => Renderer;
    setPause: (paused: boolean) => void;
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

    public hasCollision: boolean = true;
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

export class Explosion extends Entity {
    public override rotation: Vector3 = [degreesToRadians(-90), 0, 0];
    public override scale: Vector3 = [0.01, 0.01, 0.01];

    public override modelPath = "assets/models/plane.obj";
    public override texturePath = "assets/models/explosion.png";

    protected override _onStart(): void {
        setTimeout(() => this._callbacks.destroyEntity(this), 200);
    }

    public override _onUpdate(deltaTime: number): void {
        this.scale[0] += 10 * deltaTime;
        this.scale[1] += 10 * deltaTime;
        this.scale[2] += 10 * deltaTime;
    }
}

export class Player extends Entity {
    public override name: string = "Player";

    public override scale: Vector3 = [0.5, 0.5, 0.5];

    public override modelPath = "assets/models/f22.obj";
    public override texturePath = "assets/models/f22.png";

    public hp: number = 3;
    public  isAlive: boolean = true;

    private _speed: number = 5;
    private _velocity: Vector2 = [0, 0];
    private _maxRoll: number = degreesToRadians(45);
    private _maxPitch: number = degreesToRadians(10);

    private _hiddenModel: ObjData | null = null;
    private _blinkInterval: number | null = null;
    private _stopBlinkingTimeout: number | null = null;

    private _touchStartScreenSpacePosition: Vector2 = [0, 0];
    private _throttledShootRocket = throttle(this._shootRocket.bind(this), 100);

    protected override _onStart(): void {
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        window.addEventListener("keypress", this._onKeyPress);
        window.addEventListener("touchstart", this._onTouchStart);
        window.addEventListener("touchmove", this._onTouchMove);
        window.addEventListener("touchend", this._onTouchEnd);

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
        this._callbacks.getGui().updateHp(this.hp);

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
        if (this._blinkInterval !== null) {
            // Invincible
            return;
        }

        if (
            (other instanceof Enemy
            || other instanceof Rocket && other.initiator !== RocketInititator.Player)
        ) {
            this.hp -= 1;

            const explosion = new Explosion(this._callbacks);
            explosion.position = this.position;
            this._callbacks.spawnEntity(explosion);

            this._blinkInterval = setInterval(() => {
                if (!this.model) {
                    this.model = this._hiddenModel;
                    this._hiddenModel = null;
                } else {
                    this._hiddenModel = this.model;
                    this.model = null;
                }
            }, 100);

            this._stopBlinkingTimeout = setTimeout(
                () => {
                    if (this._blinkInterval) {
                        clearInterval(this._blinkInterval);
                        this._blinkInterval = null;
                    }
                    if (!this.model) {
                        this.model = this._hiddenModel;
                        this._hiddenModel = null;
                    }

                    this._stopBlinkingTimeout = null;
                },
                1000,
            );
        }

        if (this.hp === 0) {
            this._callbacks.destroyEntity(this);
        }
    }

    protected override _onDestroy(): void {
        this._callbacks.getGui().updateHp(this.hp);

        this.isAlive = false;

        this._disableCondrols();
        this._velocity = [0, 0];

        const enemySpawners = this._callbacks.findEntities((entity: Entity): entity is EnemySpawner => entity instanceof EnemySpawner);

        for (const spawner of enemySpawners) {
            spawner.stopSpawning();
        }

        if (this._blinkInterval) {
            clearInterval(this._blinkInterval);
            this._blinkInterval = null;
        }

        if (this._stopBlinkingTimeout) {
            clearTimeout(this._stopBlinkingTimeout);
            this._stopBlinkingTimeout = null;
        }
    }

    private _disableCondrols(): void {
        removeEventListener("keypress", this._onKeyPress);
        removeEventListener("keydown", this._onKeyDown);
        removeEventListener("keyup", this._onKeyUp);
        removeEventListener("touchstart", this._onTouchStart);
        removeEventListener("touchmove", this._onTouchMove);
        removeEventListener("touchend", this._onTouchEnd);
    }

    private _shootRocket(): void {
        const rocket1 = new Rocket(RocketInititator.Player, this._callbacks);
        // -0.15 so the rocket spawns a little bit below
        rocket1.position = [this.position[0], this.position[1] - 0.15, this.position[2]];

        const rocket2 = new Rocket(RocketInititator.Player, this._callbacks);
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

    private _onTouchStart = (event: TouchEvent): void => {
        const touch = event.touches[0];

        this._touchStartScreenSpacePosition = [touch.clientX, touch.clientY];
    }

    private _onTouchMove = (event: TouchEvent): void => {
        const touch = event.touches[0];
        const current: Vector2 = [touch.clientX, touch.clientY];

        const delta = subtractVector2s(current, this._touchStartScreenSpacePosition);

        const DEAD = 10;
        this._velocity[0] = Math.abs(delta[0]) < DEAD ? 0 : Math.sign(delta[0]) * this._speed;
        this._velocity[1] = Math.abs(delta[1]) < DEAD ? 0 : -Math.sign(delta[1]) * this._speed;

        if (delta[0] !== 0 || delta[1] !== 0) {
            this._throttledShootRocket();
        }
    }

    private _onTouchEnd = (): void => {
        this._velocity = [0, 0];
    }
}

export class Enemy extends Entity {
    public override scale: Vector3 = [0.25, 0.25, 0.25];
    public override rotation: Vector3 = [0, degreesToRadians(-90), degreesToRadians(45)];

    public override modelPath: string = "assets/models/jet.obj";
    public override texturePath = "assets/models/jet.png";

    private _state: State | null = null;
    private _speed: number = 5;
    private _intervalId: number | null = null;
    private _killedByPlayer: boolean = false;

    public override _onStart(): void {
        this._state = this._callbacks.findEntities<State>((entity) => entity instanceof State)[0];

        this.tint = [Math.random() * 255, Math.random() * 255, Math.random() * 255];

        this._intervalId = setInterval(this._shootRocket, 1000);

        if (this.boxCollider) { // We rotated the entity, so the model is "mise en placed". Need to rotate the collider too
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
        if (
            other instanceof Rocket && other.initiator !== RocketInititator.Enemy
            || other instanceof Player
        ) {
            this._killedByPlayer = true;
            this._callbacks.destroyEntity(this);
        }
    }

    protected _onDestroy(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }

        if (this._killedByPlayer) {
            if (this._state) {
                this._state.score++;
            }

            const explosion = new Explosion(this._callbacks);
            explosion.position = this.position;
            this._callbacks.spawnEntity(explosion);
        }
    }

    private _shootRocket = (): void => {
        const rocket = new Rocket(RocketInititator.Enemy, this._callbacks);
        rocket.position = [this.position[0], this.position[1], this.position[2]];

        this._callbacks.spawnEntity(rocket);
    }
}

const enum RocketInititator {
    Player = "Player",
    Enemy = "Enemy",
}

export class Rocket extends Entity {
    public override rotation: Vector3 = [0, degreesToRadians(-90), 0];
    public override scale: Vector3 = [0.03, 0.03, 0.03];

    public override modelPath: string = "assets/models/rocket.obj";

    public initiator: RocketInititator;

    private _speed: number = 10;

    public constructor(initiator: RocketInititator, callbacks: EntityCallbacks) {
        super(callbacks);

        this.initiator = initiator;

        if (this.initiator === RocketInititator.Enemy) {
            this._speed *= -1;
            this.rotation = [0, degreesToRadians(90), 0];
        }
    }

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

        if (this.initiator === RocketInititator.Player) {
            this.rotation[2] += this._speed / 2 * deltaTime;
        } else {
            this.rotation[2] -= this._speed / 2 * deltaTime;
        }
    }

    protected _onCollision(other: Entity): void {
        if (
            other instanceof Enemy && this.initiator !== RocketInititator.Enemy
            || other instanceof Player && this.initiator !== RocketInititator.Player
        ) {
            this._callbacks.destroyEntity(this);
        }
    }
}

export class EnemySpawner extends Entity {
    private _intervalId: number | null = null;
    private _spawnSpeed: number = 2000;

    public setWarpMode(): void {
        this._spawnSpeed = 500;

        if (this._intervalId) {
            clearInterval(this._intervalId);
        }

        this._startSpawning();
    }

    public stopSpawning(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    protected override _onStart(): void {
        this._startSpawning();
    }

    protected override _onDestroy(): void {
        this.stopSpawning();
    }

    private _startSpawning(): void {
        const camera = this._callbacks.getCamera();
        let { right: rightPlane } = camera.makeFrustumPlanes();
        let previousAspectRatio = camera.aspectRatio;

        this._intervalId = setInterval(
            () => {
                if (previousAspectRatio !== camera.aspectRatio) {
                    previousAspectRatio = previousAspectRatio;
                    rightPlane = camera.makeFrustumPlanes().right;
                }

                const enemy = new Enemy(this._callbacks);
                enemy.position[1] = Math.random() * 5 * (Math.random() > 0.5 ? -1 : 1);
                enemy.position[0] = camera.position[0];
                const distanceToRight = calculateDistanceToPlane(
                    rightPlane,
                    subtractVector3s(enemy.position, camera.position),
                );
                enemy.position[0] += -distanceToRight / rightPlane.normal[0];

                this._callbacks.spawnEntity(enemy);
            },
            this._spawnSpeed,
        );
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

        // Destroy offscreen enemies
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

        // Destroy offscreen player rockets
        for (
            const playerRocket of this._callbacks.findEntities(
                (entity): entity is Rocket & { boxCollider: BoxCollider } => entity instanceof Rocket
                    && entity.boxCollider !== null
                    && entity.initiator === RocketInititator.Player
            )
        ) {
            let translatedMax = addVector3s(playerRocket.boxCollider.max, playerRocket.position);
            translatedMax = subtractVector3s(translatedMax, camera.position);

            const distance = calculateDistanceToPlane(frustumPlanes.right, translatedMax);
            if (distance < -playerRocket.boxCollider.delta[0]) {
                this._callbacks.destroyEntity(playerRocket);
            }
        }

        // Destro offscreen enemy rockets
        for (
            const enemyRocket of this._callbacks.findEntities(
                (entity): entity is Rocket & { boxCollider: BoxCollider } => entity instanceof Rocket
                    && entity.boxCollider !== null
                    && entity.initiator === RocketInititator.Enemy
            )
        ) {
            let translatedMin = addVector3s(enemyRocket.boxCollider.min, enemyRocket.position);
            translatedMin = subtractVector3s(translatedMin, camera.position);

            const distance = calculateDistanceToPlane(frustumPlanes.left, translatedMin);
            if (distance < -enemyRocket.boxCollider.delta[0]) {
                this._callbacks.destroyEntity(enemyRocket);
            }
        }

        const collidableEntities = this._callbacks.findEntities(
            (entity): entity is Entity & { boxCollider: BoxCollider } => entity.boxCollider !== null && entity.hasCollision
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

const MAX_STAR_COUNT = 50;
export class StarSpawner extends Entity {
    private _stars: Star[] = [];

    protected override _onStart(): void {
        for (let i = 0; i <= MAX_STAR_COUNT; i++) {
            const star = new Star(this._callbacks);

            star.position[0] = Math.random() * 100 * (Math.random() > 0.5 ? -1 : 1);
            star.position[1] = Math.random() * 100 * (Math.random() > 0.5 ? -1 : 1);
            star.position[2] = 100;

            const scaleFactor = Math.max(0.1, Math.random());
            star.scale[0] *= scaleFactor;
            star.scale[2] *= scaleFactor;

            this._stars.push(star);
        }

        this._stars.forEach(this._callbacks.spawnEntity);
    }

    protected _onUpdate(): void {
        const camera = this._callbacks.getCamera();

        const { left: leftPlane, right: rightPlane } = camera.makeFrustumPlanes();

        for (const star of this._stars) {
            const viewSpacePosition = subtractVector3s(star.position, camera.position);
            const distanceToLeftPlane = calculateDistanceToPlane(leftPlane, viewSpacePosition);

            if (distanceToLeftPlane < 0) {
                star.position[0] += calculateDistanceToPlane(
                    rightPlane,
                    viewSpacePosition,
                ) / -rightPlane.normal[0];
            }
        }
    }
}

export class Star extends Entity {
    public override position: Vector3 = [0, 0, 100];
    public override scale: Vector3 = [3, 1, 3];
    public override rotation: Vector3 = [degreesToRadians(-90), 0, 0];
    public override tint: Vector3 = [155, 0, 0];
    public override hasCollision: boolean = false;

    public override modelPath = "assets/models/plane.obj";
    public override texturePath = "assets/models/star.png";

    private _speed: number = 10;

    protected override _onUpdate(deltaTime: number): void {
        this.position[0] -= this._speed * deltaTime;
    }

    public setWarpMode(): void {
        this._speed = 40;
        this.tint = [100, 100, 100];
    };
}

export class Moon extends Entity {
    public override position: Vector3 = [-15, 15, 100];
    public override rotation: Vector3 = [0, 0, 0];
    public override scale: Vector3 = [0.2, 0.2, 0.2];

    public override modelPath = "assets/models/moon.obj";
    public override texturePath = "assets/models/moon.png";

    private _rotationSpeed: number = 0.05;

    protected override _onUpdate(deltaTime: number): void {
        this.rotation[1] += this._rotationSpeed * deltaTime;
    }

    public setWarpMode(): void {
        this._rotationSpeed = 0.1;
        this.tint = [100, 0, 0];
    }
}

export class State extends Entity {
    public score: number = 0;
    public warpMode: boolean = false;

    private _player: Player | null = null;

    protected override _onStart(): void {
        this._player = this._callbacks.findEntityByName("Player");
    }

    protected override _onUpdate(): void {
        if (this._player && !this._player.isAlive) {
            setTimeout(
                () => {
                    this._callbacks.setPause(true)
                    this._callbacks.getGui().showGameOver();
                },
                1000,
            );
        }

        if (!this.warpMode && this.score >= 5) {
            this.warpMode = true;

            const player = this._callbacks.findEntityByName("Player");
            if (player) {
                player.tint = [0, 0, 0];
            }

            const spawners = this._callbacks.findEntities<EnemySpawner>((entity) => entity instanceof EnemySpawner);
            for (const spawner of spawners) {
                spawner.setWarpMode();
            }

            const moons = this._callbacks.findEntities<Moon>((entity) => entity instanceof Moon);
            for (const moon of moons) {
                moon.setWarpMode();
            }

            const stars = this._callbacks.findEntities<Star>((entity) => entity instanceof Star);
            for (const star of stars) {
                star.setWarpMode();
            }

            const renderer = this._callbacks.getRenderer();
            renderer.setRenderMode(RenderMode.Wireframe);
            renderer.setClearColor([150, 0, 0]);
        }

        this._callbacks.getGui().updateScore(this.score, this.warpMode);
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

// @Todo: make a collideWithFrustumPlane, because the code is duplicated and it's stinky
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

function calculateDistanceToPlane(plane: Plane, viewSpacePosition: Vector3): number {
    const distance = dotProduct(plane.normal, viewSpacePosition) - dotProduct(plane.normal, plane.point);

    return distance;
}

function throttle<T extends []>(cb: (...args: T) => void, delay: number): (...args: T) => void {
    let isThrottling = false;

    return (...args: T): void => {
        if (!isThrottling) {
            isThrottling = true;
            setTimeout(() => { isThrottling = false }, delay);

            return cb(...args);
        }
    };
}
